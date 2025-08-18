const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all APIs
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Return empty array if database is not available
            return res.json(successResponse([]));
        }
        
        const apis = await db.collection('apis').find({}).toArray();
        res.json(successResponse(apis));
    } catch (error) {
        next(new AppError('Failed to fetch APIs', 500));
    }
});

// GET API by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid API ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const api = await db.collection('apis').findOne({ _id: new ObjectId(id) });
        
        if (!api) {
            return res.status(404).json(errorResponse('API not found'));
        }
        
        res.json(successResponse(api));
    } catch (error) {
        next(new AppError('Failed to fetch API', 500));
    }
});

// POST create new API
router.post('/', async (req, res, next) => {
    try {
        const { 
            name, 
            baseUrl, 
            apiKey, 
            provider = '5sim',
            status = 'active',
            description = '',
            endpoints = {}
        } = req.body;
        
        if (!validateRequired(name) || !validateRequired(baseUrl)) {
            return res.status(400).json(errorResponse('Name and base URL are required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const newApi = {
            name,
            baseUrl,
            apiKey: apiKey || '',
            provider,
            status,
            description,
            endpoints,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('apis').insertOne(newApi);
        newApi._id = result.insertedId;
        
        res.status(201).json(successResponse(newApi, 'API created successfully'));
    } catch (error) {
        next(new AppError('Failed to create API', 500));
    }
});

// PUT update API
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            baseUrl, 
            apiKey, 
            provider, 
            status,
            description,
            endpoints
        } = req.body;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid API ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (name !== undefined) updateData.name = name;
        if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
        if (apiKey !== undefined) updateData.apiKey = apiKey;
        if (provider !== undefined) updateData.provider = provider;
        if (status !== undefined) updateData.status = status;
        if (description !== undefined) updateData.description = description;
        if (endpoints !== undefined) updateData.endpoints = endpoints;
        
        const result = await db.collection('apis').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json(errorResponse('API not found'));
        }
        
        const updatedApi = await db.collection('apis').findOne({ _id: new ObjectId(id) });
        
        res.json(successResponse(updatedApi, 'API updated successfully'));
    } catch (error) {
        next(new AppError('Failed to update API', 500));
    }
});

// DELETE API
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid API ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const result = await db.collection('apis').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json(errorResponse('API not found'));
        }
        
        res.json(successResponse(null, 'API deleted successfully'));
    } catch (error) {
        next(new AppError('Failed to delete API', 500));
    }
});

module.exports = router;
