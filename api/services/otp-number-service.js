/**
 * OTP Number Service - Enhanced service for managing phone numbers and OTP operations
 * Integrates with multiple providers and manages orders in MongoDB
 */

const { connectToMongoDB } = require('../config/database');

class OTPNumberService {
    constructor() {
        this.providers = {
            '5sim': {
                baseUrl: process.env.FIVESIM_BASE_URL || 'https://5sim.net/v1',
                apiKey: process.env.FIVESIM_API_KEY || '',
                endpoints: {
                    countries: '/countries',
                    products: '/products',
                    buy: '/buy',
                    check: '/check',
                    finish: '/finish',
                    cancel: '/cancel'
                }
            },
            'sms-activate': {
                baseUrl: process.env.SMS_ACTIVATE_BASE_URL || 'https://api.sms-activate.org/stubs/handler_api.php',
                apiKey: process.env.SMS_ACTIVATE_API_KEY || '',
                endpoints: {
                    getNumbers: 'getNumbers',
                    getStatus: 'getStatus',
                    setStatus: 'setStatus',
                    getBalance: 'getBalance'
                }
            },
            'smshub': {
                baseUrl: process.env.SMSHUB_BASE_URL || 'https://smshub.org/stubs/handler_api.php',
                apiKey: process.env.SMSHUB_API_KEY || '',
                endpoints: {
                    getNumbers: 'getNumbers',
                    getStatus: 'getStatus',
                    setStatus: 'setStatus',
                    getBalance: 'getBalance'
                }
            }
        };
        
        this.activeOrders = new Map();
        this.initDatabase();
    }

    async initDatabase() {
        try {
            const { db } = await connectToMongoDB();
            if (!db) {
                return;
            }

            // Create collections if they don't exist
            const collections = ['orders', 'users', 'transactions'];
            for (const collectionName of collections) {
                try {
                    await db.createCollection(collectionName);
                } catch (error) {
                    // Collection might already exist
                    if (error.code !== 48) {
                        console.warn(`Warning creating collection ${collectionName}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.warn('Database initialization failed:', error.message);
        }
    }

    /**
     * Get available countries for a provider
     */
    async getCountries(provider = '5sim') {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            if (provider === '5sim') {
                const response = await fetch(`${providerConfig.baseUrl}${providerConfig.endpoints.countries}`, {
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const countries = await response.json();
                return this.formatCountries(countries, provider);
            }

            // For other providers, return default countries
            return this.getDefaultCountries();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get available products/services
     */
    async getProducts(provider = '5sim', country = 'russia') {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            if (provider === '5sim') {
                const response = await fetch(`${providerConfig.baseUrl}${providerConfig.endpoints.products}/${country}`, {
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const products = await response.json();
                return this.formatProducts(products, provider);
            }

            // For other providers, return default products
            return this.getDefaultProducts();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Purchase a phone number
     */
    async buyNumber(provider = '5sim', country = 'russia', product = 'any', operator = 'any', userId = null) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            if (provider === '5sim') {
                const response = await fetch(`${providerConfig.baseUrl}${providerConfig.endpoints.buy}/activation/${country}/${operator}/${product}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const order = await response.json();
                
                // Store order information
                this.activeOrders.set(order.id, {
                    provider,
                    order,
                    timestamp: Date.now(),
                    status: 'waiting'
                });

                // Save to database if available
                await this.saveOrder({
                    orderId: order.id,
                    phone: order.phone,
                    country: country,
                    product: product,
                    provider: provider,
                    cost: order.cost,
                    userId: userId,
                    status: 'waiting',
                    createdAt: new Date()
                });

                return {
                    success: true,
                    orderId: order.id,
                    phone: order.phone,
                    country: country,
                    product: product,
                    cost: order.cost,
                    provider: provider,
                    expires: order.expires || (Date.now() + 20 * 60 * 1000) // 20 minutes default
                };
            }

            // For other providers
            return this.buyNumberOtherProvider(provider, country, product, userId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check for SMS/OTP
     */
    async checkSMS(provider = '5sim', orderId) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            if (provider === '5sim') {
                const response = await fetch(`${providerConfig.baseUrl}${providerConfig.endpoints.check}/${orderId}`, {
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                
                if (result.sms && result.sms.length > 0) {
                    // Update order status
                    const order = this.activeOrders.get(orderId);
                    if (order) {
                        order.status = 'received';
                        order.sms = result.sms;
                    }

                    // Update in database
                    await this.updateOrder(orderId, {
                        status: 'received',
                        sms: result.sms,
                        code: this.extractCode(result.sms[0].text),
                        receivedAt: new Date()
                    });

                    return {
                        success: true,
                        sms: result.sms,
                        code: this.extractCode(result.sms[0].text),
                        fullText: result.sms[0].text,
                        sender: result.sms[0].sender,
                        timestamp: result.sms[0].date
                    };
                }

                return {
                    success: true,
                    sms: [],
                    waiting: true
                };
            }

            // For other providers
            return this.checkSMSOtherProvider(provider, orderId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Finish order (mark as completed)
     */
    async finishOrder(provider = '5sim', orderId) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            if (provider === '5sim') {
                const response = await fetch(`${providerConfig.baseUrl}${providerConfig.endpoints.finish}/${orderId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Update order status
                const order = this.activeOrders.get(orderId);
                if (order) {
                    order.status = 'completed';
                }

                // Update in database
                await this.updateOrder(orderId, {
                    status: 'completed',
                    completedAt: new Date()
                });

                return { success: true };
            }

            // For other providers
            return this.finishOrderOtherProvider(provider, orderId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cancel order
     */
    async cancelOrder(provider = '5sim', orderId) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            if (provider === '5sim') {
                const response = await fetch(`${providerConfig.baseUrl}${providerConfig.endpoints.cancel}/${orderId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Update order status
                const order = this.activeOrders.get(orderId);
                if (order) {
                    order.status = 'cancelled';
                }

                // Update in database
                await this.updateOrder(orderId, {
                    status: 'cancelled',
                    cancelledAt: new Date()
                });

                return { success: true };
            }

            // For other providers
            return this.cancelOrderOtherProvider(provider, orderId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get provider balance
     */
    async getBalance(provider = '5sim') {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            if (provider === '5sim') {
                const response = await fetch(`${providerConfig.baseUrl}/user/profile`, {
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const profile = await response.json();
                return {
                    success: true,
                    balance: profile.balance,
                    email: profile.email,
                    status: profile.status
                };
            }

            // For other providers
            return this.getBalanceOtherProvider(provider);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get user orders
     */
    async getUserOrders(userId) {
        try {
            const { db } = await connectToMongoDB();
            if (!db) {
                return [];
            }

            const orders = await db.collection('orders')
                .find({ userId: userId })
                .sort({ createdAt: -1 })
                .toArray();

            return orders;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get order statistics
     */
    async getOrderStatistics(userId = null) {
        try {
            const { db } = await connectToMongoDB();
            if (!db) {
                return {
                    total: 0,
                    completed: 0,
                    pending: 0,
                    cancelled: 0,
                    totalEarnings: 0
                };
            }

            const matchStage = userId ? { userId: userId } : {};
            
            const stats = await db.collection('orders').aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        totalEarnings: { $sum: '$cost' },
                        completed: {
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        },
                        pending: {
                            $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] }
                        },
                        cancelled: {
                            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                        }
                    }
                }
            ]).toArray();

            return stats[0] || {
                total: 0,
                completed: 0,
                pending: 0,
                cancelled: 0,
                totalEarnings: 0
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Save order to database
     */
    async saveOrder(orderData) {
        try {
            const { db } = await connectToMongoDB();
            if (!db) {
                return null;
            }

            const result = await db.collection('orders').insertOne(orderData);
            return result.insertedId;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get order from database
     */
    async getOrder(orderId) {
        try {
            const { db } = await connectToMongoDB();
            if (!db) {
                return null;
            }

            const order = await db.collection('orders').findOne({ orderId: orderId });
            return order;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update order in database
     */
    async updateOrder(orderId, updateData) {
        try {
            const { db } = await connectToMongoDB();
            if (!db) {
                return false;
            }

            const result = await db.collection('orders').updateOne(
                { orderId: orderId },
                { $set: { ...updateData, updatedAt: new Date() } }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get active orders
     */
    getActiveOrders() {
        return Array.from(this.activeOrders.entries()).map(([id, order]) => ({
            id,
            ...order
        }));
    }

    /**
     * Helper methods
     */
    formatCountries(countries, provider) {
        if (provider === '5sim') {
            return Object.keys(countries).map(code => ({
                code,
                name: countries[code].title,
                flag: countries[code].flag,
                products: countries[code].products
            }));
        }
        return [];
    }

    formatProducts(products, provider) {
        if (provider === '5sim') {
            return Object.keys(products).map(name => ({
                name,
                count: products[name].count,
                price: products[name].price,
                operators: products[name].operators
            }));
        }
        return [];
    }

    getDefaultCountries() {
        return [
            { code: 'russia', name: 'Russia', flag: '🇷🇺' },
            { code: 'ukraine', name: 'Ukraine', flag: '🇺🇦' },
            { code: 'kazakhstan', name: 'Kazakhstan', flag: '🇰🇿' },
            { code: 'china', name: 'China', flag: '🇨🇳' },
            { code: 'usa', name: 'United States', flag: '🇺🇸' },
            { code: 'india', name: 'India', flag: '🇮🇳' }
        ];
    }

    getDefaultProducts() {
        return [
            { name: 'any', count: 100, price: 1.0 },
            { name: 'google', count: 50, price: 1.5 },
            { name: 'whatsapp', count: 30, price: 2.0 },
            { name: 'telegram', count: 25, price: 2.5 },
            { name: 'uber', count: 20, price: 3.0 }
        ];
    }

    extractCode(smsText) {
        // Extract 4-6 digit code from SMS text
        const codeMatch = smsText.match(/\b\d{4,6}\b/);
        return codeMatch ? codeMatch[0] : null;
    }

    // Placeholder methods for other providers
    async buyNumberOtherProvider(provider, country, product, userId) {
        // Implementation for other providers
        throw new Error(`${provider} integration not implemented yet`);
    }

    async checkSMSOtherProvider(provider, orderId) {
        // Implementation for other providers
        throw new Error(`${provider} integration not implemented yet`);
    }

    async finishOrderOtherProvider(provider, orderId) {
        // Implementation for other providers
        throw new Error(`${provider} integration not implemented yet`);
    }

    async cancelOrderOtherProvider(provider, orderId) {
        // Implementation for other providers
        throw new Error(`${provider} integration not implemented yet`);
    }

    async getBalanceOtherProvider(provider) {
        // Implementation for other providers
        throw new Error(`${provider} integration not implemented yet`);
    }
}

module.exports = OTPNumberService;
