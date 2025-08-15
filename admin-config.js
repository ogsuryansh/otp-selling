// Admin Configuration
// Update these values for your production environment

const ADMIN_CONFIG = {
    // Admin credentials (CHANGE THESE IN PRODUCTION!)
    credentials: {
        username: 'admin',
        password: 'admin123',
        admin_id: '7574316340'
    },
    
    // Security settings
    security: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        require2FA: false // Set to true to enable 2FA
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
