// Validation utilities
const { AppError } = require('../middleware/errorHandler');

// Validate required fields
function validateRequired(data) {
    return data !== undefined && data !== null && data.toString().trim() !== '';
}

// Validate multiple required fields
function validateRequiredFields(data, fields) {
    const missing = [];
    
    fields.forEach(field => {
        if (!data[field] || data[field].toString().trim() === '') {
            missing.push(field);
        }
    });
    
    if (missing.length > 0) {
        throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400);
    }
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new AppError('Invalid email format', 400);
    }
}

// Validate numeric value
function validateNumeric(value, fieldName) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
        throw new AppError(`${fieldName} must be a positive number`, 400);
    }
    return num;
}

// Validate ObjectId format
function validateObjectId(id) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
}

// Sanitize input
function sanitizeInput(input) {
    if (typeof input === 'string') {
        return input.trim().replace(/[<>]/g, '');
    }
    return input;
}

module.exports = {
    validateRequired,
    validateRequiredFields,
    validateEmail,
    validateNumeric,
    validateObjectId,
    sanitizeInput
};
