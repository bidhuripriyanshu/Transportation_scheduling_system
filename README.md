# TSS-Final
Duplicate mongoose import removed.
ensureAuthenticated middleware added as a placeholder for authentication logic.
User role validation corrected in /login to ensure appropriate redirection.
req.user simulation added in login (you should replace this with a session or token-based system).
Error handling improved to make debugging easier.
Dynamic userId linking in shipments (req.user._id).
Missing Items:
Authentication Middleware: Replace the placeholder with proper logic like Passport.js or session-based middleware.
Models (User, Transporter, Shipment): Ensure they are properly defined in ./models/ with necessary fields.
Frontend Views: Ensure index.ejs, user-dashboard.ejs, and transporter-page.ejs are implemented in the views folder.