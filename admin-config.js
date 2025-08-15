// Admin Configuration
// Update these values for your production environment

const ADMIN_CONFIG = {
    // Admin credentials (CHANGE THESE IN PRODUCTION!)
    credentials: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        admin_id: process.env.ADMIN_ID || '7574316340'
    },
    
    // Security settings
    security: {
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000, // 24 hours
        require2FA: process.env.REQUIRE_2FA === 'true' || false // Set to true to enable 2FA
    },
    
    // API endpoints
    api: {
        baseUrl: '/api',
        endpoints: {
            users: '/users',
            transactions: '/transactions',
            statistics: '/statistics',
            addBalance: '/add_balance',
            cutBalance: '/cut_balance',
            banUser: '/ban_user',
            unbanUser: '/unban_user',
            updateUser: '/update_user'
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ADMIN_CONFIG;
} else {
    window.ADMIN_CONFIG = ADMIN_CONFIG;
}
