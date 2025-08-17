// Logging middleware
function logger(req, res, next) {
    // Disable logging in production
    if (process.env.NODE_ENV === 'production') {
        return next();
    }
    
    const start = Date.now();
    
    // Log request in development only
    if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    
    // Log response time
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        }
    });
    
    next();
}

// Success response helper
function successResponse(data, message = 'Success') {
    return {
        success: true,
        message,
        data
    };
}

// Error response helper
function errorResponse(message = 'Error occurred', statusCode = 500) {
    return {
        success: false,
        message,
        statusCode
    };
}

module.exports = {
    logger,
    successResponse,
    errorResponse
};
