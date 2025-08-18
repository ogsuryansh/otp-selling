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
const transactionsRoutes = require('./routes/transactions');

// Import database config
const { connectToMongoDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
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

// Basic security headers
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
app.use('/api/transactions', transactionsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Additional API endpoints for dynamic data
app.get('/api/statistics', async (req, res) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.json({
                totalUsers: 0,
                activeUsers: 0,
                bannedUsers: 0,
                totalBalance: 0,
                totalTransactions: 0,
                recentTransactions: 0
            });
        }
        
        // Get user statistics
        const users = await db.collection('users').find({}).toArray();
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.status === 'active').length;
        const bannedUsers = users.filter(user => user.status === 'banned').length;
        const totalBalance = users.reduce((sum, user) => sum + (parseFloat(user.balance) || 0), 0);
        
        // Get transaction statistics
        const transactions = await db.collection('transactions').find({}).toArray();
        const totalTransactions = transactions.length;
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.timestamp);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return txDate >= oneDayAgo;
        }).length;
        
        res.json({
            totalUsers,
            activeUsers,
            bannedUsers,
            totalBalance,
            totalTransactions,
            recentTransactions
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Add balance endpoint
app.post('/api/add_balance', async (req, res) => {
    try {
        const { user_id, amount, description, admin_id } = req.body;
        
        if (!user_id || !amount) {
            return res.status(400).json({ success: false, message: 'Missing user_id or amount' });
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }
        
        // Handle large user IDs properly - try both string and number formats
        let user = await db.collection('users').findOne({ user_id: parseInt(user_id) });
        if (!user) {
            user = await db.collection('users').findOne({ user_id: user_id.toString() });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const newBalance = (parseFloat(user.balance) || 0) + parseFloat(amount);
        
        // Update using the same format as the found user
        const updateQuery = user.user_id === parseInt(user_id) ? 
            { user_id: parseInt(user_id) } : 
            { user_id: user_id.toString() };
        
        await db.collection('users').updateOne(
            updateQuery,
            { $set: { balance: newBalance } }
        );
        
        // Create transaction record with enhanced details
        const transaction = {
            user_id: user.user_id,
            type: 'credit',
            amount: parseFloat(amount),
            description: description || 'Balance added by admin',
            source: 'admin',
            timestamp: new Date(),
            balance_before: parseFloat(user.balance) || 0,
            balance_after: newBalance,
            admin_id: admin_id || null
        };
        
        await db.collection('transactions').insertOne(transaction);
        
        res.json({ success: true, message: 'Balance added successfully' });
    } catch (error) {
        console.error('Error adding balance:', error);
        res.status(500).json({ success: false, message: 'Failed to add balance' });
    }
});

// Cut balance endpoint
app.post('/api/cut_balance', async (req, res) => {
    try {
        const { user_id, amount, description, admin_id } = req.body;
        
        if (!user_id || !amount) {
            return res.status(400).json({ success: false, message: 'Missing user_id or amount' });
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }
        
        // Handle large user IDs properly - try both string and number formats
        let user = await db.collection('users').findOne({ user_id: parseInt(user_id) });
        if (!user) {
            user = await db.collection('users').findOne({ user_id: user_id.toString() });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const currentBalance = parseFloat(user.balance) || 0;
        const newBalance = Math.max(0, currentBalance - parseFloat(amount));
        
        // Update using the same format as the found user
        const updateQuery = user.user_id === parseInt(user_id) ? 
            { user_id: parseInt(user_id) } : 
            { user_id: user_id.toString() };
        
        await db.collection('users').updateOne(
            updateQuery,
            { $set: { balance: newBalance } }
        );
        
        // Create transaction record with enhanced details
        const transaction = {
            user_id: user.user_id,
            type: 'debit',
            amount: parseFloat(amount),
            description: description || 'Balance deducted by admin',
            source: 'admin',
            timestamp: new Date(),
            balance_before: currentBalance,
            balance_after: newBalance,
            admin_id: admin_id || null
        };
        
        await db.collection('transactions').insertOne(transaction);
        
        res.json({ success: true, message: 'Balance cut successfully' });
    } catch (error) {
        console.error('Error cutting balance:', error);
        res.status(500).json({ success: false, message: 'Failed to cut balance' });
    }
});

// Add QR payment endpoint
app.post('/api/qr_payment', async (req, res) => {
    try {
        const { user_id, amount, payment_method, reference_id, description } = req.body;
        
        if (!user_id || !amount || !payment_method) {
            return res.status(400).json({ success: false, message: 'Missing user_id, amount, or payment_method' });
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }
        
        // Handle large user IDs properly - try both string and number formats
        let user = await db.collection('users').findOne({ user_id: parseInt(user_id) });
        if (!user) {
            user = await db.collection('users').findOne({ user_id: user_id.toString() });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const newBalance = (parseFloat(user.balance) || 0) + parseFloat(amount);
        
        // Update using the same format as the found user
        const updateQuery = user.user_id === parseInt(user_id) ? 
            { user_id: parseInt(user_id) } : 
            { user_id: user_id.toString() };
        
        await db.collection('users').updateOne(
            updateQuery,
            { $set: { balance: newBalance } }
        );
        
        // Create transaction record for QR payment
        const transaction = {
            user_id: user.user_id,
            type: 'credit',
            amount: parseFloat(amount),
            description: description || `QR Payment via ${payment_method}`,
            source: 'qr_payment',
            timestamp: new Date(),
            balance_before: parseFloat(user.balance) || 0,
            balance_after: newBalance,
            payment_method: payment_method,
            reference_id: reference_id || null
        };
        
        await db.collection('transactions').insertOne(transaction);
        
        res.json({ success: true, message: 'QR payment processed successfully' });
    } catch (error) {
        console.error('Error processing QR payment:', error);
        res.status(500).json({ success: false, message: 'Failed to process QR payment' });
    }
});

// Add promo code endpoint
app.post('/api/promo_payment', async (req, res) => {
    try {
        const { user_id, amount, promo_code, description } = req.body;
        
        if (!user_id || !amount || !promo_code) {
            return res.status(400).json({ success: false, message: 'Missing user_id, amount, or promo_code' });
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }
        
        // Handle large user IDs properly - try both string and number formats
        let user = await db.collection('users').findOne({ user_id: parseInt(user_id) });
        if (!user) {
            user = await db.collection('users').findOne({ user_id: user_id.toString() });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const newBalance = (parseFloat(user.balance) || 0) + parseFloat(amount);
        
        // Update using the same format as the found user
        const updateQuery = user.user_id === parseInt(user_id) ? 
            { user_id: parseInt(user_id) } : 
            { user_id: user_id.toString() };
        
        await db.collection('users').updateOne(
            updateQuery,
            { $set: { balance: newBalance } }
        );
        
        // Create transaction record for promo code
        const transaction = {
            user_id: user.user_id,
            type: 'credit',
            amount: parseFloat(amount),
            description: description || `Promo code: ${promo_code}`,
            source: 'promo',
            timestamp: new Date(),
            balance_before: parseFloat(user.balance) || 0,
            balance_after: newBalance,
            promo_code: promo_code
        };
        
        await db.collection('transactions').insertOne(transaction);
        
        res.json({ success: true, message: 'Promo code applied successfully' });
    } catch (error) {
        console.error('Error applying promo code:', error);
        res.status(500).json({ success: false, message: 'Failed to apply promo code' });
    }
});

// Add order payment endpoint
app.post('/api/order_payment', async (req, res) => {
    try {
        const { user_id, amount, order_id, description } = req.body;
        
        if (!user_id || !amount || !order_id) {
            return res.status(400).json({ success: false, message: 'Missing user_id, amount, or order_id' });
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }
        
        // Handle large user IDs properly - try both string and number formats
        let user = await db.collection('users').findOne({ user_id: parseInt(user_id) });
        if (!user) {
            user = await db.collection('users').findOne({ user_id: user_id.toString() });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const currentBalance = parseFloat(user.balance) || 0;
        if (currentBalance < parseFloat(amount)) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }
        
        const newBalance = currentBalance - parseFloat(amount);
        
        // Update using the same format as the found user
        const updateQuery = user.user_id === parseInt(user_id) ? 
            { user_id: parseInt(user_id) } : 
            { user_id: user_id.toString() };
        
        await db.collection('users').updateOne(
            updateQuery,
            { $set: { balance: newBalance } }
        );
        
        // Create transaction record for order payment
        const transaction = {
            user_id: user.user_id,
            type: 'debit',
            amount: parseFloat(amount),
            description: description || `Order purchase: ${order_id}`,
            source: 'order',
            timestamp: new Date(),
            balance_before: currentBalance,
            balance_after: newBalance,
            order_id: order_id
        };
        
        await db.collection('transactions').insertOne(transaction);
        
        res.json({ success: true, message: 'Order payment processed successfully' });
    } catch (error) {
        console.error('Error processing order payment:', error);
        res.status(500).json({ success: false, message: 'Failed to process order payment' });
    }
});

// Ban user endpoint
app.post('/api/ban_user', async (req, res) => {
    try {
        const { user_id, reason } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'Missing user_id' });
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }
        
        // Handle large user IDs properly - try both string and number formats
        let result = await db.collection('users').updateOne(
            { user_id: parseInt(user_id) },
            { $set: { status: 'banned', ban_reason: reason } }
        );
        
        if (result.matchedCount === 0) {
            result = await db.collection('users').updateOne(
                { user_id: user_id.toString() },
                { $set: { status: 'banned', ban_reason: reason } }
            );
        }
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, message: 'User banned successfully' });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ success: false, message: 'Failed to ban user' });
    }
});

// Unban user endpoint
app.post('/api/unban_user', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'Missing user_id' });
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }
        
        // Handle large user IDs properly - try both string and number formats
        let result = await db.collection('users').updateOne(
            { user_id: parseInt(user_id) },
            { $set: { status: 'active' }, $unset: { ban_reason: "" } }
        );
        
        if (result.matchedCount === 0) {
            result = await db.collection('users').updateOne(
                { user_id: user_id.toString() },
                { $set: { status: 'active' }, $unset: { ban_reason: "" } }
            );
        }
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, message: 'User unbanned successfully' });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ success: false, message: 'Failed to unban user' });
    }
});

// Update user balance endpoint
app.post('/api/update_user', async (req, res) => {
    try {
        const { user_id, balance } = req.body;
        
        if (!user_id || balance === undefined) {
            return res.status(400).json({ success: false, message: 'Missing user_id or balance' });
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }
        
        // Handle large user IDs properly - try both string and number formats
        let user = await db.collection('users').findOne({ user_id: parseInt(user_id) });
        if (!user) {
            user = await db.collection('users').findOne({ user_id: user_id.toString() });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const oldBalance = parseFloat(user.balance) || 0;
        const newBalance = parseFloat(balance) || 0;
        
        // Update using the same format as the found user
        const updateQuery = user.user_id === parseInt(user_id) ? 
            { user_id: parseInt(user_id) } : 
            { user_id: user_id.toString() };
        
        await db.collection('users').updateOne(
            updateQuery,
            { $set: { balance: newBalance } }
        );
        
        // Create transaction record for balance change
        await db.collection('transactions').insertOne({
            user_id: user.user_id,
            type: newBalance > oldBalance ? 'credit' : 'debit',
            amount: Math.abs(newBalance - oldBalance),
            description: newBalance > oldBalance ? 'Balance updated by admin' : 'Balance reduced by admin',
            source: 'admin',
            timestamp: new Date(),
            balance_before: oldBalance,
            balance_after: newBalance
        });
        
        res.json({ success: true, message: 'User balance updated successfully' });
    } catch (error) {
        console.error('Error updating user balance:', error);
        res.status(500).json({ success: false, message: 'Failed to update user balance' });
    }
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

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
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
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
}

// Export the app for Vercel serverless functions
module.exports = app;
