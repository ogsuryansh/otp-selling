// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import middleware
const { logger } = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const serversRoutes = require('./routes/servers');
const servicesRoutes = require('./routes/services');
const dashboardRoutes = require('./routes/dashboard');
const apisRoutes = require('./routes/apis');
const usersRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');
const promoCodesRoutes = require('./routes/promo-codes');

// Import database config
const { connectToMongoDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Add cache-busting middleware for development
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/servers', serversRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/apis', apisRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/promo-codes', promoCodesRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve static pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/dashboard.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/dashboard.html'));
});

app.get('/admin/servers', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/servers.html'));
});

app.get('/admin/services', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/services.html'));
});

app.get('/admin/apis', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/apis.html'));
});

app.get('/admin/orders', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/orders.html'));
});

app.get('/admin/users', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/users.html'));
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/login.html'));
});

// Additional routes for other pages
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, '../services/index.html'));
});

app.get('/servers', (req, res) => {
    res.sendFile(path.join(__dirname, '../servers/index.html'));
});

app.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, '../users/index.html'));
});

app.get('/transactions', (req, res) => {
    res.sendFile(path.join(__dirname, '../transactions/index.html'));
});

app.get('/promo-codes', (req, res) => {
    res.sendFile(path.join(__dirname, '../promo-codes/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Connect to MongoDB on startup
connectToMongoDB().then(({ db }) => {
    if (db && process.env.NODE_ENV === 'development') {
        console.log('✅ MongoDB connected successfully');
    }
});

// Start local server for development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Export the app for Vercel serverless functions
module.exports = app;
