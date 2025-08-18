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
                totalRevenue: 0,
                activeServers: 0,
                activeServices: 0,
                todayOrders: 0,
                todayRevenue: 0
            }));
        }
        
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Aggregate statistics
        const [userStats, orderStats, serverStats, serviceStats, todayStats] = await Promise.all([
            // User statistics
            db.collection('users').aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsers: { $sum: 1 },
                        activeUsers: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        }
                    }
                }
            ]).toArray(),
            
            // Order statistics
            db.collection('orders').aggregate([
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$cost' },
                        completedOrders: {
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        }
                    }
                }
            ]).toArray(),
            
            // Server statistics
            db.collection('servers').aggregate([
                {
                    $group: {
                        _id: null,
                        totalServers: { $sum: 1 },
                        activeServers: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        }
                    }
                }
            ]).toArray(),
            
            // Service statistics
            db.collection('services').aggregate([
                {
                    $group: {
                        _id: null,
                        totalServices: { $sum: 1 },
                        activeServices: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        }
                    }
                }
            ]).toArray(),
            
            // Today's statistics
            db.collection('orders').aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: today,
                            $lt: tomorrow
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        todayOrders: { $sum: 1 },
                        todayRevenue: { $sum: '$cost' }
                    }
                }
            ]).toArray()
        ]);
        
        const stats = {
            totalUsers: userStats[0]?.totalUsers || 0,
            totalOrders: orderStats[0]?.totalOrders || 0,
            totalRevenue: orderStats[0]?.totalRevenue || 0,
            activeServers: serverStats[0]?.activeServers || 0,
            activeServices: serviceStats[0]?.activeServices || 0,
            todayOrders: todayStats[0]?.todayOrders || 0,
            todayRevenue: todayStats[0]?.todayRevenue || 0
        };
        
        res.json(successResponse(stats));
    } catch (error) {
        next(new AppError('Failed to fetch dashboard statistics', 500));
    }
});

module.exports = router;
