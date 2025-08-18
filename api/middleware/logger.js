// Logger middleware
function logger(req, res, next) {
    const start = Date.now();
    
    // Log request in development only
    if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Log response in development only
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
        data,
        timestamp: new Date().toISOString()
    };
}

// Error response helper
function errorResponse(message, status = 400) {
    return {
        success: false,
        message,
        status,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    logger,
    successResponse,
    errorResponse
};
