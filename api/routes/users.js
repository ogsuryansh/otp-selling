const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId, validateEmail } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all users with enhanced balance information
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.json([]);
        }
        
        const users = await db.collection('users').find({}).toArray();
        
        // Get transaction statistics for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            // Get user's transaction statistics
            const transactionStats = await db.collection('transactions').aggregate([
                { $match: { user_id: user.user_id } },
                {
                    $group: {
                        _id: null,
                        total_credits: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0]
                            }
                        },
                        total_debits: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
                            }
                        },
                        transaction_count: { $sum: 1 },
                        last_transaction: { $max: '$timestamp' }
                    }
                }
            ]).toArray();
            
            const stats = transactionStats[0] || {
                total_credits: 0,
                total_debits: 0,
                transaction_count: 0,
                last_transaction: null
            };
            
            // Get user's order statistics
            const orderStats = await db.collection('orders').aggregate([
                { $match: { user_id: user.user_id } },
                {
                    $group: {
                        _id: null,
                        total_orders: { $sum: 1 },
                        completed_orders: {
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        },
                        total_spent: { $sum: '$cost' }
                    }
                }
            ]).toArray();
            
            const orderData = orderStats[0] || {
                total_orders: 0,
                completed_orders: 0,
                total_spent: 0
            };
            
            // Calculate total balance (should match user.balance but for verification)
            const calculatedBalance = stats.total_credits - stats.total_debits;
            const actualBalance = parseFloat(user.balance) || 0;
            
            return {
                id: user.user_id || user._id?.toString(),
                user_id: user.user_id,
                name: user.first_name || user.username || `User ${user.user_id}`,
                username: user.username || `@user${user.user_id}`,
                balance: actualBalance, // Use actual balance from user document
                calculated_balance: calculatedBalance, // For verification
                balance_verified: Math.abs(actualBalance - calculatedBalance) < 0.01, // Check if balances match
                status: user.status || 'active',
                registration_date: user.createdAt || user.registration_date || new Date(),
                last_activity: user.updatedAt || user.last_activity || new Date(),
                email: user.email || '',
                role: user.role || 'user',
                is_banned: user.is_banned || false,
                ban_reason: user.ban_reason || null,
                // Transaction statistics
                total_credits: stats.total_credits,
                total_debits: stats.total_debits,
                transaction_count: stats.transaction_count,
                last_transaction: stats.last_transaction,
                // Order statistics
                total_orders: orderData.total_orders,
                completed_orders: orderData.completed_orders,
                total_spent: orderData.total_spent
            };
        }));
        
        res.json(usersWithStats);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET user by ID with detailed information
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        // Try to find user by user_id (numeric) first, then by _id (ObjectId)
        let user = await db.collection('users').findOne({ user_id: parseInt(id) });
        
        if (!user && validateObjectId(id)) {
            user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        }
        
        if (!user) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        // Get user's transaction statistics
        const transactionStats = await db.collection('transactions').aggregate([
            { $match: { user_id: user.user_id } },
            {
                $group: {
                    _id: null,
                    total_credits: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0]
                        }
                    },
                    total_debits: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
                        }
                    },
                    transaction_count: { $sum: 1 },
                    last_transaction: { $max: '$timestamp' }
                }
            }
        ]).toArray();
        
        const stats = transactionStats[0] || {
            total_credits: 0,
            total_debits: 0,
            transaction_count: 0,
            last_transaction: null
        };
        
        // Get user's recent transactions
        const recentTransactions = await db.collection('transactions')
            .find({ user_id: user.user_id })
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray();
        
        // Get user's order statistics
        const orderStats = await db.collection('orders').aggregate([
            { $match: { user_id: user.user_id } },
            {
                $group: {
                    _id: null,
                    total_orders: { $sum: 1 },
                    completed_orders: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    total_spent: { $sum: '$cost' }
                }
            }
        ]).toArray();
        
        const orderData = orderStats[0] || {
            total_orders: 0,
            completed_orders: 0,
            total_spent: 0
        };
        
        // Calculate total balance
        const calculatedBalance = stats.total_credits - stats.total_debits;
        const actualBalance = parseFloat(user.balance) || 0;
        
        const userWithDetails = {
            ...user,
            calculated_balance: calculatedBalance,
            balance_verified: Math.abs(actualBalance - calculatedBalance) < 0.01,
            total_credits: stats.total_credits,
            total_debits: stats.total_debits,
            transaction_count: stats.transaction_count,
            last_transaction: stats.last_transaction,
            total_orders: orderData.total_orders,
            completed_orders: orderData.completed_orders,
            total_spent: orderData.total_spent,
            recent_transactions: recentTransactions
        };
        
        res.json(successResponse(userWithDetails));
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
            balance,
            action
        } = req.body;
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        const updateOperator = {};
        
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
        if (balance !== undefined) {
            const amount = parseFloat(balance) || 0;
            if (action === 'add_balance') {
                updateOperator.$inc = { balance: amount };
            } else if (action === 'cut_balance') {
                updateOperator.$inc = { balance: -amount };
            } else {
                updateData.balance = amount;
            }
        }
        if (Object.keys(updateData).length > 0) {
            updateOperator.$set = updateData;
        }
        
        // Try to update by user_id (numeric) first, then by _id (ObjectId)
        let result = await db.collection('users').updateOne(
            { user_id: parseInt(id) },
            updateOperator
        );
        
        if (result.matchedCount === 0 && validateObjectId(id)) {
            result = await db.collection('users').updateOne(
                { _id: new ObjectId(id) },
                updateOperator
            );
        }
        
        if (result.matchedCount === 0) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        // Get updated user
        let updatedUser = await db.collection('users').findOne({ user_id: parseInt(id) });
        if (!updatedUser && validateObjectId(id)) {
            updatedUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
        }
        
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
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        // Try to delete by user_id (numeric) first, then by _id (ObjectId)
        let result = await db.collection('users').deleteOne({ user_id: parseInt(id) });
        
        if (result.deletedCount === 0 && validateObjectId(id)) {
            result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
        }
        
        if (result.deletedCount === 0) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        res.json(successResponse(null, 'User deleted successfully'));
    } catch (error) {
        next(new AppError('Failed to delete user', 500));
    }
});

// GET user statistics with enhanced information
router.get('/:id/stats', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        // Try to find user by user_id (numeric) first, then by _id (ObjectId)
        let user = await db.collection('users').findOne({ user_id: parseInt(id) });
        
        if (!user && validateObjectId(id)) {
            user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        }
        
        if (!user) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        // Get comprehensive user statistics
        const [orderStats, transactionStats, recentTransactions] = await Promise.all([
            // Order statistics
            db.collection('orders').aggregate([
                { $match: { user_id: parseInt(id) } },
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
            ]).toArray(),
            
            // Transaction statistics
            db.collection('transactions').aggregate([
                { $match: { user_id: parseInt(id) } },
                {
                    $group: {
                        _id: null,
                        totalTransactions: { $sum: 1 },
                        totalCredits: {
                            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                        },
                        totalDebits: {
                            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                        },
                        lastTransaction: { $max: '$timestamp' }
                    }
                }
            ]).toArray(),
            
            // Recent transactions
            db.collection('transactions')
                .find({ user_id: parseInt(id) })
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray()
        ]);
        
        const orderData = orderStats[0] || {
            totalOrders: 0,
            totalSpent: 0,
            completedOrders: 0,
            pendingOrders: 0
        };
        
        const transactionData = transactionStats[0] || {
            totalTransactions: 0,
            totalCredits: 0,
            totalDebits: 0,
            lastTransaction: null
        };
        
        const calculatedBalance = transactionData.totalCredits - transactionData.totalDebits;
        const actualBalance = parseFloat(user.balance) || 0;
        
        const userStats = {
            ...orderData,
            ...transactionData,
            currentBalance: actualBalance,
            calculatedBalance: calculatedBalance,
            balanceVerified: Math.abs(actualBalance - calculatedBalance) < 0.01,
            recentTransactions: recentTransactions
        };
        
        res.json(successResponse(userStats));
    } catch (error) {
        next(new AppError('Failed to fetch user statistics', 500));
    }
});

module.exports = router;
