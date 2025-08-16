// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

// Import OTP routes
const otpRoutes = require('./otp');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced debugging and logging
const DEBUG_MODE = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
const REQUEST_LOG = [];

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'otp_bot';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'users';

let client = null;
let db = null;
let collection = null;

// Debug logging function
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        message,
        data,
        environment: process.env.NODE_ENV || 'unknown',
        vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION || 'unknown'
    };
    
    if (DEBUG_MODE) {
        console.log(`[DEBUG ${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    
    REQUEST_LOG.push(logEntry);
    
    // Keep only last 100 log entries to prevent memory issues
    if (REQUEST_LOG.length > 100) {
        REQUEST_LOG.shift();
    }
}

// MongoDB connection function
async function connectToMongoDB() {
    try {
        debugLog('Connecting to MongoDB...', { 
            uri: MONGODB_URI, 
            database: MONGODB_DATABASE,
            hasUri: !!MONGODB_URI,
            uriLength: MONGODB_URI ? MONGODB_URI.length : 0,
            environment: process.env.NODE_ENV || 'unknown'
        });
        
        // Check if MONGODB_URI is properly set
        if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017') {
            debugLog('❌ MONGODB_URI not set or using default localhost');
            console.error('❌ MONGODB_URI not set. Please check your .env file');
            return false;
        }
        
        client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        });
        
        await client.connect();
        debugLog('✅ MongoDB connection successful');
        
        db = client.db(MONGODB_DATABASE);
        collection = db.collection(MONGODB_COLLECTION);
        
        // Test the connection
        await db.admin().ping();
        debugLog(`✅ Connected to database: ${MONGODB_DATABASE}, collection: ${MONGODB_COLLECTION}`);
        
        return true;
    } catch (error) {
        debugLog('❌ MongoDB connection failed', {
            error: error.message,
            stack: error.stack,
            uri: MONGODB_URI,
            database: MONGODB_DATABASE
        });
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
}

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    debugLog(`Request started: ${req.method} ${req.path}`, {
        headers: req.headers,
        query: req.query,
        body: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        debugLog(`Request completed: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
});

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '..')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/css', express.static(path.join(__dirname, '../assets/css')));
app.use('/js', express.static(path.join(__dirname, '../assets/js')));
app.use('/images', express.static(path.join(__dirname, '../assets/images')));

// MongoDB data operations
async function loadUsers() {
    try {
        if (!collection || !client || !client.topology || !client.topology.isConnected()) {
            debugLog('❌ MongoDB not connected - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed');
                return [];
            }
        }
        
        const users = await collection.find({}).toArray();
        debugLog('Users loaded from MongoDB', { userCount: users.length });
        return users;
    } catch (error) {
        debugLog('Error loading users from MongoDB', { error: error.message });
        return [];
    }
}

async function saveUser(user) {
    try {
        if (!collection || !client || !client.topology || !client.topology.isConnected()) {
            debugLog('❌ MongoDB not connected - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed');
                return false;
            }
        }
        
        const result = await collection.updateOne(
            { user_id: user.user_id },
            { $set: user },
            { upsert: true }
        );
        
        debugLog('User saved to MongoDB', { user_id: user.user_id, result });
        return true;
    } catch (error) {
        debugLog('Error saving user to MongoDB', { error: error.message });
        return false;
    }
}

// Environment debug endpoint
app.get('/api/debug/environment', (req, res) => {
    try {
        const envInfo = {
            NODE_ENV: process.env.NODE_ENV || 'not set',
            VERCEL: !!process.env.VERCEL,
            VERCEL_REGION: process.env.VERCEL_REGION || 'not set',
            MONGODB_URI: process.env.MONGODB_URI ? 
                `${process.env.MONGODB_URI.substring(0, 20)}...` : 'not set',
            MONGODB_DATABASE: process.env.MONGODB_DATABASE || 'not set',
            MONGODB_COLLECTION: process.env.MONGODB_COLLECTION || 'not set',
            DEBUG: process.env.DEBUG || 'not set',
            hasMongoUri: !!process.env.MONGODB_URI,
            mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0
        };
        
        debugLog('Environment debug requested', envInfo);
        res.json(envInfo);
    } catch (error) {
        debugLog('Error getting environment info', { error: error.message });
        res.status(500).json({ error: 'Failed to get environment info', details: error.message });
    }
});

// Debug logs endpoint
app.get('/api/debug/logs', (req, res) => {
    const { limit = 50 } = req.query;
    const logs = REQUEST_LOG.slice(-parseInt(limit));
    debugLog('Debug logs requested', { requestedLimit: limit, returnedCount: logs.length });
    res.json(logs);
});

// MongoDB status endpoint
app.get('/api/debug/mongodb', async (req, res) => {
    try {
        const status = {
            connected: !!client && client.topology && client.topology.isConnected(),
            database: MONGODB_DATABASE,
            collection: MONGODB_COLLECTION,
            userCount: 0,
            lastError: null
        };
        
        if (status.connected && collection) {
            try {
                status.userCount = await collection.countDocuments({});
            } catch (error) {
                status.lastError = error.message;
            }
        }
        
        debugLog('MongoDB status requested', status);
        res.json(status);
    } catch (error) {
        debugLog('Error getting MongoDB status', { error: error.message });
        res.status(500).json({ error: 'Failed to get MongoDB status', details: error.message });
    }
});

// Serve static pages
app.get('/', (req, res) => {
    debugLog('Root route accessed');
    try {
        res.sendFile(path.join(__dirname, '../index.html'));
    } catch (error) {
        debugLog('Error serving home page', error.message);
        res.json({ 
            message: 'OTP Bot Dashboard API',
            pages: {
                home: '/',
                users: '/users',
                admin: '/admin',
                transactions: '/transactions',
                statistics: '/statistics'
            },
            endpoints: {
                health: '/api/health',
                test: '/api/test',
                users: '/api/users',
                statistics: '/api/statistics',
                transactions: '/api/transactions',
                debug: {
                    environment: '/api/debug/environment',
                    logs: '/api/debug/logs',
                    mongodb: '/api/debug/mongodb'
                }
            }
        });
    }
});

app.get('/users', (req, res) => {
    debugLog('Users page accessed');
    try {
        res.sendFile(path.join(__dirname, '../users/index.html'));
    } catch (error) {
        debugLog('Error serving users page', error.message);
        res.status(500).json({ error: 'Failed to load users page' });
    }
});

app.get('/admin', (req, res) => {
    debugLog('Admin page accessed');
    try {
        res.sendFile(path.join(__dirname, '../admin/index.html'));
    } catch (error) {
        debugLog('Error serving admin page', error.message);
        res.status(500).json({ error: 'Failed to load admin page' });
    }
});

app.get('/admin_fixed.html', (req, res) => {
    debugLog('Admin fixed page accessed');
    try {
        res.sendFile(path.join(__dirname, '../admin/admin_fixed.html'));
    } catch (error) {
        debugLog('Error serving admin fixed page', error.message);
        res.status(500).json({ error: 'Failed to load admin fixed page' });
    }
});

app.get('/transactions', (req, res) => {
    debugLog('Transactions page accessed');
    try {
        res.sendFile(path.join(__dirname, '../transactions/index.html'));
    } catch (error) {
        debugLog('Error serving transactions page', error.message);
        res.status(500).json({ error: 'Failed to load transactions page' });
    }
});

app.get('/servers', (req, res) => {
    debugLog('Servers page accessed');
    try {
        res.sendFile(path.join(__dirname, '../servers/index.html'));
    } catch (error) {
        debugLog('Error serving servers page', error.message);
        res.status(500).json({ error: 'Failed to load servers page' });
    }
});

app.get('/api-config', (req, res) => {
    debugLog('API config page accessed');
    try {
        res.sendFile(path.join(__dirname, '../api-config/index.html'));
    } catch (error) {
        debugLog('Error serving API config page', error.message);
        res.status(500).json({ error: 'Failed to load API config page' });
    }
});

app.get('/otp-dashboard', (req, res) => {
    debugLog('OTP Dashboard page accessed');
    try {
        res.sendFile(path.join(__dirname, '../otp-dashboard.html'));
    } catch (error) {
        debugLog('Error serving OTP dashboard page', error.message);
        res.status(500).json({ error: 'Failed to load OTP dashboard page' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        debugLog('Users endpoint called');
        const users = await loadUsers();
        const formattedUsers = users.map(user => ({
            id: user.user_id,
            name: user.first_name || 'Unknown',
            username: user.username || 'No username',
            balance: user.balance || 0.00,
            status: user.is_banned ? 'banned' : 'active',
            registration_date: user.registration_date || 'Unknown',
            last_activity: user.last_activity || 'Unknown'
        }));
        debugLog('Users formatted successfully', { count: formattedUsers.length });
        res.json(formattedUsers);
    } catch (error) {
        debugLog('Error getting users', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to load users', details: error.message });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        debugLog('Transactions endpoint called');
        const users = await loadUsers();
        const allTransactions = [];
        
        users.forEach(user => {
            const userTransactions = user.transactions || [];
            userTransactions.forEach(tx => {
                allTransactions.push({
                    type: tx.type,
                    amount: tx.amount,
                    user_id: user.user_id,
                    description: tx.description,
                    timestamp: tx.timestamp,
                    balance_before: tx.balance_before,
                    balance_after: tx.balance_after
                });
            });
        });
        
        allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        debugLog('Transactions processed successfully', { count: allTransactions.length });
        res.json(allTransactions);
    } catch (error) {
        debugLog('Error getting transactions', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to load transactions', details: error.message });
    }
});

app.get('/api/statistics', async (req, res) => {
    try {
        debugLog('Statistics endpoint called');
        
        if (!collection || !client || !client.topology || !client.topology.isConnected()) {
            debugLog('❌ MongoDB not connected for statistics - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for statistics');
                return res.json({
                    totalUsers: 0,
                    activeUsers: 0,
                    bannedUsers: 0,
                    totalBalance: 0,
                    totalTransactions: 0
                });
            }
        }
        
        const totalUsers = await collection.countDocuments({});
        const activeUsers = await collection.countDocuments({ is_banned: false });
        const bannedUsers = await collection.countDocuments({ is_banned: true });
        
        // Calculate total balance using aggregation
        const balanceResult = await collection.aggregate([
            { $group: { _id: null, total_balance: { $sum: '$balance' } } }
        ]).toArray();
        const totalBalance = balanceResult.length > 0 ? balanceResult[0].total_balance : 0;
        
        // Calculate total transactions using aggregation
        const transactionResult = await collection.aggregate([
            { $unwind: '$transactions' },
            { $group: { _id: null, total_transactions: { $sum: 1 } } }
        ]).toArray();
        const totalTransactions = transactionResult.length > 0 ? transactionResult[0].total_transactions : 0;
        
        const stats = {
            totalUsers,
            activeUsers,
            bannedUsers,
            totalBalance,
            totalTransactions
        };
        
        debugLog('Statistics calculated successfully', stats);
        res.json(stats);
    } catch (error) {
        debugLog('Error getting statistics', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to load statistics', details: error.message });
    }
});

app.post('/api/add_balance', async (req, res) => {
    try {
        const { user_id, amount, admin_id } = req.body;
        
        if (!user_id || !amount) {
            return res.status(400).json({ success: false, message: 'User ID and amount are required' });
        }
        
        if (!collection) {
            return res.status(500).json({ success: false, message: 'Database not connected' });
        }
        
        const user = await collection.findOne({ user_id: parseInt(user_id) });
        if (!user) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const oldBalance = user.balance || 0;
        const newBalance = oldBalance + parseFloat(amount);
        
        const transaction = {
            type: 'admin_action',
            amount: parseFloat(amount),
            description: `Admin added ${amount} 💎 to balance`,
            timestamp: new Date().toISOString(),
            balance_before: oldBalance,
            balance_after: newBalance,
            admin_id: admin_id || 7574316340
        };
        
        await collection.updateOne(
            { user_id: parseInt(user_id) },
            {
                $set: { balance: newBalance },
                $push: { transactions: transaction }
            }
        );
        
        res.json({ success: true, message: `Added ${amount} 💎 to user ${user_id}` });
    } catch (error) {
        debugLog('Error adding balance', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to add balance' });
    }
});

app.post('/api/cut_balance', async (req, res) => {
    try {
        const { user_id, amount, admin_id } = req.body;
        
        if (!user_id || !amount) {
            return res.status(400).json({ success: false, message: 'User ID and amount are required' });
        }
        
        if (!collection) {
            return res.status(500).json({ success: false, message: 'Database not connected' });
        }
        
        const user = await collection.findOne({ user_id: parseInt(user_id) });
        if (!user) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const oldBalance = user.balance || 0;
        const newBalance = oldBalance - parseFloat(amount);
        
        if (newBalance < 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient balance. User has ${oldBalance} 💎` 
            });
        }
        
        const transaction = {
            type: 'admin_action',
            amount: parseFloat(amount),
            description: `Admin deducted ${amount} 💎 from balance`,
            timestamp: new Date().toISOString(),
            balance_before: oldBalance,
            balance_after: newBalance,
            admin_id: admin_id || 7574316340
        };
        
        await collection.updateOne(
            { user_id: parseInt(user_id) },
            {
                $set: { balance: newBalance },
                $push: { transactions: transaction }
            }
        );
        
        res.json({ success: true, message: `Deducted ${amount} 💎 from user ${user_id}` });
    } catch (error) {
        debugLog('Error cutting balance', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to cut balance' });
    }
});

app.post('/api/ban_user', async (req, res) => {
    try {
        const { user_id, reason, admin_id } = req.body;
        
        if (!user_id || !reason) {
            return res.status(400).json({ success: false, message: 'User ID and reason are required' });
        }
        
        if (!collection) {
            return res.status(500).json({ success: false, message: 'Database not connected' });
        }
        
        const user = await collection.findOne({ user_id: parseInt(user_id) });
        if (!user) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const transaction = {
            type: 'admin_action',
            amount: 0,
            description: `User banned: ${reason}`,
            timestamp: new Date().toISOString(),
            balance_before: user.balance || 0,
            balance_after: user.balance || 0,
            admin_id: admin_id || 7574316340
        };
        
        await collection.updateOne(
            { user_id: parseInt(user_id) },
            {
                $set: {
                    is_banned: true,
                    ban_reason: reason,
                    ban_date: new Date().toISOString()
                },
                $push: { transactions: transaction }
            }
        );
        
        res.json({ success: true, message: `User ${user_id} banned successfully` });
    } catch (error) {
        debugLog('Error banning user', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to ban user' });
    }
});

app.post('/api/unban_user', async (req, res) => {
    try {
        const { user_id, admin_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        
        if (!collection) {
            return res.status(500).json({ success: false, message: 'Database not connected' });
        }
        
        const user = await collection.findOne({ user_id: parseInt(user_id) });
        if (!user) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const transaction = {
            type: 'admin_action',
            amount: 0,
            description: 'User unbanned',
            timestamp: new Date().toISOString(),
            balance_before: user.balance || 0,
            balance_after: user.balance || 0,
            admin_id: admin_id || 7574316340
        };
        
        await collection.updateOne(
            { user_id: parseInt(user_id) },
            {
                $set: {
                    is_banned: false,
                    ban_reason: null,
                    ban_date: null
                },
                $push: { transactions: transaction }
            }
        );
        
        res.json({ success: true, message: `User ${user_id} unbanned successfully` });
    } catch (error) {
        debugLog('Error unbanning user', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to unban user' });
    }
});

// Update user endpoint
app.post('/api/update_user', async (req, res) => {
    try {
        const { user_id, first_name, username, balance, is_banned, ban_reason, admin_id } = req.body;
        
        if (!user_id || !first_name || balance === undefined) {
            return res.status(400).json({ success: false, message: 'User ID, name, and balance are required' });
        }
        
        if (!collection) {
            return res.status(500).json({ success: false, message: 'Database not connected' });
        }
        
        const user = await collection.findOne({ user_id: parseInt(user_id) });
        if (!user) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const oldBalance = user.balance || 0;
        const balanceChanged = oldBalance !== parseFloat(balance);
        
        // Create transaction record if balance changed
        let transaction = null;
        if (balanceChanged) {
            transaction = {
                type: 'admin_action',
                amount: parseFloat(balance) - oldBalance,
                description: `Admin updated balance from ${oldBalance} to ${balance} 💎`,
                timestamp: new Date().toISOString(),
                balance_before: oldBalance,
                balance_after: parseFloat(balance),
                admin_id: admin_id || 7574316340
            };
        }
        
        // Prepare update data
        const updateData = {
            first_name: first_name,
            balance: parseFloat(balance)
        };
        
        if (username !== undefined) {
            updateData.username = username;
        }
        
        if (is_banned !== undefined) {
            updateData.is_banned = is_banned;
            if (is_banned && ban_reason) {
                updateData.ban_reason = ban_reason;
                updateData.ban_date = new Date().toISOString();
            } else if (!is_banned) {
                updateData.ban_reason = null;
                updateData.ban_date = null;
            }
        }
        
        // Perform update
        const updateOperation = { $set: updateData };
        if (transaction) {
            updateOperation.$push = { transactions: transaction };
        }
        
        await collection.updateOne(
            { user_id: parseInt(user_id) },
            updateOperation
        );
        
        res.json({ 
            success: true, 
            message: `User ${user_id} updated successfully`,
            changes: {
                balanceChanged,
                statusChanged: is_banned !== undefined && is_banned !== user.is_banned
            }
        });
    } catch (error) {
        debugLog('Error updating user', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

app.get('/api/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        
        if (!collection) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const user = await collection.findOne({ user_id: parseInt(user_id) });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            id: user.user_id,
            name: user.first_name || 'Unknown',
            username: user.username || 'No username',
            balance: user.balance || 0.00,
            status: user.is_banned ? 'banned' : 'active',
            registration_date: user.registration_date || 'Unknown',
            last_activity: user.last_activity || 'Unknown',
            ban_reason: user.ban_reason,
            ban_date: user.ban_date
        });
    } catch (error) {
        debugLog('Error getting user', { error: error.message });
        res.status(500).json({ error: 'Failed to load user' });
    }
});

app.get('/api/user/:user_id/transactions', async (req, res) => {
    try {
        const { user_id } = req.params;
        
        if (!collection) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const user = await collection.findOne({ user_id: parseInt(user_id) });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user.transactions || []);
    } catch (error) {
        debugLog('Error getting user transactions', { error: error.message });
        res.status(500).json({ error: 'Failed to load user transactions' });
    }
});

app.get('/api/health', (req, res) => {
    debugLog('Health check endpoint called');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        debug: DEBUG_MODE,
        environment: process.env.NODE_ENV || 'unknown',
        vercel: !!process.env.VERCEL,
        mongodb: {
            connected: !!client && client.topology && client.topology.isConnected(),
            database: MONGODB_DATABASE
        }
    });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    debugLog('Test endpoint called');
    res.json({ 
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        debug: DEBUG_MODE,
        mongodb: {
            connected: !!client && client.topology && client.topology.isConnected()
        }
    });
});

// Server Management API Endpoints
app.get('/api/servers', async (req, res) => {
    debugLog('GET /api/servers called');
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for servers endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for servers endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const serversCollection = db.collection('servers');
        const servers = await serversCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        debugLog(`Retrieved ${servers.length} servers`);
        res.json(servers);
    } catch (error) {
        debugLog('Error retrieving servers', { error: error.message, stack: error.stack });
        console.error('Error in GET /api/servers:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve servers', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

app.post('/api/servers', async (req, res) => {
    debugLog('POST /api/servers called', { body: req.body });
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for servers endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for servers endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const { name, code, country, status } = req.body;
        
        // Validation
        if (!name || !code || !country || !status) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                message: 'Please fill in all required fields: name, code, country, status' 
            });
        }
        
        // Check if server code already exists
        const serversCollection = db.collection('servers');
        const existingServer = await serversCollection.findOne({ code: code });
        if (existingServer) {
            return res.status(400).json({ 
                error: 'Server code already exists',
                message: 'A server with this code already exists. Please use a different code.' 
            });
        }
        
        const newServer = {
            name,
            code,
            country,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await serversCollection.insertOne(newServer);
        newServer._id = result.insertedId;
        
        debugLog('Server created successfully', { serverId: result.insertedId });
        res.status(201).json(newServer);
    } catch (error) {
        debugLog('Error creating server', { error: error.message, stack: error.stack });
        console.error('Error in POST /api/servers:', error);
        res.status(500).json({ 
            error: 'Failed to create server', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

app.get('/api/servers/:id', async (req, res) => {
    debugLog(`GET /api/servers/${req.params.id} called`);
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for servers endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { ObjectId } = require('mongodb');
        const serversCollection = db.collection('servers');
        const server = await serversCollection.findOne({ _id: new ObjectId(req.params.id) });
        
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        debugLog('Server retrieved successfully', { serverId: req.params.id });
        res.json(server);
    } catch (error) {
        debugLog('Error retrieving server', { error: error.message, serverId: req.params.id });
        res.status(500).json({ error: 'Failed to retrieve server', details: error.message });
    }
});

app.put('/api/servers/:id', async (req, res) => {
    debugLog(`PUT /api/servers/${req.params.id} called`, { body: req.body });
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for servers endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { name, code, country, status } = req.body;
        
        // Validation
        if (!name || !code || !country || !status) {
            return res.status(400).json({ error: 'Missing required fields: name, code, country, status' });
        }
        
        const { ObjectId } = require('mongodb');
        const serversCollection = db.collection('servers');
        
        // Check if server code already exists (excluding current server)
        const existingServer = await serversCollection.findOne({ 
            code: code, 
            _id: { $ne: new ObjectId(req.params.id) } 
        });
        if (existingServer) {
            return res.status(400).json({ error: 'Server code already exists' });
        }
        
        const updateData = {
            name,
            code,
            country,
            status,
            updatedAt: new Date()
        };
        
        const result = await serversCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        debugLog('Server updated successfully', { serverId: req.params.id });
        res.json({ message: 'Server updated successfully', updated: true });
    } catch (error) {
        debugLog('Error updating server', { error: error.message, serverId: req.params.id });
        res.status(500).json({ error: 'Failed to update server', details: error.message });
    }
});

app.delete('/api/servers/:id', async (req, res) => {
    debugLog(`DELETE /api/servers/${req.params.id} called`);
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for servers endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { ObjectId } = require('mongodb');
        const serversCollection = db.collection('servers');
        
        const result = await serversCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        debugLog('Server deleted successfully', { serverId: req.params.id });
        res.json({ message: 'Server deleted successfully', deleted: true });
    } catch (error) {
        debugLog('Error deleting server', { error: error.message, serverId: req.params.id });
        res.status(500).json({ error: 'Failed to delete server', details: error.message });
    }
});

// API Configuration Management Endpoints
app.get('/api/apis', async (req, res) => {
    debugLog('GET /api/apis called');
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for APIs endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for APIs endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const apisCollection = db.collection('apis');
        const apis = await apisCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        debugLog(`Retrieved ${apis.length} APIs`);
        res.json(apis);
    } catch (error) {
        debugLog('Error retrieving APIs', { error: error.message, stack: error.stack });
        console.error('Error in GET /api/apis:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve APIs', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

app.post('/api/apis', async (req, res) => {
    debugLog('POST /api/apis called', { body: req.body });
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for APIs endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for APIs endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const { 
            name, serverId, usesAuth, responseType, messagePath, 
            statusCheckType, statusValue, getNumberUrl, getStatusUrl, 
            activateUrl, cancelUrl, autoCancelMinutes, retryCount, apiKey,
            // New OTP API fields
            statusSuccess, cancelUrl: cancelUrlAlt
        } = req.body;
        
        // Map new field names to existing ones for backward compatibility
        const mappedStatusValue = statusSuccess || statusValue;
        const mappedCancelUrl = cancelUrlAlt || cancelUrl;
        
        // Validation
        if (!name || !serverId || !responseType || !getNumberUrl || !getStatusUrl || !mappedCancelUrl) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                message: 'Please fill in all required fields: name, serverId, responseType, getNumberUrl, getStatusUrl, cancelUrl' 
            });
        }
        
        // Check if API name already exists
        const apisCollection = db.collection('apis');
        const existingApi = await apisCollection.findOne({ name: name });
        if (existingApi) {
            return res.status(400).json({ 
                error: 'API name already exists',
                message: 'An API with this name already exists. Please use a different name.' 
            });
        }
        
        const newApi = {
            name,
            serverId,
            usesAuth: usesAuth || false,
            responseType,
            messagePath: messagePath || null,
            statusCheckType: 'startsWith', // Default for OTP APIs
            statusValue: mappedStatusValue || 'STATUS_SUCCESS',
            getNumberUrl,
            getStatusUrl,
            activateUrl: activateUrl || null,
            cancelUrl: mappedCancelUrl,
            autoCancelMinutes: autoCancelMinutes || 5,
            retryCount: retryCount || 0,
            apiKey: apiKey || null,
            status: 'inactive',
            numbersUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await apisCollection.insertOne(newApi);
        newApi._id = result.insertedId;
        
        debugLog('API created successfully', { apiId: result.insertedId });
        res.status(201).json(newApi);
    } catch (error) {
        debugLog('Error creating API', { error: error.message, stack: error.stack });
        console.error('Error in POST /api/apis:', error);
        res.status(500).json({ 
            error: 'Failed to create API', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

app.get('/api/apis/:id', async (req, res) => {
    debugLog(`GET /api/apis/${req.params.id} called`);
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for APIs endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { ObjectId } = require('mongodb');
        const apisCollection = db.collection('apis');
        const api = await apisCollection.findOne({ _id: new ObjectId(req.params.id) });
        
        if (!api) {
            return res.status(404).json({ error: 'API not found' });
        }
        
        debugLog('API retrieved successfully', { apiId: req.params.id });
        res.json(api);
    } catch (error) {
        debugLog('Error retrieving API', { error: error.message, apiId: req.params.id });
        res.status(500).json({ error: 'Failed to retrieve API', details: error.message });
    }
});

app.put('/api/apis/:id', async (req, res) => {
    debugLog(`PUT /api/apis/${req.params.id} called`, { body: req.body });
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for APIs endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { 
            name, serverId, usesAuth, responseType, messagePath, 
            statusCheckType, statusValue, getNumberUrl, getStatusUrl, 
            activateUrl, cancelUrl, autoCancelMinutes, retryCount, apiKey,
            // New OTP API fields
            statusSuccess, cancelUrl: cancelUrlAlt
        } = req.body;
        
        // Map new field names to existing ones for backward compatibility
        const mappedStatusValue = statusSuccess || statusValue;
        const mappedCancelUrl = cancelUrlAlt || cancelUrl;
        
        // Validation
        if (!name || !serverId || !responseType || !getNumberUrl || !getStatusUrl || !mappedCancelUrl) {
            return res.status(400).json({ error: 'Missing required fields: name, serverId, responseType, getNumberUrl, getStatusUrl, cancelUrl' });
        }
        
        const { ObjectId } = require('mongodb');
        const apisCollection = db.collection('apis');
        
        // Check if API name already exists (excluding current API)
        const existingApi = await apisCollection.findOne({ 
            name: name, 
            _id: { $ne: new ObjectId(req.params.id) } 
        });
        if (existingApi) {
            return res.status(400).json({ error: 'API name already exists' });
        }
        
        const updateData = {
            name,
            serverId,
            usesAuth: usesAuth || false,
            responseType,
            messagePath: messagePath || null,
            statusCheckType: statusCheckType || 'startsWith',
            statusValue: mappedStatusValue || 'STATUS_SUCCESS',
            getNumberUrl,
            getStatusUrl,
            activateUrl: activateUrl || null,
            cancelUrl: mappedCancelUrl,
            autoCancelMinutes: autoCancelMinutes || 5,
            retryCount: retryCount || 0,
            apiKey: apiKey || null,
            updatedAt: new Date()
        };
        
        const result = await apisCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'API not found' });
        }
        
        debugLog('API updated successfully', { apiId: req.params.id });
        res.json({ message: 'API updated successfully', updated: true });
    } catch (error) {
        debugLog('Error updating API', { error: error.message, apiId: req.params.id });
        res.status(500).json({ error: 'Failed to update API', details: error.message });
    }
});

app.delete('/api/apis/:id', async (req, res) => {
    debugLog(`DELETE /api/apis/${req.params.id} called`);
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for APIs endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { ObjectId } = require('mongodb');
        const apisCollection = db.collection('apis');
        
        const result = await apisCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'API not found' });
        }
        
        debugLog('API deleted successfully', { apiId: req.params.id });
        res.json({ message: 'API deleted successfully', deleted: true });
    } catch (error) {
        debugLog('Error deleting API', { error: error.message, apiId: req.params.id });
        res.status(500).json({ error: 'Failed to delete API', details: error.message });
    }
});

app.post('/api/apis/:id/test', async (req, res) => {
    debugLog(`POST /api/apis/${req.params.id}/test called`);
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for APIs endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { ObjectId } = require('mongodb');
        const apisCollection = db.collection('apis');
        const api = await apisCollection.findOne({ _id: new ObjectId(req.params.id) });
        
        if (!api) {
            return res.status(404).json({ error: 'API not found' });
        }
        
        // Test the API configuration
        const testResult = await testApiConfiguration(api);
        
        debugLog('API test completed', { apiId: req.params.id, success: testResult.success });
        res.json(testResult);
    } catch (error) {
        debugLog('Error testing API', { error: error.message, apiId: req.params.id });
        res.status(500).json({ 
            success: false, 
            message: 'Failed to test API', 
            details: error.message 
        });
    }
});

// Helper function to test API configuration
async function testApiConfiguration(api) {
    try {
        const testResults = {
            success: false,
            message: '',
            details: {}
        };
        
        // Test 1: Check if URLs are valid
        try {
            new URL(api.getNumberUrl);
            new URL(api.getStatusUrl);
            if (api.activateUrl) new URL(api.activateUrl);
            if (api.cancelUrl) new URL(api.cancelUrl);
            testResults.details.urlValidation = '✅ All URLs are valid';
        } catch (error) {
            testResults.details.urlValidation = `❌ Invalid URL: ${error.message}`;
            testResults.message = 'Invalid URL format detected';
            return testResults;
        }
        
        // Test 2: Check if server exists
        const serversCollection = db.collection('servers');
        const server = await serversCollection.findOne({ _id: new ObjectId(api.serverId) });
        if (!server) {
            testResults.details.serverCheck = '❌ Associated server not found';
            testResults.message = 'Associated server does not exist';
            return testResults;
        }
        testResults.details.serverCheck = `✅ Server found: ${server.name}`;
        
        // Test 3: Validate response type configuration
        if (api.responseType === 'json' && !api.messagePath) {
            testResults.details.responseConfig = '⚠️ JSON response type selected but no message path specified';
        } else {
            testResults.details.responseConfig = `✅ Response type: ${api.responseType.toUpperCase()}`;
        }
        
        // Test 4: Validate status check configuration
        if (api.statusCheckType === 'jsonPath' && !api.statusValue.includes('.')) {
            testResults.details.statusConfig = '⚠️ JSON path status check selected but status value may not be a valid path';
        } else {
            testResults.details.statusConfig = `✅ Status check: ${api.statusCheckType}`;
        }
        
        // All tests passed
        testResults.success = true;
        testResults.message = 'API configuration is valid and ready to use';
        testResults.details.summary = 'All validation checks passed successfully';
        
        return testResults;
    } catch (error) {
        return {
            success: false,
            message: 'Error during API testing',
            details: { error: error.message }
        };
    }
}

// Admin credentials endpoint (for frontend authentication)
app.get('/api/admin/credentials', (req, res) => {
    debugLog('Admin credentials endpoint called');
    
    // Return admin credentials from environment variables
    const adminCredentials = {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        admin_id: process.env.ADMIN_ID || '7574316340',
        security: {
            maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
            lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000,
            sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000,
            require2FA: process.env.REQUIRE_2FA === 'true' || false
        }
    };
    
    debugLog('Admin credentials loaded from environment', { 
        username: adminCredentials.username,
        hasPassword: !!adminCredentials.password,
        admin_id: adminCredentials.admin_id
    });
    
    res.json(adminCredentials);
});

// Import and use OTP Number API endpoints (focused on phone numbers only)
try {
    const OTPNumberService = require('./services/otp-number-service');
    const otpNumberService = new OTPNumberService();
    
    // OTP Number API endpoints - Phone numbers only, no mail functionality
    app.get('/api/otp-number/countries', async (req, res) => {
        try {
            const { provider = '5sim' } = req.query;
            
            const countries = await otpNumberService.getCountries(provider);
            
            res.json({
                success: true,
                data: {
                    countries,
                    provider,
                    total: countries.length
                }
            });
        } catch (error) {
            debugLog('Error getting countries:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to retrieve countries'
            });
        }
    });

    app.get('/api/otp-number/products', async (req, res) => {
        try {
            const { provider = '5sim', country = 'russia' } = req.query;
            
            const products = await otpNumberService.getProducts(provider, country);
            
            res.json({
                success: true,
                data: {
                    products,
                    country,
                    provider,
                    total: products.length
                }
            });
        } catch (error) {
            debugLog('Error getting products:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to retrieve products'
            });
        }
    });

    app.post('/api/otp-number/buy', async (req, res) => {
        try {
            const { provider = '5sim', country = 'russia', product = 'any', operator = 'any' } = req.body;
            const userId = req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required',
                    message: 'Please provide user ID in headers'
                });
            }
            
            if (!country || !product) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Country and product are required'
                });
            }
            
            const order = await otpNumberService.buyNumber(provider, country, product, operator, userId);
            
            res.json({
                success: true,
                data: {
                    order,
                    message: `Phone number purchased successfully! Number: ${order.phone}`
                }
            });
        } catch (error) {
            debugLog('Error buying number:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to purchase phone number'
            });
        }
    });

    app.get('/api/otp-number/check/:orderId', async (req, res) => {
        try {
            const { orderId } = req.params;
            const { provider = '5sim' } = req.query;
            
            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing order ID',
                    message: 'Order ID is required'
                });
            }
            
            const result = await otpNumberService.checkSMS(provider, orderId);
            
            res.json({
                success: true,
                data: {
                    result,
                    orderId,
                    message: result.sms && result.sms.length > 0 
                        ? `OTP received: ${result.sms[0].text || 'SMS received'}` 
                        : 'Waiting for SMS...'
                }
            });
        } catch (error) {
            debugLog('Error checking SMS:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to check SMS'
            });
        }
    });

    app.post('/api/otp-number/finish/:orderId', async (req, res) => {
        try {
            const { orderId } = req.params;
            const { provider = '5sim' } = req.body;
            const userId = req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required',
                    message: 'Please provide user ID in headers'
                });
            }
            
            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing order ID',
                    message: 'Order ID is required'
                });
            }
            
            // Verify order belongs to user
            const order = await otpNumberService.getOrder(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found',
                    message: 'The specified order does not exist'
                });
            }
            
            if (order.user_id != userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only finish your own orders'
                });
            }
            
            const result = await otpNumberService.finishOrder(provider, orderId);
            
            res.json({
                success: true,
                data: {
                    result,
                    message: 'Order completed successfully!'
                }
            });
        } catch (error) {
            debugLog('Error finishing order:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to finish order'
            });
        }
    });

    app.post('/api/otp-number/cancel/:orderId', async (req, res) => {
        try {
            const { orderId } = req.params;
            const { provider = '5sim' } = req.body;
            const userId = req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required',
                    message: 'Please provide user ID in headers'
                });
            }
            
            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing order ID',
                    message: 'Order ID is required'
                });
            }
            
            // Verify order belongs to user
            const order = await otpNumberService.getOrder(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found',
                    message: 'The specified order does not exist'
                });
            }
            
            if (order.user_id != userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only cancel your own orders'
                });
            }
            
            const result = await otpNumberService.cancelOrder(provider, orderId);
            
            res.json({
                success: true,
                data: {
                    result,
                    message: 'Order cancelled successfully!'
                }
            });
        } catch (error) {
            debugLog('Error cancelling order:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to cancel order'
            });
        }
    });

    app.get('/api/otp-number/balance', async (req, res) => {
        try {
            const { provider = '5sim' } = req.query;
            
            const balance = await otpNumberService.getBalance(provider);
            
            res.json({
                success: true,
                data: {
                    balance,
                    provider
                }
            });
        } catch (error) {
            debugLog('Error getting balance:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to retrieve balance'
            });
        }
    });

    app.get('/api/otp-number/status', async (req, res) => {
        try {
            const { provider = '5sim' } = req.query;
            
            const balance = await otpNumberService.getBalance(provider);
            const activeOrders = otpNumberService.activeOrders.size;
            
            res.json({
                success: true,
                data: {
                    provider,
                    balance: balance.balance,
                    currency: balance.currency,
                    activeOrders,
                    status: 'operational',
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            debugLog('Error getting service status:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                status: 'error',
                message: 'Failed to retrieve service status'
            });
        }
    });

    // Additional OTP Number endpoints
    app.get('/api/otp-number/orders', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            const { limit = 50, page = 1, status, provider } = req.query;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required',
                    message: 'Please provide user ID in headers'
                });
            }
            
            const result = await otpNumberService.getUserOrders(userId, parseInt(limit), parseInt(page));
            
            // Apply additional filters if provided
            let filteredOrders = result.orders;
            
            if (status) {
                filteredOrders = filteredOrders.filter(order => order.status === status);
            }
            
            if (provider) {
                filteredOrders = filteredOrders.filter(order => order.provider === provider);
            }
            
            res.json({
                success: true,
                data: {
                    orders: filteredOrders,
                    pagination: {
                        ...result.pagination,
                        filteredCount: filteredOrders.length
                    }
                }
            });
        } catch (error) {
            debugLog('Error getting user orders:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to retrieve orders'
            });
        }
    });

    app.get('/api/otp-number/orders/:orderId', async (req, res) => {
        try {
            const { orderId } = req.params;
            const userId = req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required',
                    message: 'Please provide user ID in headers'
                });
            }
            
            const order = await otpNumberService.getOrder(orderId);
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found',
                    message: 'The specified order does not exist'
                });
            }
            
            // Verify order belongs to user
            if (order.user_id != userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only view your own orders'
                });
            }
            
            res.json({
                success: true,
                data: {
                    order
                }
            });
        } catch (error) {
            debugLog('Error getting order:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to retrieve order'
            });
        }
    });

    app.get('/api/otp-number/statistics', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required',
                    message: 'Please provide user ID in headers'
                });
            }
            
            const stats = await otpNumberService.getOrderStatistics(userId);
            
            res.json({
                success: true,
                data: {
                    statistics: stats,
                    userId
                }
            });
        } catch (error) {
            debugLog('Error getting statistics:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to retrieve statistics'
            });
        }
    });

    app.get('/api/otp-number/providers', async (req, res) => {
        try {
            const providers = Object.entries(otpNumberService.providers).map(([key, config]) => ({
                id: key,
                name: config.name,
                baseUrl: config.baseUrl,
                hasApiKey: !!config.apiKey
            }));
            
            res.json({
                success: true,
                data: {
                    providers,
                    total: providers.length
                }
            });
        } catch (error) {
            debugLog('Error getting providers:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to retrieve providers'
            });
        }
    });

    app.get('/api/otp-number/health', async (req, res) => {
        try {
            const isConnected = await otpNumberService.connectToMongoDB();
            
            res.json({
                success: true,
                data: {
                    status: 'healthy',
                    mongodb: isConnected ? 'connected' : 'disconnected',
                    timestamp: new Date().toISOString(),
                    service: 'OTP Number Service'
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                status: 'unhealthy'
            });
        }
    });

    debugLog('✅ OTP Number API endpoints loaded successfully (Phone numbers only)');
} catch (error) {
    debugLog('❌ Failed to load OTP Number API endpoints:', error);
}

// Add new OTP provider routes
app.use('/api/otp', otpRoutes);
debugLog('✅ New OTP provider routes loaded successfully');

// Promo Codes API Endpoints
app.get('/api/promo-codes', async (req, res) => {
    debugLog('GET /api/promo-codes called');
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for promo codes endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for promo codes endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const promoCollection = db.collection('promo_codes');
        const promoCodes = await promoCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        debugLog(`Retrieved ${promoCodes.length} promo codes`);
        res.json(promoCodes);
    } catch (error) {
        debugLog('Error retrieving promo codes', { error: error.message, stack: error.stack });
        console.error('Error in GET /api/promo-codes:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve promo codes', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

app.post('/api/promo-codes', async (req, res) => {
    debugLog('POST /api/promo-codes called', { body: req.body });
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for promo codes endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for promo codes endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const { code, discount, maxUses, expiresAt, description } = req.body;
        
        // Validation
        if (!code || !discount || !maxUses) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                message: 'Please fill in all required fields: code, discount, maxUses' 
            });
        }
        
        // Check if promo code already exists
        const promoCollection = db.collection('promo_codes');
        const existingPromo = await promoCollection.findOne({ code: code.toUpperCase() });
        if (existingPromo) {
            return res.status(400).json({ 
                error: 'Promo code already exists',
                message: 'A promo code with this name already exists. Please use a different code.' 
            });
        }
        
        const newPromo = {
            code: code.toUpperCase(),
            discount: parseFloat(discount),
            maxUses: parseInt(maxUses),
            currentUses: 0,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            description: description || '',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await promoCollection.insertOne(newPromo);
        newPromo._id = result.insertedId;
        
        debugLog('Promo code created successfully', { promoId: result.insertedId });
        res.status(201).json(newPromo);
    } catch (error) {
        debugLog('Error creating promo code', { error: error.message, stack: error.stack });
        console.error('Error in POST /api/promo-codes:', error);
        res.status(500).json({ 
            error: 'Failed to create promo code', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

app.put('/api/promo-codes/:id', async (req, res) => {
    debugLog(`PUT /api/promo-codes/${req.params.id} called`, { body: req.body });
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for promo codes endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { code, discount, maxUses, expiresAt, description, isActive } = req.body;
        
        // Validation
        if (!code || !discount || !maxUses) {
            return res.status(400).json({ error: 'Missing required fields: code, discount, maxUses' });
        }
        
        const { ObjectId } = require('mongodb');
        const promoCollection = db.collection('promo_codes');
        
        // Check if promo code already exists (excluding current promo)
        const existingPromo = await promoCollection.findOne({ 
            code: code.toUpperCase(), 
            _id: { $ne: new ObjectId(req.params.id) } 
        });
        if (existingPromo) {
            return res.status(400).json({ error: 'Promo code already exists' });
        }
        
        const updateData = {
            code: code.toUpperCase(),
            discount: parseFloat(discount),
            maxUses: parseInt(maxUses),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            description: description || '',
            isActive: isActive !== undefined ? isActive : true,
            updatedAt: new Date()
        };
        
        const result = await promoCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Promo code not found' });
        }
        
        debugLog('Promo code updated successfully', { promoId: req.params.id });
        res.json({ message: 'Promo code updated successfully', updated: true });
    } catch (error) {
        debugLog('Error updating promo code', { error: error.message, promoId: req.params.id });
        res.status(500).json({ error: 'Failed to update promo code', details: error.message });
    }
});

app.delete('/api/promo-codes/:id', async (req, res) => {
    debugLog(`DELETE /api/promo-codes/${req.params.id} called`);
    
    if (!client || !client.topology || !client.topology.isConnected()) {
        debugLog('MongoDB not connected for promo codes endpoint');
        return res.status(500).json({ error: 'Database connection not available' });
    }
    
    try {
        const { ObjectId } = require('mongodb');
        const promoCollection = db.collection('promo_codes');
        
        const result = await promoCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Promo code not found' });
        }
        
        debugLog('Promo code deleted successfully', { promoId: req.params.id });
        res.json({ message: 'Promo code deleted successfully', deleted: true });
    } catch (error) {
        debugLog('Error deleting promo code', { error: error.message, promoId: req.params.id });
        res.status(500).json({ error: 'Failed to delete promo code', details: error.message });
    }
});

// Dashboard Statistics API Endpoint
app.get('/api/dashboard/stats', async (req, res) => {
    debugLog('GET /api/dashboard/stats called');
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for dashboard stats - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for dashboard stats');
                return res.json({
                    totalUsers: 0,
                    activeUsers: 0,
                    bannedUsers: 0,
                    totalBalance: 0,
                    totalTransactions: 0,
                    totalServers: 0,
                    totalApis: 0,
                    totalPromoCodes: 0
                });
            }
        }
        
        // Get user statistics
        const totalUsers = await collection.countDocuments({});
        const activeUsers = await collection.countDocuments({ is_banned: false });
        const bannedUsers = await collection.countDocuments({ is_banned: true });
        
        // Calculate total balance using aggregation
        const balanceResult = await collection.aggregate([
            { $group: { _id: null, total_balance: { $sum: '$balance' } } }
        ]).toArray();
        const totalBalance = balanceResult.length > 0 ? balanceResult[0].total_balance : 0;
        
        // Calculate total transactions using aggregation
        const transactionResult = await collection.aggregate([
            { $unwind: '$transactions' },
            { $group: { _id: null, total_transactions: { $sum: 1 } } }
        ]).toArray();
        const totalTransactions = transactionResult.length > 0 ? transactionResult[0].total_transactions : 0;
        
        // Get server statistics
        const serversCollection = db.collection('servers');
        const totalServers = await serversCollection.countDocuments({});
        
        // Get API statistics
        const apisCollection = db.collection('apis');
        const totalApis = await apisCollection.countDocuments({});
        
        // Get promo code statistics
        const promoCollection = db.collection('promo_codes');
        const totalPromoCodes = await promoCollection.countDocuments({});
        
        const stats = {
            totalUsers,
            activeUsers,
            bannedUsers,
            totalBalance,
            totalTransactions,
            totalServers,
            totalApis,
            totalPromoCodes
        };
        
        debugLog('Dashboard statistics calculated successfully', stats);
        res.json(stats);
    } catch (error) {
        debugLog('Error getting dashboard statistics', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to load dashboard statistics', details: error.message });
    }
});

// Services API Endpoint (for OTP services)
app.get('/api/services', async (req, res) => {
    debugLog('GET /api/services called');
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for services endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for services endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const apisCollection = db.collection('apis');
        const services = await apisCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        // Format services for the dashboard
        const formattedServices = services.map(service => ({
            id: service._id,
            name: service.name,
            serverId: service.serverId,
            status: service.status || 'inactive',
            numbersUsed: service.numbersUsed || 0,
            responseType: service.responseType,
            statusCheckType: service.statusCheckType,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt
        }));
        
        debugLog(`Retrieved ${formattedServices.length} services`);
        res.json(formattedServices);
    } catch (error) {
        debugLog('Error retrieving services', { error: error.message, stack: error.stack });
        console.error('Error in GET /api/services:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve services', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

// Basic Services Management (for dashboard/admin panel)
app.post('/api/basic-services', async (req, res) => {
    debugLog('POST /api/basic-services called', { body: req.body });
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for basic services endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for basic services endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const { serverId, serviceId, name, logo, code, description, price, cancellationTime } = req.body;
        
        // Validation
        if (!serverId || !serviceId || !name || !logo || !code || !description || !price) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                message: 'Please fill in all required fields: serverId, serviceId, name, logo, code, description, price' 
            });
        }
        
        // Check if service code already exists
        const basicServicesCollection = db.collection('basic_services');
        const existingService = await basicServicesCollection.findOne({ code: code });
        if (existingService) {
            return res.status(400).json({ 
                error: 'Service code already exists',
                message: 'A service with this code already exists. Please use a different code.' 
            });
        }
        
        const newService = {
            serverId,
            serviceId,
            name,
            logo,
            code,
            description,
            price: parseFloat(price),
            cancellationTime: parseInt(cancellationTime) || 0,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await basicServicesCollection.insertOne(newService);
        newService._id = result.insertedId;
        
        debugLog('Basic service created successfully', { serviceId: result.insertedId });
        res.status(201).json(newService);
    } catch (error) {
        debugLog('Error creating basic service', { error: error.message, stack: error.stack });
        console.error('Error in POST /api/basic-services:', error);
        res.status(500).json({ 
            error: 'Failed to create basic service', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

// Get all basic services
app.get('/api/basic-services', async (req, res) => {
    debugLog('GET /api/basic-services called');
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for basic services GET endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for basic services GET endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const basicServicesCollection = db.collection('basic_services');
        const services = await basicServicesCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        debugLog('Basic services retrieved successfully', { count: services.length });
        res.status(200).json(services);
    } catch (error) {
        debugLog('Error retrieving basic services', { error: error.message, stack: error.stack });
        console.error('Error in GET /api/basic-services:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve basic services', 
            details: error.message,
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

// API Services Management (existing endpoint for API configuration)
app.post('/api/services', async (req, res) => {
    debugLog('POST /api/services called', { body: req.body });
    
    try {
        // Check MongoDB connection
        if (!client || !client.topology || !client.topology.isConnected()) {
            debugLog('MongoDB not connected for services endpoint - attempting to reconnect...');
            const connected = await connectToMongoDB();
            if (!connected) {
                debugLog('❌ MongoDB reconnection failed for services endpoint');
                return res.status(500).json({ 
                    error: 'Database connection not available',
                    message: 'Please check your MongoDB connection settings'
                });
            }
        }
        
        const { name, serverId, responseType, statusCheckType, statusValue, getNumberUrl, getStatusUrl } = req.body;
        
        // Validation
        if (!name || !serverId || !responseType || !statusCheckType || !statusValue || !getNumberUrl || !getStatusUrl) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                message: 'Please fill in all required fields: name, serverId, responseType, statusCheckType, statusValue, getNumberUrl, getStatusUrl' 
            });
        }
        
        // Check if service name already exists
        const apisCollection = db.collection('apis');
        const existingService = await apisCollection.findOne({ name: name });
        if (existingService) {
            return res.status(400).json({ 
                error: 'Service name already exists',
                message: 'A service with this name already exists. Please use a different name.' 
            });
        }
        
        const newService = {
            name,
            serverId,
            responseType,
            statusCheckType,
            statusValue,
            getNumberUrl,
            getStatusUrl,
            status: 'inactive',
            numbersUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await apisCollection.insertOne(newService);
        newService._id = result.insertedId;
        
        debugLog('Service created successfully', { serviceId: result.insertedId });
        res.status(201).json(newService);
    } catch (error) {
        debugLog('Error creating service', { error: error.message, stack: error.stack });
        console.error('Error in POST /api/services:', error);
        res.status(500).json({ 
            error: 'Failed to create service', 
            message: 'Please check your MongoDB connection and try again'
        });
    }
});

app.use((err, req, res, next) => {
    debugLog('Unhandled error occurred', { 
        error: err.message, 
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.use((req, res, next) => {
    // Fallback: try to serve static file from website root for unmatched routes
    const requestedPath = req.path.endsWith('/') ? req.path + 'index.html' : req.path;
    const filePath = path.join(__dirname, '..', requestedPath);
    res.sendFile(filePath, (err) => {
        if (err) {
            debugLog('404 Not Found', { path: req.path, method: req.method });
            res.status(404).json({ error: 'Not found', path: req.path });
        }
    });
});

// Startup logging and MongoDB connection
debugLog('API server initializing', {
    port: PORT,
    debugMode: DEBUG_MODE,
    environment: process.env.NODE_ENV || 'unknown',
    vercel: !!process.env.VERCEL,
    mongodb: {
        uri: MONGODB_URI,
        database: MONGODB_DATABASE,
        collection: MONGODB_COLLECTION
    }
});

// Connect to MongoDB on startup
connectToMongoDB().then(success => {
    if (success) {
        debugLog('✅ MongoDB connected successfully on startup');
    } else {
        debugLog('❌ MongoDB connection failed on startup');
    }
});

// Start the server if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`🌐 Local URL: http://localhost:${PORT}`);
        console.log(`🔧 Debug Mode: ${DEBUG_MODE ? 'Enabled' : 'Disabled'}`);
        console.log(`🗄️ MongoDB: ${MONGODB_URI}/${MONGODB_DATABASE}/${MONGODB_COLLECTION}`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    debugLog('Shutting down server...');
    if (client) {
        await client.close();
        debugLog('MongoDB connection closed');
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    debugLog('Shutting down server...');
    if (client) {
        await client.close();
        debugLog('MongoDB connection closed');
    }
    process.exit(0);
});

module.exports = app;
 