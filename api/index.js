// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// Debug logging middleware
app.use((req, res, next) => {
    console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`📝 Request Headers:`, req.headers);
    console.log(`📄 Request Body:`, req.body);
    next();
});

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/otp_bot';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'otp_bot';

// Debug environment variables
console.log('🔧 Environment Debug:');
console.log('📝 MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('📝 MONGODB_DATABASE:', process.env.MONGODB_DATABASE);
console.log('📝 NODE_ENV:', process.env.NODE_ENV);
console.log('📝 Actual URI:', MONGODB_URI);

let client = null;
let db = null;



// MongoDB connection function
async function connectToMongoDB() {
    try {
        if (client && client.topology && client.topology.isConnected()) {
            return true;
        }
        
        console.log('🔗 Attempting to connect to MongoDB...');
        console.log('📝 MongoDB URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        console.log('🗄️ Database:', MONGODB_DATABASE);
        
        // Check if we have a valid MongoDB URI
        if (!MONGODB_URI || MONGODB_URI.includes('localhost')) {
            console.log('⚠️ Invalid MongoDB URI - will use mock data');
            return false;
        }
        
        client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Reduced timeout for faster failure
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        });
        
        await client.connect();
        db = client.db(MONGODB_DATABASE);
        
        // Test the connection
        await db.admin().ping();
        
        // Create collections if they don't exist
        await db.createCollection('servers');
        await db.createCollection('services');
        await db.createCollection('apis');
        await db.createCollection('orders');
        await db.createCollection('users');
        await db.createCollection('transactions');
        await db.createCollection('promo_codes');
        
        console.log('✅ MongoDB connected successfully');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('🔍 Full error:', error);
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

// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('🧪 Test endpoint called');
    res.json({ 
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mongodb_connected: !!client && client.topology && client.topology.isConnected(),
        using_mock_data: !client || !client.topology || !client.topology.isConnected()
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check endpoint called');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        mongodb: {
            connected: !!client && client.topology && client.topology.isConnected(),
            using_mock_data: !client || !client.topology || !client.topology.isConnected()
        },
        environment: {
            node_env: process.env.NODE_ENV,
            mongodb_uri: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
            mongodb_database: process.env.MONGODB_DATABASE
        }
    });
});

// Dashboard statistics endpoint
app.get('/api/statistics', async (req, res) => {
    console.log('📊 Statistics endpoint called');
    try {
        if (!db) {
            console.log('🔄 Connecting to MongoDB...');
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
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
        
        console.log('📊 Statistics data:', {
            todayEarnings,
            totalUsers,
            numbersSold: totalOrders,
            popularService,
            totalRevenue,
            activeUsers: activeUsersCount,
            bannedUsers: bannedUsersCount,
            totalBalance: totalBalance
        });
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
        console.error('❌ Error getting statistics:', error);
        res.status(500).json({ error: 'Failed to load statistics' });
    }
});

// Dashboard data endpoint
app.get('/api/dashboard', async (req, res) => {
    try {
        if (!db) {
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
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
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
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
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
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
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available, returning mock APIs data');
                return res.json([]);
            }
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
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
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
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
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

// Transactions endpoint
app.get('/api/transactions', async (req, res) => {
    try {
        if (!db) { 
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
        }
        
        // Get transactions from multiple collections to show comprehensive bot activity
        const transactionsCollection = db.collection('transactions');
        const usersCollection = db.collection('users');
        const ordersCollection = db.collection('orders');
        
        // Get all transactions
        const transactions = await transactionsCollection.find({}).sort({ created_at: -1 }).limit(100).toArray();
        
        // Get user data for transactions
        const userIds = [...new Set(transactions.map(t => t.user_id))];
        const users = await usersCollection.find({ user_id: { $in: userIds } }).toArray();
        const userMap = users.reduce((map, user) => {
            map[user.user_id] = user;
            return map;
        }, {});
        
        // Enhance transactions with user data and proper formatting
        const enhancedTransactions = transactions.map(txn => {
            const user = userMap[txn.user_id] || {};
            return {
                id: txn._id || txn.id || `TXN${txn.user_id}${Date.now()}`,
                user_id: txn.user_id,
                user: user.first_name || user.username || `User ${txn.user_id}`,
                type: txn.type || 'unknown',
                amount: txn.amount || 0,
                description: txn.description || txn.reason || 'Transaction',
                source: txn.source || 'unknown',
                admin_id: txn.admin_id,
                created_at: txn.created_at || txn.timestamp || new Date().toISOString(),
                status: txn.status || 'completed'
            };
        });
        
        res.json(enhancedTransactions);
    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ error: 'Failed to load transactions' });
    }
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        if (!db) { 
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
        }
        const usersCollection = db.collection('users');
        const ordersCollection = db.collection('orders');
        
        const totalUsers = await usersCollection.countDocuments({});
        const totalOrders = await ordersCollection.countDocuments({});
        
        // Calculate today's earnings
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayOrders = await ordersCollection.find({
            createdAt: { $gte: today, $lt: tomorrow },
            status: 'completed'
        }).toArray();
        
        const todayEarnings = todayOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
        
        res.json({
            totalUsers,
            totalOrders,
            todayEarnings,
            todayOrders: todayOrders.length
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Failed to load dashboard stats' });
    }
});

// OTP endpoints (placeholder responses)
app.get('/api/otp/statistics', async (req, res) => {
    res.json({
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalEarnings: 0
    });
});

app.get('/api/otp/orders', async (req, res) => {
    res.json([]);
});

app.get('/api/otp/orders/:id', async (req, res) => {
    res.json({});
});

app.post('/api/otp/orders/:id/cancel', async (req, res) => {
    res.json({ success: true });
});

app.post('/api/otp/orders/:id/finish', async (req, res) => {
    res.json({ success: true });
});

// Basic services endpoint
app.get('/api/basic-services', async (req, res) => {
    try {
        if (!db) { 
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available, returning mock basic services data');
                return res.json(mockData.services);
            }
        }
        const servicesCollection = db.collection('services');
        const services = await servicesCollection.find({}).toArray();
        res.json(services);
    } catch (error) {
        console.error('Error getting basic services:', error);
        res.status(500).json({ error: 'Failed to load services' });
    }
});

app.post('/api/basic-services', async (req, res) => {
    try {
        if (!db) { await connectToMongoDB(); }
        const servicesCollection = db.collection('services');
        const result = await servicesCollection.insertOne({
            ...req.body,
            createdAt: new Date()
        });
        res.json({ success: true, id: result.insertedId });
    } catch (error) {
        console.error('Error creating basic service:', error);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

// Promo codes endpoints
app.get('/api/promo-codes', async (req, res) => {
    try {
        if (!db) { 
            const connected = await connectToMongoDB();
            if (!connected) {
                console.log('⚠️ MongoDB not available');
                return res.status(500).json({ error: 'Database connection failed' });
            }
        }
        const promoCollection = db.collection('promo_codes');
        const promoCodes = await promoCollection.find({}).toArray();
        res.json(promoCodes);
    } catch (error) {
        console.error('Error getting promo codes:', error);
        res.status(500).json({ error: 'Failed to load promo codes' });
    }
});

app.post('/api/promo-codes', async (req, res) => {
    try {
        if (!db) { await connectToMongoDB(); }
        const promoCollection = db.collection('promo_codes');
        const result = await promoCollection.insertOne({
            ...req.body,
            createdAt: new Date()
        });
        res.json({ success: true, id: result.insertedId });
    } catch (error) {
        console.error('Error creating promo code:', error);
        res.status(500).json({ error: 'Failed to create promo code' });
    }
});

app.put('/api/promo-codes/:id', async (req, res) => {
    try {
        if (!db) { await connectToMongoDB(); }
        const promoCollection = db.collection('promo_codes');
        const result = await promoCollection.updateOne(
            { _id: req.params.id },
            { $set: { ...req.body, updatedAt: new Date() } }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating promo code:', error);
        res.status(500).json({ error: 'Failed to update promo code' });
    }
});

app.delete('/api/promo-codes/:id', async (req, res) => {
    try {
        if (!db) { await connectToMongoDB(); }
        const promoCollection = db.collection('promo_codes');
        await promoCollection.deleteOne({ _id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting promo code:', error);
        res.status(500).json({ error: 'Failed to delete promo code' });
    }
});

app.get('/api/promo-codes/:id', async (req, res) => {
    try {
        if (!db) { 
            const connected = await connectToMongoDB();
            if (!connected) {
                return res.status(500).json({ error: 'Database not available' });
            }
        }
        const promoCollection = db.collection('promo_codes');
        const { id } = req.params;
        const promoCode = await promoCollection.findOne({ _id: id });
        if (!promoCode) {
            return res.status(404).json({ error: 'Promo code not found' });
        }
        res.json(promoCode);
    } catch (error) {
        console.error('Error getting promo code:', error);
        res.status(500).json({ error: 'Failed to get promo code' });
    }
});

// Import endpoints
app.post('/api/import/file', async (req, res) => {
    try {
        res.json({ success: true, message: 'File import functionality not implemented yet' });
    } catch (error) {
        console.error('Error importing file:', error);
        res.status(500).json({ error: 'Failed to import file' });
    }
});

app.post('/api/import/url', async (req, res) => {
    try {
        res.json({ success: true, message: 'URL import functionality not implemented yet' });
    } catch (error) {
        console.error('Error importing from URL:', error);
        res.status(500).json({ error: 'Failed to import from URL' });
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

app.get('/test-api', (req, res) => {
    res.sendFile(path.join(__dirname, '../test-api.html'));
});

// Connect to MongoDB on startup
connectToMongoDB().then(success => {
    if (success) {
        console.log('✅ MongoDB connected successfully on startup');
    } else {
        console.log('❌ MongoDB connection failed on startup');
    }
});

// Catch-all route for debugging
app.use('*', (req, res) => {
    console.log('🚨 Catch-all route hit:', req.method, req.originalUrl);
    res.status(404).json({
        error: 'Route not found',
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Export the app for Vercel serverless functions
module.exports = app;
 