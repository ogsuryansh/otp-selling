const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all transactions
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Return empty array if database is not available
            return res.json([]);
        }
        
        // Get all users first
        const users = await db.collection('users').find({}).toArray();
        const allTransactions = [];
        
        // Collect transactions from all users
        for (const user of users) {
            const userTransactions = await db.collection('transactions')
                .find({ user_id: user.user_id })
                .sort({ timestamp: -1 })
                .toArray();
            
            // Format transactions for frontend
            for (const tx of userTransactions) {
                const formattedTx = {
                    id: tx._id?.toString() || `TXN_${user.user_id}_${tx.timestamp}`,
                    user_id: user.user_id,
                    user: user.first_name || user.username || `User ${user.user_id}`,
                    type: tx.type === 'credit' ? 'add_balance' : 'cut_balance',
                    amount: tx.amount,
                    description: tx.description || 'Transaction',
                    source: tx.source || 'system',
                    created_at: tx.timestamp,
                    status: 'completed',
                    balance_before: tx.balance_before,
                    balance_after: tx.balance_after
                };
                allTransactions.push(formattedTx);
            }
        }
        
        // Sort by timestamp (newest first)
        allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json(allTransactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        next(new AppError('Failed to fetch transactions', 500));
    }
});

// GET transactions for specific user
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.json([]);
        }
        
        const user = await db.collection('users').findOne({ user_id: parseInt(userId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const transactions = await db.collection('transactions')
            .find({ user_id: parseInt(userId) })
            .sort({ timestamp: -1 })
            .toArray();
        
        // Format transactions for frontend
        const formattedTransactions = transactions.map(tx => ({
            id: tx._id?.toString() || `TXN_${userId}_${tx.timestamp}`,
            user_id: parseInt(userId),
            user: user.first_name || user.username || `User ${userId}`,
            type: tx.type === 'credit' ? 'add_balance' : 'cut_balance',
            amount: tx.amount,
            description: tx.description || 'Transaction',
            source: tx.source || 'system',
            created_at: tx.timestamp,
            status: 'completed',
            balance_before: tx.balance_before,
            balance_after: tx.balance_after
        }));
        
        res.json(formattedTransactions);
    } catch (error) {
        console.error('Error fetching user transactions:', error);
        next(new AppError('Failed to fetch user transactions', 500));
    }
});

// GET transaction statistics
router.get('/statistics', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.json({
                total_transactions: 0,
                total_credits: 0,
                total_debits: 0,
                recent_transactions: 0
            });
        }
        
        const pipeline = [
            {
                $group: {
                    _id: null,
                    total_transactions: { $sum: 1 },
                    total_credits: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0]
                        }
                    },
                    total_debits: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
                        }
                    }
                }
            }
        ];
        
        const stats = await db.collection('transactions').aggregate(pipeline).toArray();
        const recentTransactions = await db.collection('transactions')
            .find({
                timestamp: {
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            })
            .count();
        
        const result = stats[0] || {
            total_transactions: 0,
            total_credits: 0,
            total_debits: 0
        };
        
        result.recent_transactions = recentTransactions;
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching transaction statistics:', error);
        next(new AppError('Failed to fetch transaction statistics', 500));
    }
});

module.exports = router;
