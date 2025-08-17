const express = require('express');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET dashboard statistics
router.get('/stats', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Return default stats if database is not available
            return res.json(successResponse({
                totalUsers: 0,
                totalOrders: 0,
                activeServers: 0,
                todayEarnings: 0
            }));
        }
        
        // Get basic statistics
        const usersCount = await db.collection('users').countDocuments();
        const ordersCount = await db.collection('orders').countDocuments();
        const serversCount = await db.collection('servers').countDocuments({ status: 'active' });
        
        // Calculate today's earnings
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrders = await db.collection('orders').find({
            createdAt: { $gte: today },
            status: 'completed'
        }).toArray();
        
        const todayEarnings = todayOrders.reduce((total, order) => total + (parseFloat(order.amount) || 0), 0);
        
        const stats = {
            totalUsers: usersCount,
            totalOrders: ordersCount,
            activeServers: serversCount,
            todayEarnings: todayEarnings
        };
        
        res.json(successResponse(stats));
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        next(new AppError('Failed to fetch dashboard statistics', 500));
    }
});

module.exports = router;
