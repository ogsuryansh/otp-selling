/**
 * OTP API Endpoints for Telegram Bot
 * Handles phone number purchasing, SMS checking, and order management
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// OTP Orders API endpoints
router.get('/orders', async (req, res) => {
    try {
        const ordersPath = path.join(__dirname, '../../backend/data/orders.json');
        
        let orders;
        // Check if file exists, if not create default structure
        try {
            const ordersData = await fs.readFile(ordersPath, 'utf8');
            orders = JSON.parse(ordersData);
        } catch (fileError) {
            // Create default orders structure if file doesn't exist
            const defaultOrders = {
                orders: {},
                statistics: {
                    total_orders: 0,
                    completed_orders: 0,
                    pending_orders: 0,
                    failed_orders: 0
                }
            };
            
            // Ensure directory exists
            const dir = path.dirname(ordersPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Write default file
            await fs.writeFile(ordersPath, JSON.stringify(defaultOrders, null, 2));
            
            orders = defaultOrders;
        }
        
        const { status, provider, user_id, limit = 100, page = 1 } = req.query;
        
        let filteredOrders = Object.entries(orders.orders || {}).map(([id, order]) => ({
            order_id: id,
            ...order
        }));
        
        // Apply filters
        if (status) {
            filteredOrders = filteredOrders.filter(order => order.status === status);
        }
        
        if (provider) {
            filteredOrders = filteredOrders.filter(order => order.provider === provider);
        }
        
        if (user_id) {
            filteredOrders = filteredOrders.filter(order => order.user_id === parseInt(user_id));
        }
        
        // Sort by creation date (newest first)
        filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: {
                orders: paginatedOrders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredOrders.length,
                    totalPages: Math.ceil(filteredOrders.length / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

router.get('/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const ordersPath = path.join(__dirname, '../../backend/data/orders.json');
        
        let orders;
        try {
            const ordersData = await fs.readFile(ordersPath, 'utf8');
            orders = JSON.parse(ordersData);
        } catch (fileError) {
            return res.status(404).json({ success: false, error: 'Orders data not found' });
        }
        
        const order = orders.orders?.[orderId];
        
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        res.json({
            success: true,
            data: {
                order_id: orderId,
                ...order
            }
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
});

router.get('/statistics', async (req, res) => {
    try {
        const ordersPath = path.join(__dirname, '../../backend/data/orders.json');
        
        let orders;
        try {
            const ordersData = await fs.readFile(ordersPath, 'utf8');
            orders = JSON.parse(ordersData);
        } catch (fileError) {
            // Return default statistics if file doesn't exist
            const defaultStats = {
                total_orders: 0,
                completed_orders: 0,
                pending_orders: 0,
                failed_orders: 0
            };
            return res.json({
                success: true,
                data: defaultStats
            });
        }
        
        res.json({
            success: true,
            data: orders.statistics || {}
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

router.get('/providers', async (req, res) => {
    try {
        const providersPath = path.join(__dirname, '../../backend/providers.json');
        const providersData = await fs.readFile(providersPath, 'utf8');
        const providers = JSON.parse(providersData);
        
        // Get provider balances (this would require actual API calls in production)
        const providersWithBalance = Object.keys(providers).map(provider => ({
            name: provider,
            config: providers[provider],
            balance: 0, // Placeholder - would be fetched from actual API
            status: 'active'
        }));
        
        res.json({
            success: true,
            data: providersWithBalance
        });
    } catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch providers' });
    }
});

router.get('/prices/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const providersPath = path.join(__dirname, '../../backend/providers.json');
        const providersData = await fs.readFile(providersPath, 'utf8');
        const providers = JSON.parse(providersData);
        
        if (!providers[provider]) {
            return res.status(404).json({ success: false, error: 'Provider not found' });
        }
        
        // In a real implementation, this would make an API call to the provider
        // For now, return mock data
        const mockPrices = {
            '5sim': {
                whatsapp: { cost: 15, count: 50, currency: 'RUB' },
                telegram: { cost: 12, count: 30, currency: 'RUB' },
                paytm: { cost: 20, count: 25, currency: 'RUB' },
                gmail: { cost: 18, count: 40, currency: 'RUB' }
            },
            'smsactivate': {
                wa: { cost: 0.25, count: 100, currency: 'USD' },
                tg: { cost: 0.20, count: 80, currency: 'USD' },
                paytm: { cost: 0.30, count: 60, currency: 'USD' },
                gm: { cost: 0.28, count: 90, currency: 'USD' }
            }
        };
        
        res.json({
            success: true,
            data: {
                provider,
                country: 'IN',
                prices: mockPrices[provider] || {}
            }
        });
    } catch (error) {
        console.error('Error fetching prices:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch prices' });
    }
});

router.post('/orders/:orderId/cancel', async (req, res) => {
    try {
        const { orderId } = req.params;
        const ordersPath = path.join(__dirname, '../../backend/data/orders.json');
        const ordersData = await fs.readFile(ordersPath, 'utf8');
        const orders = JSON.parse(ordersData);
        
        const order = orders.orders?.[orderId];
        
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        // Update order status
        orders.orders[orderId].status = 'cancelled';
        orders.orders[orderId].cancelled_at = new Date().toISOString();
        orders.orders[orderId].updated_at = new Date().toISOString();
        
        // Save updated orders
        await fs.writeFile(ordersPath, JSON.stringify(orders, null, 2));
        
        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: {
                order_id: orderId,
                status: 'cancelled'
            }
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, error: 'Failed to cancel order' });
    }
});

router.post('/orders/:orderId/finish', async (req, res) => {
    try {
        const { orderId } = req.params;
        const ordersPath = path.join(__dirname, '../../backend/data/orders.json');
        const ordersData = await fs.readFile(ordersPath, 'utf8');
        const orders = JSON.parse(ordersData);
        
        const order = orders.orders?.[orderId];
        
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        // Update order status
        orders.orders[orderId].status = 'completed';
        orders.orders[orderId].completed_at = new Date().toISOString();
        orders.orders[orderId].updated_at = new Date().toISOString();
        
        // Save updated orders
        await fs.writeFile(ordersPath, JSON.stringify(orders, null, 2));
        
        res.json({
            success: true,
            message: 'Order completed successfully',
            data: {
                order_id: orderId,
                status: 'completed'
            }
        });
    } catch (error) {
        console.error('Error finishing order:', error);
        res.status(500).json({ success: false, error: 'Failed to finish order' });
    }
});

router.get('/search', async (req, res) => {
    try {
        const { q, limit = 50 } = req.query;
        
        if (!q) {
            return res.status(400).json({ success: false, error: 'Search query is required' });
        }
        
        const ordersPath = path.join(__dirname, '../../backend/data/orders.json');
        const ordersData = await fs.readFile(ordersPath, 'utf8');
        const orders = JSON.parse(ordersData);
        
        const searchQuery = q.toLowerCase();
        const searchResults = [];
        
        for (const [orderId, order] of Object.entries(orders.orders || {})) {
            // Search in phone number
            if (order.phone_number && order.phone_number.toLowerCase().includes(searchQuery)) {
                searchResults.push({ order_id: orderId, ...order });
                continue;
            }
            
            // Search in service
            if (order.service && order.service.toLowerCase().includes(searchQuery)) {
                searchResults.push({ order_id: orderId, ...order });
                continue;
            }
            
            // Search in provider
            if (order.provider && order.provider.toLowerCase().includes(searchQuery)) {
                searchResults.push({ order_id: orderId, ...order });
                continue;
            }
            
            // Search in order ID
            if (orderId.toLowerCase().includes(searchQuery)) {
                searchResults.push({ order_id: orderId, ...order });
                continue;
            }
        }
        
        // Sort by creation date (newest first)
        searchResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json({
            success: true,
            data: {
                results: searchResults.slice(0, parseInt(limit)),
                total: searchResults.length,
                query: q
            }
        });
    } catch (error) {
        console.error('Error searching orders:', error);
        res.status(500).json({ success: false, error: 'Failed to search orders' });
    }
});

module.exports = router;
