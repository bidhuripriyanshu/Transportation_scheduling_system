const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path = require('path');

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

// MongoDB connection
mongoose
    .connect('mongodb://localhost:27017/transportationDB_final', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// Middleware for authentication (placeholder, implement actual logic)
function ensureAuthenticated(req, res, next) {
    if (req.user) { // Simulate user authentication; replace with Passport.js or session
        return next();
    }
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/user-dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const userShipments = await Shipment.find({ userId: loggedInUser._id });
        res.render('user-dashboard.ejs', { userShipments, loggedInUser });
    } catch (err) {
        console.error('Error fetching user data:', err);
        res.status(500).send('Error fetching user data');
    }
});

app.get('/transporter-dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const shipmentRequests = await Shipment.find();
        const loggedInUser = req.user;
        res.render('transporter-page.ejs', { shipmentRequests, loggedInUser });
    } catch (err) {
        console.error('Error fetching shipment requests:', err);
        res.status(500).send('Error fetching shipment data');
    }
});

app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        let user;

        if (role === 'user') {
            user = await User.findOne({ email });
        } else if (role === 'transporter') {
            user = await Transporter.findOne({ email });
        } else {
            return res.status(400).send('Invalid role.');
        }

        if (!user) {
            return res.status(400).send('Invalid email or password.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid email or password.');
        }

        if (user.role !== role) {
            return res.status(403).send('Role mismatch. Access denied.');
        }

        // Simulating login by setting req.user (replace with proper session or token)
        req.user = user;

        // Redirect to the appropriate dashboard
        if (role === 'user') {
            res.redirect('/user-dashboard');
        } else {
            res.redirect('/transporter-dashboard');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('An error occurred during login. Please try again.');
    }
});



app.post('/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User already exists. Please login.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ name, email, password: hashedPassword, role });
        await newUser.save();

        res.redirect('/login');
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('An error occurred during signup. Please try again.');
    }
});



app.post('/shipment', ensureAuthenticated, async (req, res) => {
    const { location, dateTime, goodsDescription, vehicleType } = req.body;

    try {
        const shipment = new Shipment({
            location,
            dateTime: new Date(dateTime),
            goodsDescription,
            vehicleType,
            userId: req.user._id, // Assuming user ID is needed for the shipment
        });

        await shipment.save();
        res.redirect('/transporter-dashboard');
    } catch (err) {
        console.error('Error creating shipment:', err);
        res.status(500).send('Error creating shipment');
    }
});



// Server setup
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
