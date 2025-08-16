/**
 * OTP API Service - Integration with 5sim.net and similar services
 * Handles phone number purchasing, OTP receiving, and service management
 */

class OTPAPIService {
    constructor() {
        this.services = {
            '5sim': {
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
     * Get available countries for a service
     */
    async getCountries(service = '5sim') {
        try {
            const serviceConfig = this.services[service];
            if (!serviceConfig) {
                throw new Error(`Service ${service} not supported`);
            }

            if (service === '5sim') {
                const response = await fetch(`${serviceConfig.baseUrl}${serviceConfig.endpoints.countries}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const countries = await response.json();
                return this.formatCountries(countries, service);
            }

            // For other services, return default countries
            return this.getDefaultCountries();
        } catch (error) {
            console.error(`Error getting countries for ${service}:`, error);
            throw error;
        }
    }

    /**
     * Get available products/services
     */
    async getProducts(service = '5sim', country = 'russia') {
        try {
            const serviceConfig = this.services[service];
            if (!serviceConfig) {
                throw new Error(`Service ${service} not supported`);
            }

            if (service === '5sim') {
                const response = await fetch(`${serviceConfig.baseUrl}${serviceConfig.endpoints.products}/${country}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const products = await response.json();
                return this.formatProducts(products, service);
            }

            // For other services, return default products
            return this.getDefaultProducts();
        } catch (error) {
            console.error(`Error getting products for ${service}:`, error);
            throw error;
        }
    }

    /**
     * Purchase a phone number
     */
    async buyNumber(service = '5sim', country = 'russia', product = 'any', operator = 'any') {
        try {
            const serviceConfig = this.services[service];
            if (!serviceConfig) {
                throw new Error(`Service ${service} not supported`);
            }

            if (service === '5sim') {
                const response = await fetch(`${serviceConfig.baseUrl}${serviceConfig.endpoints.buy}/activation/${country}/${operator}/${product}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceConfig.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const order = await response.json();
                
                // Store order information
                this.activeOrders.set(order.id, {
                    service,
                    order,
                    timestamp: Date.now(),
                    status: 'waiting'
                });

                return {
                    success: true,
                    orderId: order.id,
                    phone: order.phone,
                    country: country,
                    product: product,
                    cost: order.cost,
                    service: service,
                    expires: order.expires || (Date.now() + 20 * 60 * 1000) // 20 minutes default
                };
            }

            // For other services
            return this.buyNumberOtherService(service, country, product);
        } catch (error) {
            console.error(`Error buying number from ${service}:`, error);
            throw error;
        }
    }

    /**
     * Check for SMS/OTP
     */
    async checkSMS(service = '5sim', orderId) {
        try {
            const serviceConfig = this.services[service];
            if (!serviceConfig) {
                throw new Error(`Service ${service} not supported`);
            }

            if (service === '5sim') {
                const response = await fetch(`${serviceConfig.baseUrl}${serviceConfig.endpoints.check}/${orderId}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceConfig.apiKey}`,
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

            // For other services
            return this.checkSMSOtherService(service, orderId);
        } catch (error) {
            console.error(`Error checking SMS from ${service}:`, error);
            throw error;
        }
    }

    /**
     * Finish order (mark as completed)
     */
    async finishOrder(service = '5sim', orderId) {
        try {
            const serviceConfig = this.services[service];
            if (!serviceConfig) {
                throw new Error(`Service ${service} not supported`);
            }

            if (service === '5sim') {
                const response = await fetch(`${serviceConfig.baseUrl}${serviceConfig.endpoints.finish}/${orderId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceConfig.apiKey}`,
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

                return { success: true };
            }

            // For other services
            return this.finishOrderOtherService(service, orderId);
        } catch (error) {
            console.error(`Error finishing order from ${service}:`, error);
            throw error;
        }
    }

    /**
     * Cancel order
     */
    async cancelOrder(service = '5sim', orderId) {
        try {
            const serviceConfig = this.services[service];
            if (!serviceConfig) {
                throw new Error(`Service ${service} not supported`);
            }

            if (service === '5sim') {
                const response = await fetch(`${serviceConfig.baseUrl}${serviceConfig.endpoints.cancel}/${orderId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceConfig.apiKey}`,
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

                return { success: true };
            }

            // For other services
            return this.cancelOrderOtherService(service, orderId);
        } catch (error) {
            console.error(`Error cancelling order from ${service}:`, error);
            throw error;
        }
    }

    /**
     * Get service balance
     */
    async getBalance(service = '5sim') {
        try {
            const serviceConfig = this.services[service];
            if (!serviceConfig) {
                throw new Error(`Service ${service} not supported`);
            }

            if (service === '5sim') {
                const response = await fetch(`${serviceConfig.baseUrl}/user/profile`, {
                    headers: {
                        'Authorization': `Bearer ${serviceConfig.apiKey}`,
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

            // For other services
            return this.getBalanceOtherService(service);
        } catch (error) {
            console.error(`Error getting balance from ${service}:`, error);
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
    formatCountries(countries, service) {
        if (service === '5sim') {
            return Object.keys(countries).map(code => ({
                code,
                name: countries[code].title,
                flag: countries[code].flag,
                products: countries[code].products
            }));
        }
        return [];
    }

    formatProducts(products, service) {
        if (service === '5sim') {
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

    // Placeholder methods for other services
    async buyNumberOtherService(service, country, product) {
        // Implementation for other services
        throw new Error(`${service} integration not implemented yet`);
    }

    async checkSMSOtherService(service, orderId) {
        // Implementation for other services
        throw new Error(`${service} integration not implemented yet`);
    }

    async finishOrderOtherService(service, orderId) {
        // Implementation for other services
        throw new Error(`${service} integration not implemented yet`);
    }

    async cancelOrderOtherService(service, orderId) {
        // Implementation for other services
        throw new Error(`${service} integration not implemented yet`);
    }

    async getBalanceOtherService(service) {
        // Implementation for other services
        throw new Error(`${service} integration not implemented yet`);
    }
}

module.exports = OTPAPIService;
