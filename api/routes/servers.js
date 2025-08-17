const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET all servers
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const servers = await db.collection('servers').find({}).toArray();
        res.json(successResponse(servers));
    } catch (error) {
        console.error('Error fetching servers:', error);
        next(new AppError('Failed to fetch servers', 500));
    }
});

// GET server by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid server ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const server = await db.collection('servers').findOne({ _id: new ObjectId(id) });
        
        if (!server) {
            return res.status(404).json(errorResponse('Server not found'));
        }
        
        res.json(successResponse(server));
    } catch (error) {
        console.error('Error fetching server:', error);
        next(new AppError('Failed to fetch server', 500));
    }
});

// POST create new server
router.post('/', async (req, res, next) => {
    try {
        const { name, url = '', countryCode, countryName, status = 'active' } = req.body;
        
        if (!validateRequired(name)) {
            return res.status(400).json(errorResponse('Name is required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const newServer = {
            name,
            url,
            countryCode,
            countryName,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('servers').insertOne(newServer);
        newServer._id = result.insertedId;
        
        res.status(201).json(successResponse(newServer));
    } catch (error) {
        console.error('Error creating server:', error);
        next(new AppError('Failed to create server', 500));
    }
});

// PUT update server
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, url, countryCode, countryName, status } = req.body;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid server ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(500).json(errorResponse('Database connection failed'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (name !== undefined) updateData.name = name;
        if (url !== undefined) updateData.url = url;
        if (countryCode !== undefined) updateData.countryCode = countryCode;
        if (countryName !== undefined) updateData.countryName = countryName;
        if (status !== undefined) updateData.status = status;
        
        const result = await db.collection('servers').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json(errorResponse('Server not found'));
        }
        
        const updatedServer = await db.collection('servers').findOne({ _id: new ObjectId(id) });
        
        res.json(successResponse(updatedServer, 'Server updated successfully'));
    } catch (error) {
        console.error('Error updating server:', error);
        next(new AppError('Failed to update server', 500));
    }
});

module.exports = router;
