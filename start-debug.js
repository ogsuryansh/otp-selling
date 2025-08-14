#!/usr/bin/env node

/**
 * Debug Startup Script for OTP Bot Website
 * This script helps troubleshoot MongoDB connection issues
 */

const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'otp_bot';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'users';

console.log('🔍 OTP Bot Website - MongoDB Connection Debug');
console.log('=============================================');
console.log('');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   MONGODB_URI: ${MONGODB_URI ? '✅ Set' : '❌ Not Set'}`);
console.log(`   MONGODB_DATABASE: ${MONGODB_DATABASE}`);
console.log(`   MONGODB_COLLECTION: ${MONGODB_COLLECTION}`);
console.log('');

if (!MONGODB_URI) {
    console.log('❌ MONGODB_URI is not set!');
    console.log('');
    console.log('📝 To fix this:');
    console.log('   1. Copy env_example.txt to .env');
    console.log('   2. Update the MONGODB_URI with your actual MongoDB connection string');
    console.log('   3. Make sure your MongoDB Atlas cluster is running');
    console.log('');
    process.exit(1);
}

// Test MongoDB connection
async function testMongoDBConnection() {
    console.log('🔌 Testing MongoDB Connection...');
    console.log('');
    
    try {
        const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10
        });
        
        console.log('   Connecting to MongoDB...');
        await client.connect();
        console.log('   ✅ Connected to MongoDB successfully!');
        
        const db = client.db(MONGODB_DATABASE);
        console.log(`   ✅ Database '${MONGODB_DATABASE}' accessible`);
        
        // Test collection access
        const collection = db.collection(MONGODB_COLLECTION);
        const count = await collection.countDocuments({});
        console.log(`   ✅ Collection '${MONGODB_COLLECTION}' accessible (${count} documents)`);
        
        // Test servers collection
        const serversCollection = db.collection('servers');
        const serverCount = await serversCollection.countDocuments({});
        console.log(`   ✅ Collection 'servers' accessible (${serverCount} servers)`);
        
        await client.close();
        console.log('   ✅ Connection closed successfully');
        console.log('');
        console.log('🎉 MongoDB connection test passed! Your API should work now.');
        console.log('');
        console.log('🚀 To start the server:');
        console.log('   npm run local');
        console.log('   or');
        console.log('   node api/index.js');
        
    } catch (error) {
        console.log('   ❌ MongoDB connection failed!');
        console.log(`   Error: ${error.message}`);
        console.log('');
        console.log('🔧 Troubleshooting steps:');
        console.log('   1. Check if your MongoDB Atlas cluster is running');
        console.log('   2. Verify your connection string is correct');
        console.log('   3. Check if your IP is whitelisted in MongoDB Atlas');
        console.log('   4. Verify your username/password are correct');
        console.log('   5. Check if the database name exists');
        console.log('');
        console.log('📖 For more help, check:');
        console.log('   - MONGODB_SETUP_GUIDE.md');
        console.log('   - MongoDB Atlas documentation');
        console.log('');
        process.exit(1);
    }
}

// Run the test
testMongoDBConnection();
