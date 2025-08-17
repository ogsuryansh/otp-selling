const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all users
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const users = await db.collection('users').find({}).toArray();
        res.json(successResponse(users));
    } catch (error) {
        console.error('Error fetching users:', error);
        next(new AppError('Failed to fetch users', 500));
    }
});

// GET user by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid user ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        
        if (!user) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        res.json(successResponse(user));
    } catch (error) {
        console.error('Error fetching user:', error);
        next(new AppError('Failed to fetch user', 500));
    }
});

// POST create new user
router.post('/', async (req, res, next) => {
    try {
        const { username, telegramId, balance = 0, status = 'active' } = req.body;
        
        if (!validateRequired(username) || !validateRequired(telegramId)) {
            return res.status(400).json(errorResponse('Username and Telegram ID are required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ telegramId });
        if (existingUser) {
            return res.status(409).json(errorResponse('User with this Telegram ID already exists'));
        }
        
        const newUser = {
            username,
            telegramId,
            balance: parseFloat(balance) || 0,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('users').insertOne(newUser);
        newUser._id = result.insertedId;
        
        res.status(201).json(successResponse(newUser));
    } catch (error) {
        console.error('Error creating user:', error);
        next(new AppError('Failed to create user', 500));
    }
});

// PUT update user
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { username, telegramId, balance, status, action, banReason } = req.body;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid user ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        // Get current user
        const currentUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!currentUser) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        // Handle balance updates
        if (balance !== undefined) {
            let newBalance = currentUser.balance || 0;
            
            if (action === 'add_balance') {
                newBalance += parseFloat(balance) || 0;
            } else if (action === 'cut_balance') {
                newBalance -= parseFloat(balance) || 0;
                if (newBalance < 0) newBalance = 0; // Prevent negative balance
            } else {
                newBalance = parseFloat(balance) || 0;
            }
            
            updateData.balance = newBalance;
        }
        
        // Handle status updates
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'banned' && banReason) {
                updateData.banReason = banReason;
                updateData.bannedAt = new Date();
            } else if (status === 'active') {
                updateData.banReason = null;
                updateData.bannedAt = null;
            }
        }
        
        // Handle other field updates
        if (username !== undefined) updateData.username = username;
        if (telegramId !== undefined) updateData.telegramId = telegramId;
        
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        // Get updated user
        const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
        
        res.json(successResponse(updatedUser, 'User updated successfully'));
    } catch (error) {
        console.error('Error updating user:', error);
        next(new AppError('Failed to update user', 500));
    }
});

// DELETE user
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid user ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        res.json(successResponse(null, 'User deleted successfully'));
    } catch (error) {
        console.error('Error deleting user:', error);
        next(new AppError('Failed to delete user', 500));
    }
});

// GET user statistics
router.get('/stats/summary', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const pipeline = [
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    totalBalance: { $sum: '$balance' },
                    activeUsers: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    bannedUsers: {
                        $sum: { $cond: [{ $eq: ['$status', 'banned'] }, 1, 0] }
                    }
                }
            }
        ];
        
        const stats = await db.collection('users').aggregate(pipeline).toArray();
        const summary = stats[0] || {
            totalUsers: 0,
            totalBalance: 0,
            activeUsers: 0,
            bannedUsers: 0
        };
        
        res.json(successResponse(summary));
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        next(new AppError('Failed to fetch user statistics', 500));
    }
});

module.exports = router;
