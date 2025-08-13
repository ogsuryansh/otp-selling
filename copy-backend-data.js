#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function copyBackendData() {
    const backendDataFile = path.join(__dirname, '../backend/user_data.json');
    const websiteDataFile = path.join(__dirname, 'data/user_data.json');
    
    console.log('🔄 Copying backend data to website...');
    console.log(`📁 From: ${backendDataFile}`);
    console.log(`📁 To: ${websiteDataFile}`);
    
    try {
        // Check if backend file exists
        try {
            await fs.access(backendDataFile);
            console.log('✅ Backend data file found');
        } catch (error) {
            console.log('❌ Backend data file not found, creating empty data');
            const emptyData = {};
            await fs.mkdir(path.dirname(websiteDataFile), { recursive: true });
            await fs.writeFile(websiteDataFile, JSON.stringify(emptyData, null, 2));
            console.log('✅ Created empty data file');
            return;
        }
        
        // Read backend data
        const data = await fs.readFile(backendDataFile, 'utf8');
        const users = JSON.parse(data);
        console.log(`📊 Found ${Object.keys(users).length} users in backend data`);
        
        // Ensure website data directory exists
        await fs.mkdir(path.dirname(websiteDataFile), { recursive: true });
        
        // Copy to website
        await fs.writeFile(websiteDataFile, JSON.stringify(users, null, 2));
        console.log('✅ Data copied successfully');
        
        // Verify the copy
        const copiedData = await fs.readFile(websiteDataFile, 'utf8');
        const copiedUsers = JSON.parse(copiedData);
        console.log(`✅ Verified: ${Object.keys(copiedUsers).length} users copied`);
        
    } catch (error) {
        console.error('❌ Error copying data:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    copyBackendData();
}

module.exports = copyBackendData;
