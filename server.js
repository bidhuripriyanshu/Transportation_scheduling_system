const express = require('express');
const app = express();

// Trust proxy - required for Render deployment
app.set('trust proxy', 1);

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');  // Import express-session
const Notification = require('./models/notification.js');
const Process = require('./models/process.js');
//socket
const axios = require('axios');

// Load environment variables from .env file
require('dotenv').config();

const cloudinary = require("./utils/cloudinary.js");
const upload = require("./middleware/multer.middleware.js");

// Add MongoStore for session storage
const MongoStore = require('connect-mongo');

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
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/transport-scheduler';
let mongoConnected = false;

// Connection retry logic with improved error handling
const connectWithRetry = async () => {
    try {
        console.log('Attempting MongoDB connection...');
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 60000,
            socketTimeoutMS: 45000, 
            connectTimeoutMS: 60000,
            maxPoolSize: 10,
            family: 4, // Force IPv4
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('==> MongoDB connection successful');
        mongoConnected = true;
        
        // Set up session only after MongoDB is connected
        setupSession();
        
        // Set up routes once MongoDB is connected
        setupRoutes();
        
        // Start server only after MongoDB is connected
        startServer();
    } catch (err) {
        console.error('MongoDB connection unsuccessful:', err);
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

// Set up session with MongoStore
const setupSession = () => {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your_secret_key',
        resave: false,
        saveUninitialized: true, // Changed to true to ensure session is always created
        store: MongoStore.create({
            mongoUrl: MONGO_URI,
            ttl: 14 * 24 * 60 * 60, // = 14 days
            autoRemove: 'native',
            touchAfter: 24 * 3600 // time period in seconds
        }),
        cookie: { 
            // Only use secure cookies in production with proper HTTPS
            secure: false, // Set to false to work with Render's proxy
            sameSite: 'lax', // Changed from 'none' to 'lax' for better compatibility
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
            httpOnly: true,
        },
        proxy: true // Trust the reverse proxy
    }));
    
    console.log('Session middleware configured with MongoStore');
    console.log(`Cookie settings: secure=${process.env.NODE_ENV === 'production' ? 'false' : 'false'}, sameSite=lax`);
}

// Start the server
const startServer = () => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log('==> Your service is live 🎉');
    });
}

// Middleware for authentication (ensuring session is available)
function ensureAuthenticated(req, res, next) {
    console.log('Session check:', req.session.id);
    
    if (!req.session) {
        console.log('No session object found');
        return res.redirect('/');
    }
    
    if (!req.session.user) {
        console.log('No user in session');
        return res.redirect('/');
    }
    
    if (!req.session.user.loggedIn) {
        console.log('User not marked as logged in');
        return res.redirect('/');
    }
    
    console.log(`Authenticated user: ${req.session.user.email} (${req.session.user.role})`);
    next();
}

// Initialize MongoDB connection
connectWithRetry();

// Define all routes in this function
const setupRoutes = () => {
    // Routes
    app.get('/', (req, res) => {
        // If user is already logged in, redirect to appropriate dashboard
        if (req.session && req.session.user && req.session.user.loggedIn) {
            console.log(`User already logged in: ${req.session.user.email}`);
            
            if (req.session.user.role === 'user') {
                return res.redirect('/user-dashboard');
            } else if (req.session.user.role === 'transporter') {
                return res.redirect('/transporter-dashboard');
            }
        }
        
        // Otherwise render login page
        console.log('No user logged in, showing index page');
        res.render('index.ejs');
    });

    app.get("/login",(req,res)=>{
        res.render('login.ejs')
    });

    app.get("/signup",(req,res)=>{
        res.render('signup.ejs')
    });

    app.get('/user-dashboard', ensureAuthenticated, async (req, res) => {
        try {
            // Ensure user session exists and contains necessary data
            if (!req.session || !req.session.user) {
                console.log('User session missing or incomplete');
                return res.redirect('/');
            }
            
            const loggedInUser = req.session.user;
            console.log('User dashboard accessed by:', loggedInUser.email);
            
            // Ensure loggedInUser has all required properties
            if (!loggedInUser.name) {
                // If name is missing, try to fetch it from the database
                try {
                    const userDoc = await User.findById(loggedInUser.id);
                    if (userDoc) {
                        // Update session with full user data
                        loggedInUser.name = userDoc.name || 'User';
                        req.session.user = loggedInUser;
                        await new Promise(resolve => req.session.save(resolve));
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                    // Continue with default name if fetch fails
                    loggedInUser.name = 'User';
                }
            }
            
            // Render the page with the user data
            res.render('user-page.ejs', { 
                loggedInUser: {
                    name: loggedInUser.name || 'User',
                    email: loggedInUser.email || 'user@example.com',
                    role: loggedInUser.role || 'user',
                    id: loggedInUser.id
                } 
            });
        } catch (err) {
            console.error('Error in user dashboard route:', err);
            res.status(500).send('Error accessing dashboard. Please try logging in again.');
        }
    });

    app.get('/transporter-dashboard', ensureAuthenticated, async (req, res) => {
        try {
            // Ensure user session exists and contains necessary data
            if (!req.session || !req.session.user) {
                console.log('Transporter session missing or incomplete');
                return res.redirect('/');
            }
            
            const loggedInUser = req.session.user;
            console.log('Transporter dashboard accessed by:', loggedInUser.email);

            // Ensure loggedInUser has all required properties
            if (!loggedInUser.name) {
                // If name is missing, try to fetch it from the database
                try {
                    const transporterDoc = await Transporter.findById(loggedInUser.id);
                    if (transporterDoc) {
                        // Update session with full user data
                        loggedInUser.name = transporterDoc.name || 'Transporter';
                        req.session.user = loggedInUser;
                        await new Promise(resolve => req.session.save(resolve));
                    }
                } catch (err) {
                    console.error('Error fetching transporter data:', err);
                    // Continue with default name if fetch fails
                    loggedInUser.name = 'Transporter';
                }
            }

            // Fetch shipment requests
            const shipmentRequests = await Shipment.find().catch(err => {
                console.error('Error fetching shipments:', err);
                return [];
            });
            
            // Render the page with the user data
            res.render('transporter-page.ejs', { 
                shipmentRequests,
                loggedInUser: {
                    name: loggedInUser.name || 'Transporter',
                    email: loggedInUser.email || 'transporter@example.com',
                    role: loggedInUser.role || 'transporter',
                    id: loggedInUser.id
                } 
            });
        } catch (err) {
            console.error('Error in transporter dashboard route:', err);
            res.status(500).send('Error accessing dashboard. Please try logging in again.');
        }
    });

    // Handle signup (POST) with improved error handling
    app.post('/signup', async (req, res) => {
        const { name, email, password, role } = req.body;

        try {
            // Check if MongoDB is connected
            if (!mongoConnected) {
                return res.status(503).send('Database connection not available. Please try again later.');
            }

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

    // Handle login (POST) with improved error handling
    app.post('/login', async (req, res) => {
        const { email, password, role } = req.body;
        
        console.log(`Login attempt: ${email} as ${role}`);

        try {
            // Check if MongoDB is connected
            if (!mongoConnected) {
                console.log('Database not connected during login attempt');
                return res.status(503).send('Database connection not available. Please try again later.');
            }

            let user;

            // Fetch the user from the corresponding collection
            if (role === 'user') {
                user = await User.findOne({ email });
            } else if (role === 'transporter') {
                user = await Transporter.findOne({ email });
            } else {
                console.log(`Invalid role provided: ${role}`);
                return res.status(400).send('Invalid role. Please select a valid role.');
            }

            // Check if user exists
            if (!user) {
                console.log(`User not found: ${email}`);
                return res.status(400).send('Invalid email or password.');
            }

            // Verify the password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                console.log(`Invalid password for: ${email}`);
                return res.status(400).send('Invalid email or password.');
            }

            // Store the user info in the session with more details
            req.session.user = {
                id: user._id,
                name: user.name || 'User',
                email: user.email,
                role: role,
                loggedIn: true,
                loginTime: new Date().toISOString()
            };

            console.log('User session created with data:', {
                id: user._id,
                name: user.name,
                email: user.email,
                role: role
            });

            // Save the session explicitly
            await new Promise((resolve, reject) => {
                req.session.save(err => {
                    if (err) {
                        console.error('Session save error:', err);
                        reject(err);
                    } else {
                        console.log(`Login successful: ${email} (${role}), session ID: ${req.session.id}`);
                        resolve();
                    }
                });
            });

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

    app.get('/shipment',(req, res) => {
        res.render('shipment.ejs');
    });

    //shipment
    app.post('/shipment', ensureAuthenticated, upload.single('photo'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Photo is required" });
        }
        try {
            console.log('Route hit: /shipment');
            console.log('Request body:', req.body);
            
            const { location, dateTime, goodsDescription, vehicleType } = req.body;

            // Parse dateTime into a Date object
            const parsedDate = new Date(dateTime);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid date format" });
            }

            // Ensure a file was uploaded
            if (!req.file) {
                return res.status(400).json({ success: false, message: "Photo is required" });
            }

            console.log('Uploaded file path:', req.file.path);

            // Upload image to Cloudinary
            let result;
            try {
                result = await cloudinary.uploader.upload(req.file.path);
                console.log('Cloudinary upload result:', result);
            } catch (error) {
                console.error('Cloudinary upload error:', error);
                return res.status(500).json({ success: false, message: "Error uploading photo to Cloudinary" });
            }

            // Create a Shipment instance
            const shipment = new Shipment({
                location,
                dateTime: parsedDate,
                goodsDescription,
                vehicleType,
                photo: result.secure_url,
            });

            await shipment.save();
            console.log('Shipment created successfully:', shipment);
            res.redirect('/Real_tracker');
        } catch (err) {
            console.error('Error creating shipment:', err.message, err.stack);
            res.status(500).json({ success: false, message: "Error creating shipment" });
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

    app.get('/notification/:id', ensureAuthenticated, async (req, res) => {
        try {
            const shipmentId = req.params.id;
            const shipment = await Shipment.findById(shipmentId);

            if (!shipment) {
                return res.status(404).send("Shipment not found");
            }
            console.log("Shipment Data:", shipment); // Debugging line
            // Convert shipment ID to a numeric sum based on ASCII values
            const numericRepresentation = shipmentId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

            res.render('notification', { shipment, numericRepresentation });
        } catch (error) {
            console.error('Error fetching shipment:', error);
            res.status(500).send('Error fetching shipment');
        }
    });

    app.post('/submit-notification', ensureAuthenticated, async (req, res) => {
        try {
            const { shipmentId, status, message } = req.body;
            
            // Clean the shipmentId, removing unwanted characters
            const cleanedShipmentId = shipmentId.split(' ')[0]; // Assumes the first part is the valid ID

            // Check if the cleaned shipmentId is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(cleanedShipmentId)) {
                return res.status(400).json({ success: false, message: 'Invalid shipment ID' });
            }

            const shipment = await Shipment.findById(cleanedShipmentId);
            console.log("Shipment Data:", cleanedShipmentId);

            if (!shipment) {
                return res.status(404).json({ success: false, message: "Shipment not found" });
            }

            // Convert shipment ID to a numeric sum based on ASCII values
            const numericRepresentation = cleanedShipmentId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

            await Notification.create({ shipmentId: cleanedShipmentId, status, message, Rideno: numericRepresentation });
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

    app.get('/user-notifications', ensureAuthenticated, async (req, res) => {
        try {
            const notifications = await Notification.find().sort({ createdAt: -1 }); // Fetch and sort by latest
            res.render("user_notification", { notifications }); // Pass data to EJS page
        } catch (error) {
            console.error("Error fetching notifications:", error);
            res.status(500).send("Internal Server Error");
        }
    });

    app.get("/Real_tracker", (req, res) => {
        res.render("Real_tracker.ejs");
    });

    app.post("/calculate-route", async (req, res) => {
        const { pickupLat, pickupLng, dropLat, dropLng } = req.body;

        // Validate input
        if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
            return res.status(400).json({ success: false, message: "Missing required coordinates" });
        }

        try {
            // Call OpenRouteService API
            const response = await axios.get(`https://api.openrouteservice.org/v2/directions/driving-car`, {
                params: {
                    api_key: process.env.ORS_API_KEY, // Ensure your API key is in .env
                    start: `${pickupLng},${pickupLat}`,
                    end: `${dropLng},${dropLat}`
                }
            });

            // Extract route data
            const routeData = response.data.features[0];
            if (!routeData) {
                return res.status(404).json({ success: false, message: "No route found" });
            }

            const distanceInKm = routeData.properties.summary.distance / 1000; // Convert meters to km
            const routeCoords = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Swap lat/lng for Leaflet

            // Calculate price (₹10 per km)
            const totalPrice = distanceInKm * 10;

            // Send response
            res.json({
                success: true,
                distance: distanceInKm.toFixed(2),
                price: totalPrice.toFixed(2),
                route: routeCoords
            });
        } catch (error) {
            console.error("Error fetching route:", error.message);
            res.status(500).json({ success: false, message: "Error fetching route", error: error.message });
        }
    });

    app.get('/process/:id', ensureAuthenticated, async (req, res) => {
        try {
            const id = req.params.id;
            console.log('Fetching notification with ID:', id);

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send('Invalid notification ID');
            }

            // Convert ID to a numeric hash (e.g., sum of char codes)
            let numericId = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

            res.render('process', { id: numericId });
        } catch (error) {
            console.error('Error fetching notification:', error);
            res.status(500).send('Error fetching notification');
        }
    });

    app.post('/process-submit', ensureAuthenticated, async (req, res) => {
        try {
            const { shipmentId, status, Rideno } = req.body;

            // Validate input
            if (!shipmentId || !status || !Rideno) {
                return res.status(400).send('Missing required fields');
            }

            // Update the notification status
            await Notification.findByIdAndUpdate(shipmentId, { status, Rideno });

            res.redirect('/transporter-dashboard');
        } catch (error) {
            console.error('Error processing notification:', error);
            res.status(500).send('Error processing notification');
        }
    });

    app.get("/payment", (req, res) => {
        res.render('payment.ejs');
    });

    app.post('/confirm-ride', async (req, res) => {
        try {
            const { confirmationId, Name, Action } = req.body;

            // Detailed validation
            let errors = [];
            if (!confirmationId) errors.push('Confirmation ID is required');
            if (!Name) errors.push('Name is required');
            if (!Action) errors.push('Action is required');

            if (errors.length > 0) {
                return res.status(400).send(errors.join(', '));
            }

            // Create the document in the database
            await Process.create({ confirmationId, Name, Action });
            res.redirect('/user-notifications');
        } catch (error) {
            console.error('Error processing notification:', error);
            res.status(500).send('Error processing notification: ' + error.message);
        }
    });

    // GET endpoint to fetch all processes
    app.get('/api/processes', async (req, res) => {
        try {
            const processes = await Process.find();
            res.json(processes);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Feedback form route      
    // Feedback submission route
    app.post('/submit-feedback', async (req, res) => {
        try {
            const { shipmentId, Rideno, rating, comments } = req.body;

            let errors = [];
            if (!shipmentId) errors.push('Shipment ID is required');
            if (!Rideno) errors.push('Ride number is required');
            if (!rating) errors.push('Rating is required');
            if (rating < 1 || rating > 5) errors.push('Rating must be between 1 and 5');

            if (errors.length > 0) {
                return res.status(400).send(errors.join(', '));
            }

            await Feedback.create({ shipmentId, Rideno, rating, comments });
            res.status(201).send('Feedback submitted successfully');
        } catch (error) {
            console.error('Error submitting feedback:', error);
            res.status(500).send('Error submitting feedback: ' + error.message);
        }
    });

    // Fetch all feedback
    app.get('/api/feedback', async (req, res) => {
        try {
            const feedback = await Feedback.find();
            res.json(feedback);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Render transporter feedback page
    app.get('/transporter-feedback', (req, res) => {
        res.render('transporter_feedback');
    });

    // Add a route to check MongoDB connection status
    app.get('/api/status', (req, res) => {
        res.json({
            database: {
                connected: mongoConnected,
                name: 'MongoDB'
            },
            server: {
                status: 'running',
                version: process.version
            }
        });
    });

    // Add a route to check MongoDB connection and session status
    app.get('/health', (req, res) => {
        // Check session
        const sessionStatus = req.session ? 'active' : 'not configured';
        
        // Check database connection
        const dbStatus = mongoConnected ? 'connected' : 'disconnected';
        
        // Gather some environment info
        const environment = {
            nodeEnv: process.env.NODE_ENV || 'not set',
            sessionSecret: process.env.SESSION_SECRET ? 'configured' : 'not configured',
            mongoUri: process.env.MONGO_URI ? 'configured' : 'not configured',
        };
        
        res.json({
            status: 'online',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            session: sessionStatus,
            environment: environment,
            requestId: req.session?.id || 'no session id',
            authUser: req.session?.user ? 'authenticated' : 'not authenticated'
        });
    });

    // Add a debug route for session information
    app.get('/debug-session', (req, res) => {
        res.json({
            sessionExists: !!req.session,
            sessionID: req.session?.id || 'none',
            userInSession: !!req.session?.user,
            userData: req.session?.user ? {
                id: req.session.user.id,
                name: req.session.user.name,
                email: req.session.user.email,
                role: req.session.user.role,
                loggedIn: req.session.user.loggedIn,
                loginTime: req.session.user.loginTime
            } : 'none',
            cookies: req.headers.cookie || 'none',
            isSecure: req.secure
        });
    });
};

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Something broke! Please try again later.');
});

// Handle MongoDB connection errors globally
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    mongoConnected = false;
});

// For MongoDB reconnection
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    mongoConnected = false;
    setTimeout(connectWithRetry, 5000);
});

// For MongoDB connection success after reconnect
mongoose.connection.on('connected', () => {
    console.log('MongoDB reconnected successfully');
    mongoConnected = true;
});
