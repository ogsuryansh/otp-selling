const { MongoClient } = require('mongodb');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'otp_bot';

let client = null;
let db = null;
let connectionPromise = null;

// MongoDB connection function with improved error handling
async function connectToMongoDB() {
    try {
        // If no MongoDB URI is provided, return null (for development without DB)
        if (!MONGODB_URI) {
            console.warn('⚠️ MongoDB URI not configured, running without database');
            return { db: null, client: null };
        }
        
        // If already connected, return existing connection
        if (client && client.topology && client.topology.isConnected()) {
            return { db, client };
        }
        
        // If connection is in progress, wait for it
        if (connectionPromise) {
            return await connectionPromise;
        }
        
        // Start new connection
        connectionPromise = createConnection();
        const result = await connectionPromise;
        connectionPromise = null;
        return result;
        
    } catch (error) {
        connectionPromise = null;
        console.error('❌ MongoDB connection error:', error.message);
        return { db: null, client: null };
    }
}

async function createConnection() {
    const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
        w: 'majority'
    });
    
    await client.connect();
    const db = client.db(MONGODB_DATABASE);
    
    // Test the connection
    await db.admin().ping();
    
    // Create collections if they don't exist
    const collections = [
        'servers', 'services', 'apis', 'orders', 'users', 
        'transactions', 'promo_codes', 'promo_usage', 'otp_requests'
    ];
    
    for (const collectionName of collections) {
        try {
            await db.createCollection(collectionName);
        } catch (error) {
            // Collection might already exist, which is fine
            if (error.code !== 48) { // 48 is "collection already exists" error
                console.warn(`⚠️ Warning creating collection ${collectionName}:`, error.message);
            }
        }
    }
    
    // Create indexes for better performance
    try {
        await db.collection('users').createIndex({ user_id: 1 }, { unique: true });
        await db.collection('users').createIndex({ username: 1 });
        await db.collection('users').createIndex({ status: 1 });
        await db.collection('orders').createIndex({ user_id: 1 });
        await db.collection('orders').createIndex({ status: 1 });
        await db.collection('orders').createIndex({ createdAt: 1 });
        await db.collection('transactions').createIndex({ user_id: 1 });
        await db.collection('transactions').createIndex({ timestamp: 1 });
    } catch (error) {
        console.warn('⚠️ Warning creating indexes:', error.message);
    }
    
    return { db, client };
}

function getDatabase() {
    return db;
}

function getClient() {
    return client;
}

function isConnected() {
    return client && client.topology && client.topology.isConnected();
}

// Graceful shutdown
async function closeConnection() {
    if (client) {
        try {
            await client.close();
            console.log('✅ MongoDB connection closed');
        } catch (error) {
            console.error('❌ Error closing MongoDB connection:', error);
        }
    }
}

// Handle process termination
process.on('SIGINT', closeConnection);
process.on('SIGTERM', closeConnection);

module.exports = {
    connectToMongoDB,
    getDatabase,
    getClient,
    isConnected,
    closeConnection,
    MONGODB_URI,
    MONGODB_DATABASE
};
