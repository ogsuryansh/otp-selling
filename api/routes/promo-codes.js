const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all promo codes
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Return empty array if database is not available
            return res.json(successResponse([]));
        }
        
        const promoCodes = await db.collection('promo_codes').find({}).toArray();
        res.json(successResponse(promoCodes));
    } catch (error) {
        next(new AppError('Failed to fetch promo codes', 500));
    }
});

// GET promo code by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid promo code ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const promoCode = await db.collection('promo_codes').findOne({ _id: new ObjectId(id) });
        
        if (!promoCode) {
            return res.status(404).json(errorResponse('Promo code not found'));
        }
        
        res.json(successResponse(promoCode));
    } catch (error) {
        next(new AppError('Failed to fetch promo code', 500));
    }
});

// POST create new promo code
router.post('/', async (req, res, next) => {
    try {
        const { 
            code, 
            amount, 
            usageLimit, 
            expiryDate, 
            description = '',
            status = 'active'
        } = req.body;
        
        if (!validateRequired(code) || !validateRequired(amount) || !validateRequired(usageLimit)) {
            return res.status(400).json(errorResponse('Code, amount, and usage limit are required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        // Check if promo code already exists
        const existingPromo = await db.collection('promo_codes').findOne({ code: code.toUpperCase() });
        
        if (existingPromo) {
            return res.status(400).json(errorResponse('Promo code already exists'));
        }
        
        const newPromoCode = {
            code: code.toUpperCase(),
            amount: parseFloat(amount) || 0,
            usageLimit: parseInt(usageLimit) || 1,
            usedCount: 0,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            description,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('promo_codes').insertOne(newPromoCode);
        newPromoCode._id = result.insertedId;
        
        res.status(201).json(successResponse(newPromoCode, 'Promo code created successfully'));
    } catch (error) {
        next(new AppError('Failed to create promo code', 500));
    }
});

// PUT update promo code
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            code, 
            amount, 
            usageLimit, 
            expiryDate, 
            description, 
            status,
            usedCount
        } = req.body;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid promo code ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (code !== undefined) updateData.code = code.toUpperCase();
        if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
        if (usageLimit !== undefined) updateData.usageLimit = parseInt(usageLimit) || 1;
        if (usedCount !== undefined) updateData.usedCount = parseInt(usedCount) || 0;
        if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        
        const result = await db.collection('promo_codes').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json(errorResponse('Promo code not found'));
        }
        
        const updatedPromoCode = await db.collection('promo_codes').findOne({ _id: new ObjectId(id) });
        
        res.json(successResponse(updatedPromoCode, 'Promo code updated successfully'));
    } catch (error) {
        next(new AppError('Failed to update promo code', 500));
    }
});

// DELETE promo code
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid promo code ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const result = await db.collection('promo_codes').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json(errorResponse('Promo code not found'));
        }
        
        res.json(successResponse(null, 'Promo code deleted successfully'));
    } catch (error) {
        next(new AppError('Failed to delete promo code', 500));
    }
});

// POST validate and use promo code
router.post('/validate/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const { userId } = req.body;
        
        if (!validateRequired(code) || !validateRequired(userId)) {
            return res.status(400).json(errorResponse('Code and user ID are required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const promoCode = await db.collection('promo_codes').findOne({ 
            code: code.toUpperCase(),
            status: 'active'
        });
        
        if (!promoCode) {
            return res.status(404).json(errorResponse('Promo code not found or inactive'));
        }
        
        // Check if promo code is expired
        if (promoCode.expiryDate && new Date() > new Date(promoCode.expiryDate)) {
            return res.status(400).json(errorResponse('Promo code has expired'));
        }
        
        // Check if usage limit reached
        if (promoCode.usedCount >= promoCode.usageLimit) {
            return res.status(400).json(errorResponse('Promo code usage limit reached'));
        }
        
        // Check if user has already used this code
        const existingUsage = await db.collection('promo_usage').findOne({
            promoCodeId: promoCode._id,
            userId: userId
        });
        
        if (existingUsage) {
            return res.status(400).json(errorResponse('You have already used this promo code'));
        }
        
        // Update promo code usage count
        await db.collection('promo_codes').updateOne(
            { _id: promoCode._id },
            { $inc: { usedCount: 1 } }
        );
        
        // Record usage
        await db.collection('promo_usage').insertOne({
            promoCodeId: promoCode._id,
            userId: userId,
            amount: promoCode.amount,
            usedAt: new Date()
        });
        
        // Add amount to user balance
        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $inc: { balance: promoCode.amount } }
        );
        
        res.json(successResponse({
            amount: promoCode.amount,
            message: `Successfully added ₹${promoCode.amount} to your balance`
        }, 'Promo code applied successfully'));
    } catch (error) {
        next(new AppError('Failed to validate promo code', 500));
    }
});

module.exports = router;
