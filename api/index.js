// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'otp_bot';

let client = null;
let db = null;

// MongoDB connection function
async function connectToMongoDB() {
    try {
        if (client && client.topology && client.topology.isConnected()) {
            return true;
        }
        
        client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            maxPoolSize: 10
        });
        
        await client.connect();
        db = client.db(MONGODB_DATABASE);
        
        // Create collections if they don't exist
        await db.createCollection('servers');
        await db.createCollection('services');
        await db.createCollection('apis');
        await db.createCollection('orders');
        
        console.log('✅ MongoDB connected successfully');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
}

app.use(cors());
app.use(express.json());

// Add cache-busting middleware for development
app.use((req, res, next) => {
    // Disable caching for HTML files in development
    if (req.path.endsWith('.html') || req.path === '/') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

app.use(express.static(path.join(__dirname, '..')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        mongodb: {
            connected: !!client && client.topology && client.topology.isConnected()
        }
    });
});

// Dashboard statistics endpoint
app.get('/api/statistics', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const serversCollection = db.collection('servers');
        const servicesCollection = db.collection('services');
        const ordersCollection = db.collection('orders');
        
        const totalServers = await serversCollection.countDocuments({});
        const totalServices = await servicesCollection.countDocuments({});
        const totalOrders = await ordersCollection.countDocuments({});
        
        // Calculate today's earnings from completed orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayOrders = await ordersCollection.find({
            createdAt: { $gte: today, $lt: tomorrow },
            status: 'completed'
        }).toArray();
        
        const todayEarnings = todayOrders.reduce((total, order) => total + (order.amount || 0), 0);
        
        // Calculate total revenue from all completed orders
        const completedOrders = await ordersCollection.find({ status: 'completed' }).toArray();
        const totalRevenue = completedOrders.reduce((total, order) => total + (order.amount || 0), 0);
        
        // Get total unique users from orders
        const uniqueUsers = await ordersCollection.distinct('userName');
        const totalUsers = uniqueUsers.length;
        
        // Find popular service based on order count
        const serviceStats = await ordersCollection.aggregate([
            { $group: { _id: '$serviceName', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]).toArray();
        
        const popularService = serviceStats.length > 0 ? serviceStats[0]._id : 'No orders yet';
        
        // Get user statistics
        const usersCollection = db.collection('users');
        const totalUsersCount = await usersCollection.countDocuments({});
        const activeUsersCount = await usersCollection.countDocuments({ status: 'active' });
        const bannedUsersCount = await usersCollection.countDocuments({ status: 'banned' });
        
        // Calculate total balance from all users
        const usersWithBalance = await usersCollection.find({}, { balance: 1 }).toArray();
        const totalBalance = usersWithBalance.reduce((sum, user) => sum + (user.balance || 0), 0);
        
        res.json({
            todayEarnings,
            totalUsers,
            numbersSold: totalOrders,
            popularService,
            totalRevenue,
            // Additional user statistics
            activeUsers: activeUsersCount,
            bannedUsers: bannedUsersCount,
            totalBalance: totalBalance
        });
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({ error: 'Failed to load statistics' });
    }
});

// Dashboard data endpoint
app.get('/api/dashboard', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const ordersCollection = db.collection('orders');
        const recentOrders = await ordersCollection.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();
        
        // Calculate today's earnings from completed orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayOrders = await ordersCollection.find({
            createdAt: { $gte: today, $lt: tomorrow },
            status: 'completed'
        }).toArray();
        
        const todayEarnings = todayOrders.reduce((total, order) => total + (order.amount || 0), 0);
        
        // Get total unique users from orders
        const uniqueUsers = await ordersCollection.distinct('userName');
        const totalUsers = uniqueUsers.length;
        
        // Get total orders count
        const numbersSold = await ordersCollection.countDocuments({});
        
        // Calculate total revenue from all completed orders
        const completedOrders = await ordersCollection.find({ status: 'completed' }).toArray();
        const totalRevenue = completedOrders.reduce((total, order) => total + (order.amount || 0), 0);
        
        res.json({
            todayEarnings,
            totalUsers,
            numbersSold,
            totalRevenue,
            recentOrders: recentOrders.map(order => ({
                id: order._id,
                service: order.serviceName,
                user: order.userName,
                amount: order.amount,
                status: order.status,
                date: order.createdAt
            }))
        });
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

// Servers API endpoints
app.get('/api/servers', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const serversCollection = db.collection('servers');
        const servers = await serversCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.json(servers);
    } catch (error) {
        console.error('Error getting servers:', error);
        res.status(500).json({ error: 'Failed to load servers' });
    }
});

app.post('/api/servers', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { serverName, countryCode, status } = req.body;
        
        if (!serverName || !countryCode || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const serversCollection = db.collection('servers');
        const newServer = {
            countryName: 'India',
            countryFlag: '🇮🇳',
            serverName,
            countryCode,
            status,
            availableNumbers: Math.floor(Math.random() * 100) + 50,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await serversCollection.insertOne(newServer);
        newServer._id = result.insertedId;
        
        res.status(201).json(newServer);
    } catch (error) {
        console.error('Error creating server:', error);
        res.status(500).json({ error: 'Failed to create server' });
    }
});

app.get('/api/servers/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { ObjectId } = require('mongodb');
        const serversCollection = db.collection('servers');
        const server = await serversCollection.findOne({ _id: new ObjectId(id) });
        
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        res.json(server);
    } catch (error) {
        console.error('Error getting server:', error);
        res.status(500).json({ error: 'Failed to load server' });
    }
});

app.put('/api/servers/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { serverName, countryCode, status } = req.body;
        
        if (!serverName || !countryCode || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const { ObjectId } = require('mongodb');
        const serversCollection = db.collection('servers');
        
        const result = await serversCollection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    serverName, 
                    countryCode, 
                    status, 
                    updatedAt: new Date() 
                } 
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        res.json({ message: 'Server updated successfully' });
    } catch (error) {
        console.error('Error updating server:', error);
        res.status(500).json({ error: 'Failed to update server' });
    }
});

app.delete('/api/servers/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { ObjectId } = require('mongodb');
        const serversCollection = db.collection('servers');
        
        const result = await serversCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        res.json({ message: 'Server deleted successfully' });
    } catch (error) {
        console.error('Error deleting server:', error);
        res.status(500).json({ error: 'Failed to delete server' });
    }
});

// Services API endpoints
app.get('/api/services', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const servicesCollection = db.collection('services');
        const services = await servicesCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.json(services);
    } catch (error) {
        console.error('Error getting services:', error);
        res.status(500).json({ error: 'Failed to load services' });
    }
});

app.post('/api/services', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { serviceName, serviceCode, price, description, serverId, status } = req.body;
        
        if (!serviceName || !serviceCode || !price || !description || !serverId || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const servicesCollection = db.collection('services');
        const newService = {
            serviceName,
            serviceCode,
            price: parseFloat(price),
            description,
            serverId,
            status,
            logo: '📱',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await servicesCollection.insertOne(newService);
        newService._id = result.insertedId;
        
        res.status(201).json(newService);
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

app.get('/api/services/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { ObjectId } = require('mongodb');
        const servicesCollection = db.collection('services');
        const service = await servicesCollection.findOne({ _id: new ObjectId(id) });
        
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        res.json(service);
    } catch (error) {
        console.error('Error getting service:', error);
        res.status(500).json({ error: 'Failed to load service' });
    }
});

app.put('/api/services/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { serviceName, serviceCode, price, description, serverId, status } = req.body;
        
        if (!serviceName || !serviceCode || !price || !description || !serverId || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const { ObjectId } = require('mongodb');
        const servicesCollection = db.collection('services');
        
        const result = await servicesCollection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    serviceName, 
                    serviceCode, 
                    price: parseFloat(price), 
                    description, 
                    serverId, 
                    status, 
                    updatedAt: new Date() 
                } 
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        res.json({ message: 'Service updated successfully' });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

app.delete('/api/services/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { ObjectId } = require('mongodb');
        const servicesCollection = db.collection('services');
        
        const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

// APIs API endpoints
app.get('/api/apis', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const apisCollection = db.collection('apis');
        const apis = await apisCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.json(apis);
    } catch (error) {
        console.error('Error getting APIs:', error);
        res.status(500).json({ error: 'Failed to load APIs' });
    }
});

app.post('/api/apis', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { providerName, providerUrl, apiKey, getNumbersUrl, getSmsUrl, responseFormat, status } = req.body;
        
        if (!providerName || !providerUrl || !apiKey || !getNumbersUrl || !getSmsUrl || !responseFormat || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const apisCollection = db.collection('apis');
        const newApi = {
            providerName,
            providerUrl,
            apiKey,
            getNumbersUrl,
            getSmsUrl,
            responseFormat,
            status,
            balance: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await apisCollection.insertOne(newApi);
        newApi._id = result.insertedId;
        
        res.status(201).json(newApi);
    } catch (error) {
        console.error('Error creating API:', error);
        res.status(500).json({ error: 'Failed to create API' });
    }
});

app.get('/api/apis/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { ObjectId } = require('mongodb');
        const apisCollection = db.collection('apis');
        const api = await apisCollection.findOne({ _id: new ObjectId(id) });
        
        if (!api) {
            return res.status(404).json({ error: 'API not found' });
        }
        
        res.json(api);
    } catch (error) {
        console.error('Error getting API:', error);
        res.status(500).json({ error: 'Failed to load API' });
    }
});

app.put('/api/apis/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { providerName, providerUrl, apiKey, getNumbersUrl, getSmsUrl, responseFormat, status } = req.body;
        
        if (!providerName || !providerUrl || !apiKey || !getNumbersUrl || !getSmsUrl || !responseFormat || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const { ObjectId } = require('mongodb');
        const apisCollection = db.collection('apis');
        
        const result = await apisCollection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    providerName, 
                    providerUrl, 
                    apiKey, 
                    getNumbersUrl, 
                    getSmsUrl, 
                    responseFormat, 
                    status, 
                    updatedAt: new Date() 
                } 
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'API not found' });
        }
        
        res.json({ message: 'API updated successfully' });
    } catch (error) {
        console.error('Error updating API:', error);
        res.status(500).json({ error: 'Failed to update API' });
    }
});

app.delete('/api/apis/:id', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { id } = req.params;
        const { ObjectId } = require('mongodb');
        const apisCollection = db.collection('apis');
        
        const result = await apisCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'API not found' });
        }
        
        res.json({ message: 'API deleted successfully' });
    } catch (error) {
        console.error('Error deleting API:', error);
        res.status(500).json({ error: 'Failed to delete API' });
    }
});

// Orders API endpoints
app.get('/api/orders', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const ordersCollection = db.collection('orders');
        const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.json(orders);
    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

// User Management API Endpoints
app.get('/api/users', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const usersCollection = db.collection('users');
        const users = await usersCollection.find({}).toArray();
        
        // Transform users to match the frontend expectations
        const transformedUsers = users.map(user => ({
            id: user.user_id || user._id,
            name: user.first_name || user.name || 'Unknown',
            username: user.username || `@user${user.user_id || user._id}`,
            balance: user.balance || 0,
            status: user.status || 'active',
            registration_date: user.created_at || user.registration_date || new Date(),
            last_activity: user.last_activity || user.updated_at || new Date()
        }));
        
        res.json(transformedUsers);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

app.post('/api/add_balance', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { user_id, amount, admin_id } = req.body;
        
        if (!user_id || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid parameters' });
        }
        
        const usersCollection = db.collection('users');
        const result = await usersCollection.updateOne(
            { user_id: parseInt(user_id) },
            { $inc: { balance: parseFloat(amount) } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Log the transaction
        const transactionsCollection = db.collection('transactions');
        await transactionsCollection.insertOne({
            user_id: parseInt(user_id),
            admin_id: admin_id || 7574316340,
            type: 'add_balance',
            amount: parseFloat(amount),
            description: `Balance added by admin`,
            created_at: new Date()
        });
        
        res.json({ success: true, message: 'Balance added successfully' });
    } catch (error) {
        console.error('Error adding balance:', error);
        res.status(500).json({ success: false, message: 'Failed to add balance' });
    }
});

app.post('/api/cut_balance', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { user_id, amount, admin_id } = req.body;
        
        if (!user_id || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid parameters' });
        }
        
        const usersCollection = db.collection('users');
        const result = await usersCollection.updateOne(
            { user_id: parseInt(user_id) },
            { $inc: { balance: -parseFloat(amount) } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Log the transaction
        const transactionsCollection = db.collection('transactions');
        await transactionsCollection.insertOne({
            user_id: parseInt(user_id),
            admin_id: admin_id || 7574316340,
            type: 'cut_balance',
            amount: parseFloat(amount),
            description: `Balance cut by admin`,
            created_at: new Date()
        });
        
        res.json({ success: true, message: 'Balance cut successfully' });
    } catch (error) {
        console.error('Error cutting balance:', error);
        res.status(500).json({ success: false, message: 'Failed to cut balance' });
    }
});

app.post('/api/update_user', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { user_id, balance, first_name, admin_id } = req.body;
        
        if (!user_id || balance === undefined) {
            return res.status(400).json({ success: false, message: 'Invalid parameters' });
        }
        
        const usersCollection = db.collection('users');
        const updateData = { balance: parseFloat(balance) };
        
        if (first_name) {
            updateData.first_name = first_name;
        }
        
        const result = await usersCollection.updateOne(
            { user_id: parseInt(user_id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Log the transaction
        const transactionsCollection = db.collection('transactions');
        await transactionsCollection.insertOne({
            user_id: parseInt(user_id),
            admin_id: admin_id || 7574316340,
            type: 'update_balance',
            amount: parseFloat(balance),
            description: `Balance updated by admin`,
            created_at: new Date()
        });
        
        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

app.post('/api/ban_user', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { user_id, reason, admin_id } = req.body;
        
        if (!user_id || !reason) {
            return res.status(400).json({ success: false, message: 'Invalid parameters' });
        }
        
        const usersCollection = db.collection('users');
        const result = await usersCollection.updateOne(
            { user_id: parseInt(user_id) },
            { 
                $set: { 
                    status: 'banned',
                    ban_reason: reason,
                    banned_at: new Date(),
                    banned_by: admin_id || 7574316340
                }
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Log the action
        const transactionsCollection = db.collection('transactions');
        await transactionsCollection.insertOne({
            user_id: parseInt(user_id),
            admin_id: admin_id || 7574316340,
            type: 'ban_user',
            amount: 0,
            description: `User banned: ${reason}`,
            created_at: new Date()
        });
        
        res.json({ success: true, message: 'User banned successfully' });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ success: false, message: 'Failed to ban user' });
    }
});

app.post('/api/unban_user', async (req, res) => {
    try {
        if (!db) {
            await connectToMongoDB();
        }
        
        const { user_id, admin_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'Invalid parameters' });
        }
        
        const usersCollection = db.collection('users');
        const result = await usersCollection.updateOne(
            { user_id: parseInt(user_id) },
            { 
                $set: { 
                    status: 'active',
                    unbanned_at: new Date(),
                    unbanned_by: admin_id || 7574316340
                },
                $unset: { ban_reason: "", banned_at: "", banned_by: "" }
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Log the action
        const transactionsCollection = db.collection('transactions');
        await transactionsCollection.insertOne({
            user_id: parseInt(user_id),
            admin_id: admin_id || 7574316340,
            type: 'unban_user',
            amount: 0,
            description: `User unbanned`,
            created_at: new Date()
        });
        
        res.json({ success: true, message: 'User unbanned successfully' });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ success: false, message: 'Failed to unban user' });
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

app.get('/api-config', (req, res) => {
    res.sendFile(path.join(__dirname, '../api-config/index.html'));
});

app.get('/api-config/connection', (req, res) => {
    res.sendFile(path.join(__dirname, '../api-config/api-connection.html'));
});

// Connect to MongoDB on startup
connectToMongoDB().then(success => {
    if (success) {
        console.log('✅ MongoDB connected successfully on startup');
    } else {
        console.log('❌ MongoDB connection failed on startup');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`🗄️ MongoDB: ${MONGODB_URI}/${MONGODB_DATABASE}`);
});

module.exports = app;
 