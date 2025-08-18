const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId, validateEmail } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all users
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Return empty array if database is not available
            return res.json(successResponse([]));
        }
        
        const users = await db.collection('users').find({}).toArray();
        res.json(successResponse(users));
    } catch (error) {
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
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        
        if (!user) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        res.json(successResponse(user));
    } catch (error) {
        next(new AppError('Failed to fetch user', 500));
    }
});

// POST create new user
router.post('/', async (req, res, next) => {
    try {
        const { 
            username, 
            email, 
            password, 
            role = 'user',
            status = 'active',
            balance = 0
        } = req.body;
        
        if (!validateRequired(username) || !validateRequired(email)) {
            return res.status(400).json(errorResponse('Username and email are required'));
        }
        
        try {
            validateEmail(email);
        } catch (error) {
            return res.status(400).json(errorResponse('Invalid email format'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json(errorResponse('User with this email or username already exists'));
        }
        
        const newUser = {
            username,
            email,
            password: password || '', // In production, hash the password
            role,
            status,
            balance: parseFloat(balance) || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('users').insertOne(newUser);
        newUser._id = result.insertedId;
        
        // Remove password from response
        delete newUser.password;
        
        res.status(201).json(successResponse(newUser, 'User created successfully'));
    } catch (error) {
        next(new AppError('Failed to create user', 500));
    }
});

// PUT update user
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            username, 
            email, 
            password, 
            role, 
            status,
            balance
        } = req.body;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid user ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (username !== undefined) updateData.username = username;
        if (email !== undefined) {
            try {
                validateEmail(email);
                updateData.email = email;
            } catch (error) {
                return res.status(400).json(errorResponse('Invalid email format'));
            }
        }
        if (password !== undefined) updateData.password = password; // In production, hash the password
        if (role !== undefined) updateData.role = role;
        if (status !== undefined) updateData.status = status;
        if (balance !== undefined) updateData.balance = parseFloat(balance) || 0;
        
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
        
        // Remove password from response
        if (updatedUser) {
            delete updatedUser.password;
        }
        
        res.json(successResponse(updatedUser, 'User updated successfully'));
    } catch (error) {
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
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        res.json(successResponse(null, 'User deleted successfully'));
    } catch (error) {
        next(new AppError('Failed to delete user', 500));
    }
});

// GET user statistics
router.get('/:id/stats', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid user ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const stats = await db.collection('orders').aggregate([
            { $match: { userId: id } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$cost' },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] }
                    }
                }
            }
        ]).toArray();
        
        const userStats = stats[0] || {
            totalOrders: 0,
            totalSpent: 0,
            completedOrders: 0,
            pendingOrders: 0
        };
        
        res.json(successResponse(userStats));
    } catch (error) {
        next(new AppError('Failed to fetch user statistics', 500));
    }
});

module.exports = router;
