const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/logger');
const { validateRequired, validateObjectId } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Initialize services in database if empty
async function initializeServices() {
    try {
        const { db } = await connectToMongoDB();
        if (!db) return;

        const existingServices = await db.collection('services').countDocuments();
        if (existingServices === 0) {
            console.log('No services found in database. Please add services through the admin panel.');
        }
    } catch (error) {
        console.error('Error checking services:', error);
    }
}

// Initialize services on startup
initializeServices();

// GET all services
router.get('/', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Return available services if database is not available
            return res.json(successResponse([])); // Return empty array if DB not available
        }
        
        const services = await db.collection('services').find({}).toArray();
        res.json(successResponse(services));
    } catch (error) {
        next(new AppError('Failed to fetch services', 500));
    }
});

// GET search services
router.get('/search/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const { db } = await connectToMongoDB();
        
        if (!db) {
            // Search in available services if database is not available
            return res.json(successResponse([])); // Return empty array if DB not available
        }
        
        const services = await db.collection('services').find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { code: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }).toArray();
        
        res.json(successResponse(services));
    } catch (error) {
        next(new AppError('Failed to search services', 500));
    }
});

// GET available services list (for search suggestions)
router.get('/available/list', async (req, res, next) => {
    try {
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.json(successResponse([])); // Return empty array if DB not available
        }
        
        const services = await db.collection('services').find({}, { name: 1, code: 1 }).toArray();
        res.json(successResponse(services));
    } catch (error) {
        next(new AppError('Failed to fetch available services', 500));
    }
});

// GET service by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid service ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const service = await db.collection('services').findOne({ _id: new ObjectId(id) });
        
        if (!service) {
            return res.status(404).json(errorResponse('Service not found'));
        }
        
        res.json(successResponse(service));
    } catch (error) {
        next(new AppError('Failed to fetch service', 500));
    }
});

// POST create new service
router.post('/', async (req, res, next) => {
    try {
        const { 
            name, 
            description = '', 
            price = 0, 
            countryCode, 
            countryName, 
            status = 'active',
            provider = '5sim',
            category = 'otp',
            serverId,
            serviceIdField,
            serviceLogo,
            serviceCode,
            disableCancellation = 0
        } = req.body;
        
        if (!validateRequired(name)) {
            return res.status(400).json(errorResponse('Name is required'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const newService = {
            name,
            description,
            price: parseFloat(price) || 0,
            countryCode,
            countryName,
            status,
            provider,
            category,
            serverId,
            serviceIdField,
            serviceLogo,
            serviceCode,
            disableCancellation: parseInt(disableCancellation) || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('services').insertOne(newService);
        newService._id = result.insertedId;
        
        res.status(201).json(successResponse(newService, 'Service created successfully'));
    } catch (error) {
        next(new AppError('Failed to create service', 500));
    }
});

// PUT update service
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            description, 
            price, 
            countryCode, 
            countryName, 
            status,
            provider,
            category,
            serverId,
            serviceIdField,
            serviceLogo,
            serviceCode,
            disableCancellation
        } = req.body;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid service ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = parseFloat(price) || 0;
        if (countryCode !== undefined) updateData.countryCode = countryCode;
        if (countryName !== undefined) updateData.countryName = countryName;
        if (status !== undefined) updateData.status = status;
        if (provider !== undefined) updateData.provider = provider;
        if (category !== undefined) updateData.category = category;
        if (serverId !== undefined) updateData.serverId = serverId;
        if (serviceIdField !== undefined) updateData.serviceIdField = serviceIdField;
        if (serviceLogo !== undefined) updateData.serviceLogo = serviceLogo;
        if (serviceCode !== undefined) updateData.serviceCode = serviceCode;
        if (disableCancellation !== undefined) updateData.disableCancellation = parseInt(disableCancellation) || 0;
        
        const result = await db.collection('services').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json(errorResponse('Service not found'));
        }
        
        const updatedService = await db.collection('services').findOne({ _id: new ObjectId(id) });
        
        res.json(successResponse(updatedService, 'Service updated successfully'));
    } catch (error) {
        next(new AppError('Failed to update service', 500));
    }
});

// DELETE service
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!validateObjectId(id)) {
            return res.status(400).json(errorResponse('Invalid service ID'));
        }
        
        const { db } = await connectToMongoDB();
        
        if (!db) {
            return res.status(503).json(errorResponse('Database not available'));
        }
        
        const result = await db.collection('services').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json(errorResponse('Service not found'));
        }
        
        res.json(successResponse(null, 'Service deleted successfully'));
    } catch (error) {
        next(new AppError('Failed to delete service', 500));
    }
});

module.exports = router;
