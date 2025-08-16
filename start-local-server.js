const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Import the main API routes
const apiRoutes = require('./api/index.js');

// Use the API routes
app.use('/api', apiRoutes);

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/dashboard.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/dashboard.html'));
});

app.get('/admin/servers', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/servers.html'));
});

app.get('/admin/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/services.html'));
});

app.get('/admin/apis', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/apis.html'));
});

app.get('/admin/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/orders.html'));
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/login.html'));
});



// Additional routes for other pages
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard/index.html'));
});

app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'services/index.html'));
});

app.get('/servers', (req, res) => {
    res.sendFile(path.join(__dirname, 'servers/index.html'));
});

app.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, 'users/index.html'));
});

app.get('/transactions', (req, res) => {
    res.sendFile(path.join(__dirname, 'transactions/index.html'));
});

app.get('/promo-codes', (req, res) => {
    res.sendFile(path.join(__dirname, 'promo-codes/index.html'));
});

app.get('/api-config', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-config/index.html'));
});

app.get('/api-config/connection', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-config/api-connection.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Local development server running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
