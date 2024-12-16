const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');  // Import express-session

// Import models
const User = require('./models/user.js');
const Transporter = require('./models/transporter.js');
const Shipment = require('./models/shipment.js');
const Notification = require('./models/notification');


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
    const { location, dateTime, goodsDescription, vehicleType } = req.body;

    try {
        const shipment = new Shipment({
            location,
            dateTime: new Date(dateTime),
            goodsDescription,
            vehicleType,
            // userId: req.user._id, // Assuming user ID is needed for the shipment
        });

        await shipment.save();
        res.redirect('/transporter-dashboard');
    } catch (err) {
        console.error('Error creating shipment:', err);
        res.status(500).send('Error creating shipment');
    }
});






// Approve Shipment
app.post('/approve-shipment', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.body;
        
        // Update shipment status to 'approved'
        const shipment = await Shipment.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
        
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Shipment not found' });
        }

        // Find the user associated with the shipment
        const user = await User.findById(shipment.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Create notification for the user
        const notificationMessage = `Your shipment request for ${shipment.location} has been approved.`;
        const newNotification = new Notification({
            message: notificationMessage,
        });
        await newNotification.save();

        // Add the notification to the user's list of notifications
        user.notifications.push(newNotification);
        await user.save();

        res.json({ success: true, message: 'Shipment approved and user notified successfully', notificationMessage });
    } catch (err) {
        console.error('Error approving shipment:', err);
        res.status(500).json({ success: false, message: 'Error approving shipment' });
    }
});

// Reject Shipment
app.post('/reject-shipment', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.body;
        
        // Update shipment status to 'rejected'
        const shipment = await Shipment.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
        
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Shipment not found' });
        }

        // Find the user associated with the shipment
        const user = await User.findById(shipment.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Create notification for the user
        const notificationMessage = `Your shipment request for ${shipment.location} has been rejected.`;
        const newNotification = new Notification({
            message: notificationMessage,
        });
        await newNotification.save();

        // Add the notification to the user's list of notifications
        user.notifications.push(newNotification);
        await user.save();

        res.json({ success: true, message: 'Shipment rejected and user notified successfully', notificationMessage });
    } catch (err) {
        console.error('Error rejecting shipment:', err);
        res.status(500).json({ success: false, message: 'Error rejecting shipment' });
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


// Route to get notifications for the logged-in user
app.get('/user/notifications', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('notifications');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, notifications: user.notifications });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
});



// Server setup
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
