#!/usr/bin/env node

/**
 * Local Development Server
 * This script starts the API server locally for development
 */

const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Starting Local Development Server...');
console.log('📁 Working Directory:', process.cwd());
console.log('⏰ Started at:', new Date().toISOString());

// Set development environment
process.env.NODE_ENV = 'development';
process.env.DEBUG = 'true';

// Start the API server
const serverProcess = spawn('node', ['api/index.js'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
        ...process.env,
        PORT: process.env.PORT || 3000,
        NODE_ENV: 'development',
        DEBUG: 'true'
    }
});

// Handle server process events
serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
});

serverProcess.on('exit', (code) => {
    if (code !== 0) {
        console.error(`❌ Server exited with code ${code}`);
        process.exit(code);
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGTERM');
});

console.log('✅ Server process started');
console.log('🌐 Local URL: http://localhost:3000');
console.log('🔧 Debug Mode: Enabled');
console.log('📝 Press Ctrl+C to stop the server');
