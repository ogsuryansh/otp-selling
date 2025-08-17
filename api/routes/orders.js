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
        const { limit } = req.query;
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Return empty array if database is not available
            return res.json(successResponse([]));
        }
        
        let query = {};
        if (limit) {
            query = db.collection('orders').find({}).limit(parseInt(limit));
        } else {
            query = db.collection('orders').find({});
        }
        
        const orders = await query.toArray();
        res.json(successResponse(orders));
    } catch (error) {
        console.error('Error fetching orders:', error);
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
        console.error('Error fetching order:', error);
        next(new AppError('Failed to fetch order', 500));
    }
});

// POST create new order
router.post('/', async (req, res, next) => {
    try {
        const { userId, serviceId, amount, status = 'pending' } = req.body;
        
        if (!validateRequired(userId) || !validateRequired(serviceId) || !validateRequired(amount)) {
            return res.status(400).json(errorResponse('User ID, Service ID, and Amount are required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const newOrder = {
            userId,
            serviceId,
            amount: parseFloat(amount) || 0,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('orders').insertOne(newOrder);
        newOrder._id = result.insertedId;
        
        res.status(201).json(successResponse(newOrder));
    } catch (error) {
        console.error('Error creating order:', error);
        next(new AppError('Failed to create order', 500));
    }
});

// PUT update order
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, amount } = req.body;
        
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
        if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
        
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
        console.error('Error updating order:', error);
        next(new AppError('Failed to update order', 500));
    }
});

// GET order statistics
router.get('/stats/summary', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const pipeline = [
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    failedOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                    }
                }
            }
        ];
        
        const stats = await db.collection('orders').aggregate(pipeline).toArray();
        const summary = stats[0] || {
            totalOrders: 0,
            totalAmount: 0,
            completedOrders: 0,
            pendingOrders: 0,
            failedOrders: 0
        };
        
        res.json(successResponse(summary));
    } catch (error) {
        console.error('Error fetching order statistics:', error);
        next(new AppError('Failed to fetch order statistics', 500));
    }
});

module.exports = router;
