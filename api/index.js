const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const USER_DATA_FILE = path.join(__dirname, '../data/user_data.json');

async function loadUsers() {
    try {
        const data = await fs.readFile(USER_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        return {};
    }
}

async function saveUsers(users) {
    try {
        const dataDir = path.dirname(USER_DATA_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(USER_DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/users', async (req, res) => {
    try {
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
        res.json(formattedUsers);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
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
        res.json(allTransactions);
    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ error: 'Failed to load transactions' });
    }
});

app.get('/api/statistics', async (req, res) => {
    try {
        const users = await loadUsers();
        const userList = Object.values(users);
        
        const totalUsers = userList.length;
        const activeUsers = userList.filter(user => !user.is_banned).length;
        const bannedUsers = userList.filter(user => user.is_banned).length;
        const totalBalance = userList.reduce((sum, user) => sum + (user.balance || 0), 0);
        const totalTransactions = userList.reduce((sum, user) => sum + (user.transactions?.length || 0), 0);
        
        res.json({
            totalUsers,
            activeUsers,
            bannedUsers,
            totalBalance,
            totalTransactions
        });
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({ error: 'Failed to load statistics' });
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
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

module.exports = app;
