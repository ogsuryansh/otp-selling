/**
 * Main JavaScript for OTP Number Dashboard
 * Common utilities and functions
 */

// Utility Functions
const Utils = {
    // Show loading spinner
    showLoading: function(show = true) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            if (show) {
                spinner.classList.remove('hidden');
            } else {
                spinner.classList.add('hidden');
            }
        }
    },

    // Show toast notification
    showToast: function(message, type = 'info', duration = 5000) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');
        
        if (!toast || !toastMessage || !toastIcon) return;
        
        toastMessage.textContent = message;
        
        // Set icon and colors based on type
        let iconClass = '';
        let borderColor = '';
        
        switch (type) {
            case 'success':
                iconClass = 'fas fa-check-circle text-green-500';
                borderColor = 'border-green-500';
                break;
            case 'error':
                iconClass = 'fas fa-exclamation-circle text-red-500';
                borderColor = 'border-red-500';
                break;
            case 'warning':
                iconClass = 'fas fa-exclamation-triangle text-yellow-500';
                borderColor = 'border-yellow-500';
                break;
            default:
                iconClass = 'fas fa-info-circle text-blue-500';
                borderColor = 'border-blue-500';
        }
        
        toastIcon.className = iconClass;
        const borderElement = toast.querySelector('.border-l-4');
        if (borderElement) {
            borderElement.className = `border-l-4 ${borderColor}`;
        }
        
        toast.classList.remove('hidden');
        
        // Auto-hide after specified duration
        setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    },

    // Format date
    formatDate: function(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString();
    },

    // Format datetime
    formatDateTime: function(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleString();
    },

    // Format currency
    formatCurrency: function(amount, currency = 'USD') {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Generate random ID
    generateId: function() {
        return Math.random().toString(36).substr(2, 9);
    },

    // Validate email
    isValidEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate phone number
    isValidPhone: function(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone);
    },

    // Copy to clipboard
    copyToClipboard: async function(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Copied to clipboard!', 'success');
        }
    },

    // Download file
    downloadFile: function(content, filename, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    // Local storage helpers
    storage: {
        set: function(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('Error saving to localStorage:', e);
            }
        },
        
        get: function(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Error reading from localStorage:', e);
                return defaultValue;
            }
        },
        
        remove: function(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error('Error removing from localStorage:', e);
            }
        },
        
        clear: function() {
            try {
                localStorage.clear();
            } catch (e) {
                console.error('Error clearing localStorage:', e);
            }
        }
    },

    // Session storage helpers
    session: {
        set: function(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('Error saving to sessionStorage:', e);
            }
        },
        
        get: function(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Error reading from sessionStorage:', e);
                return defaultValue;
            }
        },
        
        remove: function(key) {
            try {
                sessionStorage.removeItem(key);
            } catch (e) {
                console.error('Error removing from sessionStorage:', e);
            }
        },
        
        clear: function() {
            try {
                sessionStorage.clear();
            } catch (e) {
                console.error('Error clearing sessionStorage:', e);
            }
        }
    }
};

// API Helper Functions
const API = {
    // Base API URL
    baseURL: '/api/otp-number',

    // Make API request
    request: async function(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': Utils.session.get('userId') || '12345'
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // GET request
    get: function(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    },

    // POST request
    post: function(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    put: function(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    delete: function(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
};

// DOM Helper Functions
const DOM = {
    // Create element with attributes
    createElement: function(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    },

    // Get element by selector
    get: function(selector) {
        return document.querySelector(selector);
    },

    // Get all elements by selector
    getAll: function(selector) {
        return document.querySelectorAll(selector);
    },

    // Add event listener
    on: function(element, event, handler, options = {}) {
        if (typeof element === 'string') {
            element = this.get(element);
        }
        if (element) {
            element.addEventListener(event, handler, options);
        }
    },

    // Remove event listener
    off: function(element, event, handler, options = {}) {
        if (typeof element === 'string') {
            element = this.get(element);
        }
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    },

    // Toggle class
    toggleClass: function(element, className) {
        if (typeof element === 'string') {
            element = this.get(element);
        }
        if (element) {
            element.classList.toggle(className);
        }
    },

    // Add class
    addClass: function(element, className) {
        if (typeof element === 'string') {
            element = this.get(element);
        }
        if (element) {
            element.classList.add(className);
        }
    },

    // Remove class
    removeClass: function(element, className) {
        if (typeof element === 'string') {
            element = this.get(element);
        }
        if (element) {
            element.classList.remove(className);
        }
    },

    // Show element
    show: function(element) {
        if (typeof element === 'string') {
            element = this.get(element);
        }
        if (element) {
            element.style.display = '';
        }
    },

    // Hide element
    hide: function(element) {
        if (typeof element === 'string') {
            element = this.get(element);
        }
        if (element) {
            element.style.display = 'none';
        }
    }
};

// Validation Functions
const Validation = {
    // Required field validation
    required: function(value, fieldName = 'Field') {
        if (!value || value.trim() === '') {
            return `${fieldName} is required`;
        }
        return null;
    },

    // Email validation
    email: function(value, fieldName = 'Email') {
        if (!Utils.isValidEmail(value)) {
            return `${fieldName} must be a valid email address`;
        }
        return null;
    },

    // Phone validation
    phone: function(value, fieldName = 'Phone') {
        if (!Utils.isValidPhone(value)) {
            return `${fieldName} must be a valid phone number`;
        }
        return null;
    },

    // Min length validation
    minLength: function(value, min, fieldName = 'Field') {
        if (value && value.length < min) {
            return `${fieldName} must be at least ${min} characters long`;
        }
        return null;
    },

    // Max length validation
    maxLength: function(value, max, fieldName = 'Field') {
        if (value && value.length > max) {
            return `${fieldName} must be no more than ${max} characters long`;
        }
        return null;
    },

    // Number validation
    number: function(value, fieldName = 'Field') {
        if (value && isNaN(Number(value))) {
            return `${fieldName} must be a valid number`;
        }
        return null;
    },

    // Min value validation
    minValue: function(value, min, fieldName = 'Field') {
        if (value && Number(value) < min) {
            return `${fieldName} must be at least ${min}`;
        }
        return null;
    },

    // Max value validation
    maxValue: function(value, max, fieldName = 'Field') {
        if (value && Number(value) > max) {
            return `${fieldName} must be no more than ${max}`;
        }
        return null;
    },

    // Validate form
    validateForm: function(formData, rules) {
        const errors = {};
        
        Object.entries(rules).forEach(([field, fieldRules]) => {
            const value = formData[field];
            
            for (const rule of fieldRules) {
                const error = rule(value, field);
                if (error) {
                    errors[field] = error;
                    break;
                }
            }
        });
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

// Export utilities for use in other scripts
window.Utils = Utils;
window.API = API;
window.DOM = DOM;
window.Validation = Validation;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main JavaScript loaded successfully');
    
    // Set default user ID if not exists
    if (!Utils.session.get('userId')) {
        Utils.session.set('userId', '12345');
    }
    
    // Global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        Utils.showToast('An unexpected error occurred', 'error');
    });
    
    // Global unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        Utils.showToast('An unexpected error occurred', 'error');
    });
});
