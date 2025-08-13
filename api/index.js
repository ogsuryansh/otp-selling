const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced debugging and logging
const DEBUG_MODE = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
const REQUEST_LOG = [];

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
app.use(express.static(path.join(__dirname, '../public')));

// Try to read from backend data file first, fallback to local data file
const BACKEND_DATA_FILE = path.join(__dirname, '../../backend/user_data.json');
const LOCAL_DATA_FILE = path.join(__dirname, '../data/user_data.json');
const USER_DATA_FILE = BACKEND_DATA_FILE;

// Enhanced file operations with debugging
async function loadUsers() {
    try {
        debugLog('Attempting to load users from file', { 
            backendFile: BACKEND_DATA_FILE,
            localFile: LOCAL_DATA_FILE,
            usingFile: USER_DATA_FILE
        });
        
        // Try backend file first
        try {
            await fs.access(BACKEND_DATA_FILE);
            debugLog('Backend data file exists, using it');
            const data = await fs.readFile(BACKEND_DATA_FILE, 'utf8');
            const users = JSON.parse(data);
            debugLog('Users loaded from backend file successfully', { userCount: Object.keys(users).length });
            return users;
        } catch (backendError) {
            debugLog('Backend data file not accessible', { error: backendError.message });
            
            // Try local file as fallback
            try {
                await fs.access(LOCAL_DATA_FILE);
                debugLog('Local data file exists, using it as fallback');
                const data = await fs.readFile(LOCAL_DATA_FILE, 'utf8');
                const users = JSON.parse(data);
                debugLog('Users loaded from local file successfully', { userCount: Object.keys(users).length });
                return users;
            } catch (localError) {
                debugLog('Local data file also not accessible', { error: localError.message });
                debugLog('Creating empty data structure');
                return {};
            }
        }
    } catch (error) {
        debugLog('Error loading users', { error: error.message, stack: error.stack });
        return {};
    }
}

async function saveUsers(users) {
    try {
        debugLog('Attempting to save users', { userCount: Object.keys(users).length });
        
        // Try to save to backend file first
        try {
            const dataDir = path.dirname(BACKEND_DATA_FILE);
            await fs.mkdir(dataDir, { recursive: true });
            await fs.writeFile(BACKEND_DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
            debugLog('Users saved to backend file successfully');
            return true;
        } catch (backendError) {
            debugLog('Failed to save to backend file', { error: backendError.message });
            
            // Fallback to local file
            try {
                const dataDir = path.dirname(LOCAL_DATA_FILE);
                await fs.mkdir(dataDir, { recursive: true });
                await fs.writeFile(LOCAL_DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
                debugLog('Users saved to local file successfully');
                return true;
            } catch (localError) {
                debugLog('Failed to save to local file', { error: localError.message });
                return false;
            }
        }
    } catch (error) {
        debugLog('Error saving users', { error: error.message, stack: error.stack });
        return false;
    }
}

// Environment info endpoint
app.get('/api/debug/environment', (req, res) => {
    const envInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        nodeEnv: process.env.NODE_ENV || 'not set',
        port: PORT,
        debugMode: DEBUG_MODE,
        vercel: {
            isVercel: !!process.env.VERCEL,
            region: process.env.VERCEL_REGION || 'not set',
            environment: process.env.VERCEL_ENV || 'not set',
            url: process.env.VERCEL_URL || 'not set'
        },
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
            external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
        },
        uptime: Math.round(process.uptime()) + ' seconds',
        timestamp: new Date().toISOString()
    };
    
    debugLog('Environment info requested', envInfo);
    res.json(envInfo);
});

// Debug logs endpoint
app.get('/api/debug/logs', (req, res) => {
    const { limit = 50 } = req.query;
    const logs = REQUEST_LOG.slice(-parseInt(limit));
    debugLog('Debug logs requested', { requestedLimit: limit, returnedCount: logs.length });
    res.json(logs);
});

// File system debug endpoint
app.get('/api/debug/filesystem', async (req, res) => {
    try {
        const fsInfo = {
            currentDir: __dirname,
            backendDataFile: BACKEND_DATA_FILE,
            localDataFile: LOCAL_DATA_FILE,
            backendFileExists: false,
            backendFileSize: 0,
            localFileExists: false,
            localFileSize: 0,
            backendDirExists: false,
            localDirExists: false,
            backendDirContents: [],
            localDirContents: []
        };
        
        // Check backend data file
        try {
            const stats = await fs.stat(BACKEND_DATA_FILE);
            fsInfo.backendFileExists = true;
            fsInfo.backendFileSize = stats.size;
        } catch (error) {
            fsInfo.backendFileExists = false;
        }
        
        // Check local data file
        try {
            const stats = await fs.stat(LOCAL_DATA_FILE);
            fsInfo.localFileExists = true;
            fsInfo.localFileSize = stats.size;
        } catch (error) {
            fsInfo.localFileExists = false;
        }
        
        // Check backend directory
        const backendDir = path.dirname(BACKEND_DATA_FILE);
        try {
            const stats = await fs.stat(backendDir);
            fsInfo.backendDirExists = true;
            fsInfo.backendDirContents = await fs.readdir(backendDir);
        } catch (error) {
            fsInfo.backendDirExists = false;
        }
        
        // Check local directory
        const localDir = path.dirname(LOCAL_DATA_FILE);
        try {
            const stats = await fs.stat(localDir);
            fsInfo.localDirExists = true;
            fsInfo.localDirContents = await fs.readdir(localDir);
        } catch (error) {
            fsInfo.localDirExists = false;
        }
        
        debugLog('Filesystem info requested', fsInfo);
        res.json(fsInfo);
    } catch (error) {
        debugLog('Error getting filesystem info', { error: error.message });
        res.status(500).json({ error: 'Failed to get filesystem info', details: error.message });
    }
});

// Test data endpoint for debugging
app.get('/api/debug/test-data', async (req, res) => {
    try {
        debugLog('Test data generation requested');
        
        const testUsers = {
            "123456789": {
                user_id: 123456789,
                first_name: "Test User",
                username: "testuser",
                balance: 100.50,
                is_banned: false,
                registration_date: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                transactions: [
                    {
                        type: "test",
                        amount: 50.00,
                        description: "Test transaction",
                        timestamp: new Date().toISOString(),
                        balance_before: 50.50,
                        balance_after: 100.50
                    }
                ]
            }
        };
        
        const saved = await saveUsers(testUsers);
        debugLog('Test data saved', { success: saved });
        
        res.json({ 
            success: saved, 
            message: 'Test data generated and saved',
            testUser: testUsers["123456789"]
        });
    } catch (error) {
        debugLog('Error generating test data', { error: error.message });
        res.status(500).json({ error: 'Failed to generate test data', details: error.message });
    }
});

app.get('/', (req, res) => {
    debugLog('Root route accessed');
    try {
        // Try to serve admin panel
        res.sendFile(path.join(__dirname, '../admin_panel.html'));
    } catch (error) {
        debugLog('Error serving admin panel', error.message);
        res.json({ 
            message: 'OTP Bot Admin Panel API',
            endpoints: {
                health: '/api/health',
                test: '/api/test',
                users: '/api/users',
                statistics: '/api/statistics',
                transactions: '/api/transactions',
                debug: {
                    environment: '/api/debug/environment',
                    logs: '/api/debug/logs',
                    filesystem: '/api/debug/filesystem',
                    testData: '/api/debug/test-data'
                }
            },
            adminPanel: '/admin_panel.html',
            debugDashboard: '/debug-dashboard.html'
        });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        debugLog('Users endpoint called');
        const users = await loadUsers();
        const formattedUsers = Object.values(users).map(user => ({
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
        
        Object.values(users).forEach(user => {
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
        const users = await loadUsers();
        const userList = Object.values(users);
        
        const totalUsers = userList.length;
        const activeUsers = userList.filter(user => !user.is_banned).length;
        const bannedUsers = userList.filter(user => user.is_banned).length;
        const totalBalance = userList.reduce((sum, user) => sum + (user.balance || 0), 0);
        const totalTransactions = userList.reduce((sum, user) => sum + (user.transactions?.length || 0), 0);
        
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
        
        const users = await loadUsers();
        const userKey = user_id.toString();
        
        if (!users[userKey]) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const user = users[userKey];
        const oldBalance = user.balance || 0;
        user.balance = oldBalance + parseFloat(amount);
        
        if (!user.transactions) user.transactions = [];
        user.transactions.push({
            type: 'admin_action',
            amount: 0,
            description: `Admin added ${amount} 💎 to balance`,
            timestamp: new Date().toISOString(),
            balance_before: oldBalance,
            balance_after: user.balance,
            admin_id: admin_id || 7574316340
        });
        
        await saveUsers(users);
        res.json({ success: true, message: `Added ${amount} 💎 to user ${user_id}` });
    } catch (error) {
        console.error('Error adding balance:', error);
        res.status(500).json({ success: false, message: 'Failed to add balance' });
    }
});

app.post('/api/cut_balance', async (req, res) => {
    try {
        const { user_id, amount, admin_id } = req.body;
        
        if (!user_id || !amount) {
            return res.status(400).json({ success: false, message: 'User ID and amount are required' });
        }
        
        const users = await loadUsers();
        const userKey = user_id.toString();
        
        if (!users[userKey]) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const user = users[userKey];
        const oldBalance = user.balance || 0;
        const newBalance = oldBalance - parseFloat(amount);
        
        if (newBalance < 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient balance. User has ${oldBalance} 💎` 
            });
        }
        
        user.balance = newBalance;
        
        if (!user.transactions) user.transactions = [];
        user.transactions.push({
            type: 'admin_action',
            amount: 0,
            description: `Admin deducted ${amount} 💎 from balance`,
            timestamp: new Date().toISOString(),
            balance_before: oldBalance,
            balance_after: user.balance,
            admin_id: admin_id || 7574316340
        });
        
        await saveUsers(users);
        res.json({ success: true, message: `Deducted ${amount} 💎 from user ${user_id}` });
    } catch (error) {
        console.error('Error cutting balance:', error);
        res.status(500).json({ success: false, message: 'Failed to cut balance' });
    }
});

app.post('/api/ban_user', async (req, res) => {
    try {
        const { user_id, reason, admin_id } = req.body;
        
        if (!user_id || !reason) {
            return res.status(400).json({ success: false, message: 'User ID and reason are required' });
        }
        
        const users = await loadUsers();
        const userKey = user_id.toString();
        
        if (!users[userKey]) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const user = users[userKey];
        user.is_banned = true;
        user.ban_reason = reason;
        user.ban_date = new Date().toISOString();
        
        if (!user.transactions) user.transactions = [];
        user.transactions.push({
            type: 'admin_action',
            amount: 0,
            description: `User banned: ${reason}`,
            timestamp: new Date().toISOString(),
            balance_before: user.balance || 0,
            balance_after: user.balance || 0,
            admin_id: admin_id || 7574316340
        });
        
        await saveUsers(users);
        res.json({ success: true, message: `User ${user_id} banned successfully` });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ success: false, message: 'Failed to ban user' });
    }
});

app.post('/api/unban_user', async (req, res) => {
    try {
        const { user_id, admin_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        
        const users = await loadUsers();
        const userKey = user_id.toString();
        
        if (!users[userKey]) {
            return res.status(404).json({ success: false, message: `User ${user_id} not found` });
        }
        
        const user = users[userKey];
        user.is_banned = false;
        user.ban_reason = null;
        user.ban_date = null;
        
        if (!user.transactions) user.transactions = [];
        user.transactions.push({
            type: 'admin_action',
            amount: 0,
            description: 'User unbanned',
            timestamp: new Date().toISOString(),
            balance_before: user.balance || 0,
            balance_after: user.balance || 0,
            admin_id: admin_id || 7574316340
        });
        
        await saveUsers(users);
        res.json({ success: true, message: `User ${user_id} unbanned successfully` });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ success: false, message: 'Failed to unban user' });
    }
});

app.get('/api/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const users = await loadUsers();
        const user = users[user_id.toString()];
        
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
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Failed to load user' });
    }
});

app.get('/api/user/:user_id/transactions', async (req, res) => {
    try {
        const { user_id } = req.params;
        const users = await loadUsers();
        const user = users[user_id.toString()];
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user.transactions || []);
    } catch (error) {
        console.error('Error getting user transactions:', error);
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
        vercel: !!process.env.VERCEL
    });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    debugLog('Test endpoint called');
    res.json({ 
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        debug: DEBUG_MODE
    });
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

app.use((req, res) => {
    debugLog('404 Not Found', { path: req.path, method: req.method });
    res.status(404).json({ error: 'Not found', path: req.path });
});

// Startup logging
debugLog('API server initialized', {
    port: PORT,
    debugMode: DEBUG_MODE,
    environment: process.env.NODE_ENV || 'unknown',
    vercel: !!process.env.VERCEL,
    backendDataFile: BACKEND_DATA_FILE,
    localDataFile: LOCAL_DATA_FILE,
    usingFile: USER_DATA_FILE
});

// Start the server if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`🌐 Local URL: http://localhost:${PORT}`);
        console.log(`🔧 Debug Mode: ${DEBUG_MODE ? 'Enabled' : 'Disabled'}`);
        console.log(`📁 User Data File: ${USER_DATA_FILE}`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
    });
}

module.exports = app;
 