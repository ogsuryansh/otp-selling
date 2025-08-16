/**
 * OTP Number Selling API Routes
 * Focused on phone number operations only - no mail selling functionality
 */

const express = require('express');
const router = express.Router();
const OTPNumberService = require('./services/otp-number-service');

// Initialize OTP service
const otpService = new OTPNumberService();

// Middleware to check if user is authenticated
const authenticateUser = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.user_id;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'User authentication required',
            message: 'Please provide user ID in headers or query parameters'
        });
    }
    
    req.userId = userId;
    next();
};

// Get available countries for a provider
router.get('/countries', async (req, res) => {
    try {
        const { provider = '5sim' } = req.query;
        
        const countries = await otpService.getCountries(provider);
        
        res.json({
            success: true,
            data: {
                countries,
                provider,
                total: countries.length
            }
        });
    } catch (error) {
        console.error('Error getting countries:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve countries'
        });
    }
});

// Get available products/services for a country
router.get('/products', async (req, res) => {
    try {
        const { provider = '5sim', country = 'russia' } = req.query;
        
        const products = await otpService.getProducts(provider, country);
        
        res.json({
            success: true,
            data: {
                products,
                country,
                provider,
                total: products.length
            }
        });
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve products'
        });
    }
});

// Buy a phone number for OTP
router.post('/buy', authenticateUser, async (req, res) => {
    try {
        const { 
            provider = '5sim', 
            country = 'russia', 
            product = 'any', 
            operator = 'any' 
        } = req.body;
        
        const userId = req.userId;
        
        // Validate required fields
        if (!country || !product) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Country and product are required'
            });
        }
        
        const order = await otpService.buyNumber(provider, country, product, operator, userId);
        
        res.json({
            success: true,
            data: {
                order,
                message: `Phone number purchased successfully! Number: ${order.phone}`
            }
        });
    } catch (error) {
        console.error('Error buying number:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to purchase phone number'
        });
    }
});

// Check for OTP/SMS messages
router.get('/check/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { provider = '5sim' } = req.query;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing order ID',
                message: 'Order ID is required'
            });
        }
        
        const result = await otpService.checkSMS(provider, orderId);
        
        res.json({
            success: true,
            data: {
                result,
                orderId,
                message: result.sms && result.sms.length > 0 
                    ? `OTP received: ${result.sms[0].text || 'SMS received'}` 
                    : 'Waiting for SMS...'
            }
        });
    } catch (error) {
        console.error('Error checking SMS:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to check SMS'
        });
    }
});

// Finish/complete an order
router.post('/finish/:orderId', authenticateUser, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { provider = '5sim' } = req.body;
        const userId = req.userId;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing order ID',
                message: 'Order ID is required'
            });
        }
        
        // Verify order belongs to user
        const order = await otpService.getOrder(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
                message: 'The specified order does not exist'
            });
        }
        
        if (order.user_id != userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You can only finish your own orders'
            });
        }
        
        const result = await otpService.finishOrder(provider, orderId);
        
        res.json({
            success: true,
            data: {
                result,
                message: 'Order completed successfully!'
            }
        });
    } catch (error) {
        console.error('Error finishing order:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to finish order'
        });
    }
});

// Cancel an order
router.post('/cancel/:orderId', authenticateUser, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { provider = '5sim' } = req.body;
        const userId = req.userId;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing order ID',
                message: 'Order ID is required'
            });
        }
        
        // Verify order belongs to user
        const order = await otpService.getOrder(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
                message: 'The specified order does not exist'
            });
        }
        
        if (order.user_id != userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You can only cancel your own orders'
            });
        }
        
        const result = await otpService.cancelOrder(provider, orderId);
        
        res.json({
            success: true,
            data: {
                result,
                message: 'Order cancelled successfully!'
            }
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to cancel order'
        });
    }
});

// Get provider balance
router.get('/balance', async (req, res) => {
    try {
        const { provider = '5sim' } = req.query;
        
        const balance = await otpService.getBalance(provider);
        
        res.json({
            success: true,
            data: {
                balance,
                provider
            }
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve balance'
        });
    }
});

// Get user's orders
router.get('/orders', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 50, page = 1, status, provider } = req.query;
        
        const result = await otpService.getUserOrders(userId, parseInt(limit), parseInt(page));
        
        // Apply additional filters if provided
        let filteredOrders = result.orders;
        
        if (status) {
            filteredOrders = filteredOrders.filter(order => order.status === status);
        }
        
        if (provider) {
            filteredOrders = filteredOrders.filter(order => order.provider === provider);
        }
        
        res.json({
            success: true,
            data: {
                orders: filteredOrders,
                pagination: {
                    ...result.pagination,
                    filteredCount: filteredOrders.length
                }
            }
        });
    } catch (error) {
        console.error('Error getting user orders:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve orders'
        });
    }
});

// Get specific order details
router.get('/orders/:orderId', authenticateUser, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.userId;
        
        const order = await otpService.getOrder(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
                message: 'The specified order does not exist'
            });
        }
        
        // Verify order belongs to user
        if (order.user_id != userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You can only view your own orders'
            });
        }
        
        res.json({
            success: true,
            data: {
                order
            }
        });
    } catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve order'
        });
    }
});

// Get order statistics
router.get('/statistics', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        
        const stats = await otpService.getOrderStatistics(userId);
        
        res.json({
            success: true,
            data: {
                statistics: stats,
                userId
            }
        });
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve statistics'
        });
    }
});

// Get service status
router.get('/status', async (req, res) => {
    try {
        const { provider = '5sim' } = req.query;
        
        const balance = await otpService.getBalance(provider);
        const activeOrders = otpService.activeOrders.size;
        
        res.json({
            success: true,
            data: {
                provider,
                balance: balance.balance,
                currency: balance.currency,
                activeOrders,
                status: 'operational',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting service status:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            status: 'error',
            message: 'Failed to retrieve service status'
        });
    }
});

// Get available providers
router.get('/providers', async (req, res) => {
    try {
        const providers = Object.entries(otpService.providers).map(([key, config]) => ({
            id: key,
            name: config.name,
            baseUrl: config.baseUrl,
            hasApiKey: !!config.apiKey
        }));
        
        res.json({
            success: true,
            data: {
                providers,
                total: providers.length
            }
        });
    } catch (error) {
        console.error('Error getting providers:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve providers'
        });
    }
});

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const isConnected = await otpService.connectToMongoDB();
        
        res.json({
            success: true,
            data: {
                status: 'healthy',
                mongodb: isConnected ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString(),
                service: 'OTP Number Service'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            status: 'unhealthy'
        });
    }
});

module.exports = router;
