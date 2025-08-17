// Simple test to verify deployment works
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
    res.json({
        message: 'Deployment test successful',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
