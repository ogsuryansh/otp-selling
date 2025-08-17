const { MongoClient } = require('mongodb');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/otp_bot';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'otp_bot';

let client = null;
let db = null;

// MongoDB connection function
async function connectToMongoDB() {
    try {
        if (client && client.topology && client.topology.isConnected()) {
            return { db, client };
        }
        
        client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        });
        
        await client.connect();
        db = client.db(MONGODB_DATABASE);
        
        // Test the connection
        await db.admin().ping();
        
        // Create collections if they don't exist
        const collections = ['servers', 'services', 'apis', 'orders', 'users', 'transactions', 'promo_codes'];
        for (const collectionName of collections) {
            try {
                await db.createCollection(collectionName);
            } catch (error) {
                // Collection might already exist, which is fine
                if (error.code !== 48) { // 48 is "collection already exists" error
                    console.warn(`Warning creating collection ${collectionName}:`, error.message);
                }
            }
        }
        
        return { db, client };
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        return { db: null, client: null };
    }
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

module.exports = {
    connectToMongoDB,
    getDatabase,
    getClient,
    isConnected,
    MONGODB_URI,
    MONGODB_DATABASE
};
