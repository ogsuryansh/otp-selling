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
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const apis = await db.collection('apis').find({}).toArray();
        res.json(successResponse(apis));
    } catch (error) {
        console.error('Error fetching APIs:', error);
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
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const api = await db.collection('apis').findOne({ _id: new ObjectId(id) });
        
        if (!api) {
            return res.status(404).json(errorResponse('API not found'));
        }
        
        res.json(successResponse(api));
    } catch (error) {
        console.error('Error fetching API:', error);
        next(new AppError('Failed to fetch API', 500));
    }
});

// POST create new API
router.post('/', async (req, res, next) => {
    try {
        const { 
            name, 
            serverId, 
            authHeaders, 
            responseType, 
            getNumberUrl, 
            getMessageUrl, 
            responseStartsWith, 
            activateNextUrl, 
            cancelNumberUrl, 
            autoCancelMinutes, 
            retryTimes, 
            status = 'active' 
        } = req.body;
        
        if (!validateRequired(name) || !validateRequired(serverId)) {
            return res.status(400).json(errorResponse('API name and server ID are required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const newApi = {
            name,
            serverId,
            authHeaders: Boolean(authHeaders),
            responseType: responseType || 'text',
            getNumberUrl,
            getMessageUrl,
            responseStartsWith,
            activateNextUrl,
            cancelNumberUrl,
            autoCancelMinutes: parseInt(autoCancelMinutes) || 5,
            retryTimes: parseInt(retryTimes) || 0,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('apis').insertOne(newApi);
        newApi._id = result.insertedId;
        
        res.status(201).json(successResponse(newApi));
    } catch (error) {
        console.error('Error creating API:', error);
        next(new AppError('Failed to create API', 500));
    }
});

// PUT update API
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            serverId, 
            authHeaders, 
            responseType, 
            getNumberUrl, 
            getMessageUrl, 
            responseStartsWith, 
            activateNextUrl, 
            cancelNumberUrl, 
            autoCancelMinutes, 
            retryTimes, 
            status 
        } = req.body;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid API ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (name !== undefined) updateData.name = name;
        if (serverId !== undefined) updateData.serverId = serverId;
        if (authHeaders !== undefined) updateData.authHeaders = Boolean(authHeaders);
        if (responseType !== undefined) updateData.responseType = responseType;
        if (getNumberUrl !== undefined) updateData.getNumberUrl = getNumberUrl;
        if (getMessageUrl !== undefined) updateData.getMessageUrl = getMessageUrl;
        if (responseStartsWith !== undefined) updateData.responseStartsWith = responseStartsWith;
        if (activateNextUrl !== undefined) updateData.activateNextUrl = activateNextUrl;
        if (cancelNumberUrl !== undefined) updateData.cancelNumberUrl = cancelNumberUrl;
        if (autoCancelMinutes !== undefined) updateData.autoCancelMinutes = parseInt(autoCancelMinutes) || 5;
        if (retryTimes !== undefined) updateData.retryTimes = parseInt(retryTimes) || 0;
        if (status !== undefined) updateData.status = status;
        
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
        console.error('Error updating API:', error);
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
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const result = await db.collection('apis').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json(errorResponse('API not found'));
        }
        
        res.json(successResponse(null, 'API deleted successfully'));
    } catch (error) {
        console.error('Error deleting API:', error);
        next(new AppError('Failed to delete API', 500));
    }
});

module.exports = router;
