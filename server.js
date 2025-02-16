const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');  // Import express-session
const Notifications = require('./models/notification.js');
//socket



// Import models
const User = require('./models/user.js');
const Transporter = require('./models/transporter.js');
const Shipment = require('./models/shipment.js');


// Middleware to parse incoming requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files and view engine setup
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set up session

app.use(session({
    secret: 'your_secret_key',   // Use a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }    // Set secure: true when using https
}));



// MongoDB connection
mongoose
    .connect('mongodb://localhost:27017/transportationDB_final', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));




// Middleware for authentication (ensuring session is available)
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {  // Check if user session exists
        return next();
    }
    res.redirect('/');  // Redirect to login page if not authenticated
}


// Routes
app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/user-dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const loggedInUser = req.session.user;
        // const userShipments = await Shipment.find({ userId: loggedInUser._id });
        res.render('user-page.ejs', {  loggedInUser });
    } catch (err) {
        console.error('Error fetching user data:', err);
        res.status(500).send('Error fetching user data');
    }
});



app.get('/transporter-dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const shipmentRequests = await Shipment.find();
        const loggedInUser = req.session.user;
        res.render('transporter-page.ejs', { shipmentRequests, loggedInUser });
    } catch (err) {
        console.error('Error fetching shipment requests:', err);
        res.status(500).send('Error fetching shipment data');
    }
});





// Handle signup (POST)
app.post('/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Check if the user already exists in the appropriate collection
        const existingUser =
            role === 'user'
                ? await User.findOne({ email })
                : await Transporter.findOne({ email });

        if (existingUser) {
            return res.status(400).send('User already exists. Please login.');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the user in the appropriate collection based on their role
        if (role === 'user') {
            const newUser = new User({ name, email, password: hashedPassword, role });
            await newUser.save();
        } else if (role === 'transporter') {
            const newTransporter = new Transporter({ name, email, password: hashedPassword, role });
            await newTransporter.save();
        } else {
            return res.status(400).send('Invalid role. Please select a valid role.');
        }

        res.redirect('/'); // Redirect to the login page after signup
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('An error occurred during signup. Please try again.');
    }
});






// Handle login (POST)
app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        let user;

        // Fetch the user from the corresponding collection
        if (role === 'user') {
            user = await User.findOne({ email });
        } else if (role === 'transporter') {
            user = await Transporter.findOne({ email });
        } else {
            return res.status(400).send('Invalid role. Please select a valid role.');
        }

        // Check if user exists
        if (!user) {
            return res.status(400).send('Invalid email or password.');
        }

        // Verify the password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).send('Invalid email or password.');
        }

        // Store the user info in the session
        req.session.user = {
            id: user._id,
            email: user.email,
            role: role
        };

        // Redirect to the appropriate dashboard based on the role
        if (role === 'user') {
            return res.redirect('/user-dashboard');
        } else if (role === 'transporter') {
            return res.redirect('/transporter-dashboard');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('An error occurred during login. Please try again later.');
    }
});






//shipment
app.post('/shipment', ensureAuthenticated, async (req, res) => {
    console.log('Route hit: /shipment');
    console.log('Request body:', req.body);

    const { location, dateTime, goodsDescription, vehicleType } = req.body;

    try {
        // Parse the dateTime into a Date object
        const parsedDate = new Date(dateTime);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).send('Invalid date format');
        }

        // Create the Shipment instance
        const shipment = new Shipment({
            location,
            dateTime: parsedDate, // Use parsedDate here
            goodsDescription,
            vehicleType,
        });

        await shipment.save();
        console.log('Shipment created successfully:', shipment);
        res.redirect('/user-dashboard');
    } catch (err) {
        console.error('Error creating shipment:', err.message, err.stack);
        res.status(500).send('Error creating shipment');
    }
});


//  Approve Shipment
app.post('/approve-shipment', async (req, res) => {
    try {
        const { id } = req.body;
        await Shipment.findByIdAndUpdate(id, { status: 'Approved' });
        await Notification.create({ message: `Shipment ${id} approved` });
        res.json({ success: true, message: 'Shipment approved successfully!' });
    } catch (error) {
        res.json({ success: false, message: 'Error approving shipment' });
    }
});

// Reject Shipment
app.post('/reject-shipment', async (req, res) => {
    try {
        const { id } = req.body;
        await Shipment.findByIdAndUpdate(id, { status: 'Rejected' });
        await Notification.create({ message: `Shipment ${id} rejected` });
        res.json({ success: true, message: 'Shipment rejected successfully!' });
    } catch (error) {
        res.json({ success: false, message: 'Error rejecting shipment' });
    }
});



app.post('/update-profile', ensureAuthenticated, async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.session.user.id;
        await Transporter.findByIdAndUpdate(userId, { name, email });
        req.session.user.name = name; // Update session data
        req.session.user.email = email;
        res.redirect('/transporter-dashboard');
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).send('Error updating profile');
    }
});


app.post('/update-profile_2', ensureAuthenticated, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userId = req.session.user._id;  // Assuming the user ID is stored in the session

        // If password is provided, hash it before saving. Otherwise, leave it unchanged.
        let updateData = { name, email };
        if (password) {
            // You would hash the password here before saving it (e.g., using bcrypt)
            updateData.password = password;  // Make sure to hash password before saving
        }

        // Find the user by ID and update their profile
        await User.findByIdAndUpdate(userId, updateData, { new: true });

        // After updating, save the updated user data in the session
        req.session.user.name = name;
        req.session.user.email = email;

        // Redirect to the dashboard with updated information
        res.redirect('/user-dashboard');
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).send('Error updating profile');
    }
});








app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/'); // Redirect to the login page after logout
    }
    );
});


const crypto = require('crypto');

app.get('/notification/:id', ensureAuthenticated, async (req, res) => {
    try {
        const shipmentId = req.params.id;
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            return res.status(404).send("Shipment not found");
        }

        // Convert shipment ID to a numeric sum based on ASCII values
        const numericRepresentation = shipmentId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

        res.render('notification', { shipment, numericRepresentation });
    } catch (error) {
        console.error('Error fetching shipment:', error);
        res.status(500).send('Error fetching shipment');
    }
});




// task is to shipmentId into some number like status--> how to create this particular 

app.post('/submit-notification', ensureAuthenticated, async (req, res) => {
    try {
        const { shipmentId, message } = req.body;
        const shipment = await Shipment.findById(shipmentId);

        if (!shipment) {
            return res.status(404).json({ success: false, message: "Shipment not found" });
        }

        const notification = await Notification.create({ shipmentId, message, status: 'pending' });
        res.redirect('/transporter-dashboard');
    } catch (error) {
        console.error('Error submitting notification:', error);
        res.status(500).json({ success: false, message: 'Error submitting notification' });
    }
});

app.get('/shipment_status', ensureAuthenticated, async (req, res) => {
    try {
        const notifications = await Notification.find();
        res.render('shipment_status', { notifications });
    } catch (error) {
        console.error('Error fetching shipment status:', error);
        res.status(500).json({ success: false, message: 'Error fetching shipment status' });
    }
});



//user notification
app.get('/user-notification', ensureAuthenticated, async (req, res) => {
    try {
        const notifications = await Notification.find();
        res.render('user-notification', { notifications });
    } catch (error) {
        console.error('Error fetching shipment status:', error);
        res.status(500).json({ success: false, message: 'Error fetching shipment status' });
    }
});



app.get("/user-notifications", async (req, res) => {
    try {
        const notifications = await Notifications.find().sort({ createdAt: -1 }); // Fetch and sort by latest
        res.render("user_notification", { notifications }); // Pass data to EJS page
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).send("Internal Server Error");
    }
});





// Server setup
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
