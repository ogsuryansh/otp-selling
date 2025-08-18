const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all orders
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Return empty array if database is not available
            return res.json(successResponse([]));
        }
        
        const orders = await db.collection('orders').find({}).toArray();
        res.json(successResponse(orders));
    } catch (error) {
        next(new AppError('Failed to fetch orders', 500));
    }
});

// GET order by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid order ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });
        
        if (!order) {
            return res.status(404).json(errorResponse('Order not found'));
        }
        
        res.json(successResponse(order));
    } catch (error) {
        next(new AppError('Failed to fetch order', 500));
    }
});

// POST create new order
router.post('/', async (req, res, next) => {
    try {
        const { 
            userId, 
            serviceId, 
            phone, 
            country, 
            product, 
            cost = 0,
            status = 'pending',
            provider = '5sim'
        } = req.body;
        
        if (!validateRequired(userId) || !validateRequired(serviceId)) {
            return res.status(400).json(errorResponse('User ID and service ID are required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const newOrder = {
            userId,
            serviceId,
            phone,
            country,
            product,
            cost: parseFloat(cost) || 0,
            status,
            provider,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('orders').insertOne(newOrder);
        newOrder._id = result.insertedId;
        
        res.status(201).json(successResponse(newOrder, 'Order created successfully'));
    } catch (error) {
        next(new AppError('Failed to create order', 500));
    }
});

// PUT update order
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            status, 
            phone, 
            sms, 
            code,
            cost,
            completedAt,
            cancelledAt
        } = req.body;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid order ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (status !== undefined) updateData.status = status;
        if (phone !== undefined) updateData.phone = phone;
        if (sms !== undefined) updateData.sms = sms;
        if (code !== undefined) updateData.code = code;
        if (cost !== undefined) updateData.cost = parseFloat(cost) || 0;
        if (completedAt !== undefined) updateData.completedAt = completedAt;
        if (cancelledAt !== undefined) updateData.cancelledAt = cancelledAt;
        
        const result = await db.collection('orders').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json(errorResponse('Order not found'));
        }
        
        const updatedOrder = await db.collection('orders').findOne({ _id: new ObjectId(id) });
        
        res.json(successResponse(updatedOrder, 'Order updated successfully'));
    } catch (error) {
        next(new AppError('Failed to update order', 500));
    }
});

// GET order statistics
router.get('/stats/summary', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.json(successResponse({
                totalOrders: 0,
                totalRevenue: 0,
                completedOrders: 0,
                pendingOrders: 0,
                cancelledOrders: 0
            }));
        }
        
        const stats = await db.collection('orders').aggregate([
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$cost' },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    }
                }
            }
        ]).toArray();
        
        const summary = stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            completedOrders: 0,
            pendingOrders: 0,
            cancelledOrders: 0
        };
        
        res.json(successResponse(summary));
    } catch (error) {
        next(new AppError('Failed to fetch order statistics', 500));
    }
});

module.exports = router;
