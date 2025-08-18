const logger = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    
    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - start;
        console.log(`📤 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        return originalJson.call(this, data);
    };
    
    next();
};

// Helper functions for consistent response formatting
const successResponse = (data, message = 'Success') => ({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
});

const errorResponse = (message = 'Error occurred', statusCode = 500, details = null) => ({
    success: false,
    message,
    statusCode,
    details,
    timestamp: new Date().toISOString()
});

// Request validation helper
const validateRequest = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json(errorResponse(
                `Missing required fields: ${missingFields.join(', ')}`,
                400
            ));
        }
        
        next();
    };
};

module.exports = {
    logger,
    successResponse,
    errorResponse,
    validateRequest
};
