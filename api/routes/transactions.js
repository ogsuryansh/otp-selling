const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all transactions with enhanced categorization
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.json([]);
        }
        
        // Get all transactions from the transactions collection
        const transactions = await db.collection('transactions')
            .find({})
            .sort({ timestamp: -1 })
            .toArray();
        
        // Get all users for reference
        const users = await db.collection('users').find({}).toArray();
        const userMap = new Map();
        users.forEach(user => {
            userMap.set(user.user_id, user);
        });
        
        // Format transactions for frontend with enhanced categorization
        const formattedTransactions = transactions.map(tx => {
            const user = userMap.get(tx.user_id);
            
            // Enhanced transaction type and source categorization
            let type, source, category;
            
            switch(tx.type) {
                case 'credit':
                    if (tx.source === 'admin') {
                        type = 'add_balance';
                        source = 'admin';
                        category = 'admin_action';
                    } else if (tx.source === 'promo') {
                        type = 'add_balance';
                        source = 'promo';
                        category = 'promo_code';
                    } else if (tx.source === 'qr_payment') {
                        type = 'add_balance';
                        source = 'qr_payment';
                        category = 'payment';
                    } else if (tx.source === 'bot') {
                        type = 'add_balance';
                        source = 'bot';
                        category = 'bot_action';
                    } else {
                        type = 'add_balance';
                        source = tx.source || 'system';
                        category = 'system';
                    }
                    break;
                    
                case 'debit':
                    if (tx.source === 'admin') {
                        type = 'cut_balance';
                        source = 'admin';
                        category = 'admin_action';
                    } else if (tx.source === 'order') {
                        type = 'cut_balance';
                        source = 'order';
                        category = 'purchase';
                    } else if (tx.source === 'bot') {
                        type = 'cut_balance';
                        source = 'bot';
                        category = 'bot_action';
                    } else {
                        type = 'cut_balance';
                        source = tx.source || 'system';
                        category = 'system';
                    }
                    break;
                    
                case 'promo_credit':
                    type = 'add_balance';
                    source = 'promo';
                    category = 'promo_code';
                    break;
                    
                case 'qr_payment':
                    type = 'add_balance';
                    source = 'qr_payment';
                    category = 'payment';
                    break;
                    
                case 'order_payment':
                    type = 'cut_balance';
                    source = 'order';
                    category = 'purchase';
                    break;
                    
                case 'admin_action':
                    type = tx.amount > 0 ? 'add_balance' : 'cut_balance';
                    source = 'admin';
                    category = 'admin_action';
                    break;
                    
                default:
                    type = tx.type || 'system';
                    source = tx.source || 'system';
                    category = 'system';
            }
            
            return {
                id: tx._id?.toString() || `TXN_${tx.user_id}_${tx.timestamp}`,
                user_id: tx.user_id,
                user: user ? (user.first_name || user.username || `User ${tx.user_id}`) : `User ${tx.user_id}`,
                type: type,
                amount: Math.abs(tx.amount) || 0,
                description: tx.description || 'Transaction',
                source: source,
                category: category,
                created_at: tx.timestamp,
                status: 'completed',
                balance_before: tx.balance_before || 0,
                balance_after: tx.balance_after || 0,
                promo_code: tx.promo_code || null,
                admin_id: tx.admin_id || null,
                order_id: tx.order_id || null,
                payment_method: tx.payment_method || null,
                reference_id: tx.reference_id || null
            };
        });
        
        res.json(formattedTransactions);
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
        
        // Format transactions for frontend with enhanced categorization
        const formattedTransactions = transactions.map(tx => {
            // Enhanced transaction type and source categorization
            let type, source, category;
            
            switch(tx.type) {
                case 'credit':
                    if (tx.source === 'admin') {
                        type = 'add_balance';
                        source = 'admin';
                        category = 'admin_action';
                    } else if (tx.source === 'promo') {
                        type = 'add_balance';
                        source = 'promo';
                        category = 'promo_code';
                    } else if (tx.source === 'qr_payment') {
                        type = 'add_balance';
                        source = 'qr_payment';
                        category = 'payment';
                    } else if (tx.source === 'bot') {
                        type = 'add_balance';
                        source = 'bot';
                        category = 'bot_action';
                    } else {
                        type = 'add_balance';
                        source = tx.source || 'system';
                        category = 'system';
                    }
                    break;
                    
                case 'debit':
                    if (tx.source === 'admin') {
                        type = 'cut_balance';
                        source = 'admin';
                        category = 'admin_action';
                    } else if (tx.source === 'order') {
                        type = 'cut_balance';
                        source = 'order';
                        category = 'purchase';
                    } else if (tx.source === 'bot') {
                        type = 'cut_balance';
                        source = 'bot';
                        category = 'bot_action';
                    } else {
                        type = 'cut_balance';
                        source = tx.source || 'system';
                        category = 'system';
                    }
                    break;
                    
                case 'promo_credit':
                    type = 'add_balance';
                    source = 'promo';
                    category = 'promo_code';
                    break;
                    
                case 'qr_payment':
                    type = 'add_balance';
                    source = 'qr_payment';
                    category = 'payment';
                    break;
                    
                case 'order_payment':
                    type = 'cut_balance';
                    source = 'order';
                    category = 'purchase';
                    break;
                    
                case 'admin_action':
                    type = tx.amount > 0 ? 'add_balance' : 'cut_balance';
                    source = 'admin';
                    category = 'admin_action';
                    break;
                    
                default:
                    type = tx.type || 'system';
                    source = tx.source || 'system';
                    category = 'system';
            }
            
            return {
                id: tx._id?.toString() || `TXN_${userId}_${tx.timestamp}`,
                user_id: parseInt(userId),
                user: user.first_name || user.username || `User ${userId}`,
                type: type,
                amount: Math.abs(tx.amount) || 0,
                description: tx.description || 'Transaction',
                source: source,
                category: category,
                created_at: tx.timestamp,
                status: 'completed',
                balance_before: tx.balance_before || 0,
                balance_after: tx.balance_after || 0,
                promo_code: tx.promo_code || null,
                admin_id: tx.admin_id || null,
                order_id: tx.order_id || null,
                payment_method: tx.payment_method || null,
                reference_id: tx.reference_id || null
            };
        });
        
        res.json(formattedTransactions);
    } catch (error) {
        console.error('Error fetching user transactions:', error);
        next(new AppError('Failed to fetch user transactions', 500));
    }
});

// GET transaction statistics with enhanced categorization
router.get('/statistics', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.json({
                total_transactions: 0,
                total_credits: 0,
                total_debits: 0,
                recent_transactions: 0,
                by_source: {
                    admin: 0,
                    promo: 0,
                    qr_payment: 0,
                    order: 0,
                    bot: 0,
                    system: 0
                },
                by_category: {
                    admin_action: 0,
                    promo_code: 0,
                    payment: 0,
                    purchase: 0,
                    bot_action: 0,
                    system: 0
                }
            });
        }
        
        // Get basic statistics
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
        
        // Get recent transactions count
        const recentTransactions = await db.collection('transactions')
            .find({
                timestamp: {
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            })
            .count();
        
        // Get statistics by source
        const sourceStats = await db.collection('transactions').aggregate([
            {
                $group: {
                    _id: '$source',
                    count: { $sum: 1 },
                    total_amount: { $sum: '$amount' }
                }
            }
        ]).toArray();
        
        // Get statistics by category
        const categoryStats = await db.collection('transactions').aggregate([
            {
                $addFields: {
                    category: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$source', 'admin'] }, then: 'admin_action' },
                                { case: { $eq: ['$source', 'promo'] }, then: 'promo_code' },
                                { case: { $eq: ['$source', 'qr_payment'] }, then: 'payment' },
                                { case: { $eq: ['$source', 'order'] }, then: 'purchase' },
                                { case: { $eq: ['$source', 'bot'] }, then: 'bot_action' }
                            ],
                            default: 'system'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    total_amount: { $sum: '$amount' }
                }
            }
        ]).toArray();
        
        const result = stats[0] || {
            total_transactions: 0,
            total_credits: 0,
            total_debits: 0
        };
        
        result.recent_transactions = recentTransactions;
        
        // Format source statistics
        result.by_source = {
            admin: 0,
            promo: 0,
            qr_payment: 0,
            order: 0,
            bot: 0,
            system: 0
        };
        
        sourceStats.forEach(stat => {
            const source = stat._id || 'system';
            result.by_source[source] = stat.count;
        });
        
        // Format category statistics
        result.by_category = {
            admin_action: 0,
            promo_code: 0,
            payment: 0,
            purchase: 0,
            bot_action: 0,
            system: 0
        };
        
        categoryStats.forEach(stat => {
            const category = stat._id || 'system';
            result.by_category[category] = stat.count;
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching transaction statistics:', error);
        next(new AppError('Failed to fetch transaction statistics', 500));
    }
});

// POST create new transaction (for testing/admin purposes)
router.post('/', async (req, res, next) => {
    try {
        const { 
            user_id, 
            type, 
            amount, 
            description, 
            source, 
            promo_code, 
            admin_id,
            order_id,
            payment_method,
            reference_id
        } = req.body;
        
        if (!validateRequired(user_id) || !validateRequired(type) || !validateRequired(amount)) {
            return res.status(400).json(errorResponse('user_id, type, and amount are required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        // Get user to calculate balance
        const user = await db.collection('users').findOne({ user_id: parseInt(user_id) });
        if (!user) {
            return res.status(404).json(errorResponse('User not found'));
        }
        
        const currentBalance = parseFloat(user.balance) || 0;
        const transactionAmount = parseFloat(amount);
        
        // Calculate new balance based on transaction type
        let newBalance;
        if (type === 'credit' || type === 'add_balance') {
            newBalance = currentBalance + transactionAmount;
        } else if (type === 'debit' || type === 'cut_balance') {
            newBalance = Math.max(0, currentBalance - transactionAmount);
        } else {
            return res.status(400).json(errorResponse('Invalid transaction type'));
        }
        
        // Create transaction record
        const transaction = {
            user_id: parseInt(user_id),
            type: type === 'add_balance' ? 'credit' : 'debit',
            amount: transactionAmount,
            description: description || 'Transaction',
            source: source || 'admin',
            timestamp: new Date(),
            balance_before: currentBalance,
            balance_after: newBalance,
            promo_code: promo_code || null,
            admin_id: admin_id || null,
            order_id: order_id || null,
            payment_method: payment_method || null,
            reference_id: reference_id || null
        };
        
        // Insert transaction
        await db.collection('transactions').insertOne(transaction);
        
        // Update user balance
        await db.collection('users').updateOne(
            { user_id: parseInt(user_id) },
            { $set: { balance: newBalance } }
        );
        
        res.status(201).json(successResponse(transaction, 'Transaction created successfully'));
    } catch (error) {
        console.error('Error creating transaction:', error);
        next(new AppError('Failed to create transaction', 500));
    }
});

module.exports = router;
