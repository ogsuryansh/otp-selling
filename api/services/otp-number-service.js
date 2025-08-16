/**
 * OTP Number Selling Service - Focused on phone number operations only
 * Handles phone number purchasing, OTP receiving, and service management
 * No mail selling functionality included
 */

const { MongoClient } = require('mongodb');

class OTPNumberService {
    constructor() {
        this.mongoUri = process.env.MONGODB_URI;
        this.database = process.env.MONGODB_DATABASE || 'otp_bot';
        this.client = null;
        this.db = null;
        
        // Supported OTP providers
        this.providers = {
            '5sim': {
                name: '5sim.net',
                baseUrl: 'https://5sim.net/v1',
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
                name: 'SMS-Activate',
                baseUrl: 'https://api.sms-activate.org/stubs/handler_api.php',
                apiKey: process.env.SMS_ACTIVATE_API_KEY || '',
                endpoints: {
                    getNumbers: 'getNumbers',
                    getStatus: 'getStatus',
                    setStatus: 'setStatus',
                    getBalance: 'getBalance'
                }
            },
            'smshub': {
                name: 'SMSHub',
                baseUrl: 'https://smshub.org/stubs/handler_api.php',
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
        this.serviceStatus = new Map();
    }

    /**
     * Connect to MongoDB
     */
    async connectToMongoDB() {
        try {
            if (!this.mongoUri) {
                throw new Error('MongoDB URI not configured');
            }
            
            this.client = new MongoClient(this.mongoUri, {
                serverSelectionTimeoutMS: 15000,
                maxPoolSize: 10,
                retryWrites: true,
                w: 'majority'
            });
            
            await this.client.connect();
            this.db = this.client.db(this.database);
            
            // Initialize collections if they don't exist
            await this.initializeCollections();
            
            return true;
        } catch (error) {
            console.error('MongoDB connection failed:', error);
            return false;
        }
    }

    /**
     * Initialize required collections
     */
    async initializeCollections() {
        try {
            const collections = ['otp_orders', 'otp_services', 'otp_providers'];
            
            for (const collectionName of collections) {
                const collection = this.db.collection(collectionName);
                await collection.createIndex({ createdAt: -1 });
                
                if (collectionName === 'otp_orders') {
                    await collection.createIndex({ user_id: 1 });
                    await collection.createIndex({ status: 1 });
                    await collection.createIndex({ provider: 1 });
                }
            }
        } catch (error) {
            console.error('Error initializing collections:', error);
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
            console.error(`Error getting countries for ${provider}:`, error);
            throw error;
        }
    }

    /**
     * Get available products/services for a country
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
                return this.formatProducts(products, provider, country);
            }

            // For other providers, return default products
            return this.getDefaultProducts(country);
        } catch (error) {
            console.error(`Error getting products for ${provider}/${country}:`, error);
            throw error;
        }
    }

    /**
     * Buy a phone number for OTP
     */
    async buyNumber(provider = '5sim', country = 'russia', product = 'any', operator = 'any', userId = null) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            let orderResult;
            
            if (provider === '5sim') {
                const response = await fetch(`${providerConfig.baseUrl}${providerConfig.endpoints.buy}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        country: country,
                        product: product,
                        operator: operator
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                orderResult = await response.json();
            } else {
                // For other providers, implement their specific logic
                orderResult = await this.buyNumberFromOtherProvider(provider, country, product, operator);
            }

            // Save order to database
            const order = {
                order_id: orderResult.id || orderResult.phone,
                provider: provider,
                country: country,
                product: product,
                operator: operator,
                phone: orderResult.phone,
                status: 'pending',
                user_id: userId,
                created_at: new Date(),
                updated_at: new Date(),
                provider_data: orderResult
            };

            await this.saveOrder(order);
            this.activeOrders.set(order.order_id, order);

            return order;
        } catch (error) {
            console.error(`Error buying number from ${provider}:`, error);
            throw error;
        }
    }

    /**
     * Check for OTP/SMS messages
     */
    async checkSMS(provider = '5sim', orderId) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            let smsResult;
            
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

                smsResult = await response.json();
            } else {
                // For other providers, implement their specific logic
                smsResult = await this.checkSMSFromOtherProvider(provider, orderId);
            }

            // Update order with SMS data
            if (smsResult.sms && smsResult.sms.length > 0) {
                const order = await this.getOrder(orderId);
                if (order) {
                    order.sms = smsResult.sms;
                    order.status = 'sms_received';
                    order.updated_at = new Date();
                    await this.updateOrder(order);
                }
            }

            return smsResult;
        } catch (error) {
            console.error(`Error checking SMS from ${provider}:`, error);
            throw error;
        }
    }

    /**
     * Finish/complete an order
     */
    async finishOrder(provider = '5sim', orderId) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            let finishResult;
            
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

                finishResult = await response.json();
            } else {
                // For other providers, implement their specific logic
                finishResult = await this.finishOrderFromOtherProvider(provider, orderId);
            }

            // Update order status
            const order = await this.getOrder(orderId);
            if (order) {
                order.status = 'completed';
                order.updated_at = new Date();
                order.completed_at = new Date();
                await this.updateOrder(order);
            }

            // Remove from active orders
            this.activeOrders.delete(orderId);

            return finishResult;
        } catch (error) {
            console.error(`Error finishing order from ${provider}:`, error);
            throw error;
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(provider = '5sim', orderId) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig) {
                throw new Error(`Provider ${provider} not supported`);
            }

            let cancelResult;
            
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

                cancelResult = await response.json();
            } else {
                // For other providers, implement their specific logic
                cancelResult = await this.cancelOrderFromOtherProvider(provider, orderId);
            }

            // Update order status
            const order = await this.getOrder(orderId);
            if (order) {
                order.status = 'cancelled';
                order.updated_at = new Date();
                order.cancelled_at = new Date();
                await this.updateOrder(order);
            }

            // Remove from active orders
            this.activeOrders.delete(orderId);

            return cancelResult;
        } catch (error) {
            console.error(`Error cancelling order from ${provider}:`, error);
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
                    balance: profile.balance || 0,
                    currency: profile.currency || 'RUB',
                    provider: provider
                };
            }

            // For other providers, implement their specific logic
            return await this.getBalanceFromOtherProvider(provider);
        } catch (error) {
            console.error(`Error getting balance from ${provider}:`, error);
            throw error;
        }
    }

    /**
     * Get all orders for a user
     */
    async getUserOrders(userId, limit = 50, page = 1) {
        try {
            if (!this.db) {
                await this.connectToMongoDB();
            }

            const collection = this.db.collection('otp_orders');
            const skip = (page - 1) * limit;

            const orders = await collection
                .find({ user_id: userId })
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            const total = await collection.countDocuments({ user_id: userId });

            return {
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting user orders:', error);
            throw error;
        }
    }

    /**
     * Get order statistics
     */
    async getOrderStatistics(userId = null) {
        try {
            if (!this.db) {
                await this.connectToMongoDB();
            }

            const collection = this.db.collection('otp_orders');
            let matchStage = {};
            
            if (userId) {
                matchStage.user_id = userId;
            }

            const stats = await collection.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        total_cost: { $sum: '$cost' || 0 }
                    }
                }
            ]).toArray();

            const totalOrders = await collection.countDocuments(matchStage);
            const totalCost = await collection.aggregate([
                { $match: matchStage },
                { $group: { _id: null, total: { $sum: '$cost' || 0 } } }
            ]).toArray();

            return {
                totalOrders,
                totalCost: totalCost[0]?.total || 0,
                byStatus: stats,
                activeOrders: this.activeOrders.size
            };
        } catch (error) {
            console.error('Error getting order statistics:', error);
            throw error;
        }
    }

    // Database operations
    async saveOrder(order) {
        try {
            if (!this.db) {
                await this.connectToMongoDB();
            }

            const collection = this.db.collection('otp_orders');
            await collection.insertOne(order);
        } catch (error) {
            console.error('Error saving order:', error);
            throw error;
        }
    }

    async getOrder(orderId) {
        try {
            if (!this.db) {
                await this.connectToMongoDB();
            }

            const collection = this.db.collection('otp_orders');
            return await collection.findOne({ order_id: orderId });
        } catch (error) {
            console.error('Error getting order:', error);
            throw error;
        }
    }

    async updateOrder(order) {
        try {
            if (!this.db) {
                await this.connectToMongoDB();
            }

            const collection = this.db.collection('otp_orders');
            await collection.updateOne(
                { order_id: order.order_id },
                { $set: order }
            );
        } catch (error) {
            console.error('Error updating order:', error);
            throw error;
        }
    }

    // Helper methods
    formatCountries(countries, provider) {
        if (provider === '5sim') {
            return Object.entries(countries).map(([code, data]) => ({
                code,
                name: data.country,
                flag: data.flag || '',
                count: data.count || 0
            }));
        }
        return countries;
    }

    formatProducts(products, provider, country) {
        if (provider === '5sim') {
            return Object.entries(products).map(([service, data]) => ({
                service,
                name: data.name || service,
                count: data.count || 0,
                price: data.price || 0,
                cost: data.cost || 0
            }));
        }
        return products;
    }

    getDefaultCountries() {
        return [
            { code: 'russia', name: 'Russia', flag: '🇷🇺', count: 1000 },
            { code: 'usa', name: 'United States', flag: '🇺🇸', count: 500 },
            { code: 'uk', name: 'United Kingdom', flag: '🇬🇧', count: 300 },
            { code: 'germany', name: 'Germany', flag: '🇩🇪', count: 250 },
            { code: 'france', name: 'France', flag: '🇫🇷', count: 200 }
        ];
    }

    getDefaultProducts(country) {
        return [
            { service: 'telegram', name: 'Telegram', count: 100, price: 10, cost: 10 },
            { service: 'whatsapp', name: 'WhatsApp', count: 80, price: 15, cost: 15 },
            { service: 'uber', name: 'Uber', count: 50, price: 20, cost: 20 },
            { service: 'gmail', name: 'Gmail', count: 120, price: 25, cost: 25 }
        ];
    }

    // Placeholder methods for other providers
    async buyNumberFromOtherProvider(provider, country, product, operator) {
        // Implement specific logic for other providers
        throw new Error(`Buy number not implemented for ${provider}`);
    }

    async checkSMSFromOtherProvider(provider, orderId) {
        // Implement specific logic for other providers
        throw new Error(`Check SMS not implemented for ${provider}`);
    }

    async finishOrderFromOtherProvider(provider, orderId) {
        // Implement specific logic for other providers
        throw new Error(`Finish order not implemented for ${provider}`);
    }

    async cancelOrderFromOtherProvider(provider, orderId) {
        // Implement specific logic for other providers
        throw new Error(`Cancel order not implemented for ${provider}`);
    }

    async getBalanceFromOtherProvider(provider) {
        // Implement specific logic for other providers
        throw new Error(`Get balance not implemented for ${provider}`);
    }

    // Cleanup
    async close() {
        if (this.client) {
            await this.client.close();
        }
    }
}

module.exports = OTPNumberService;
