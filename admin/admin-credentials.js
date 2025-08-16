// 🔐 Admin Panel Credentials
// ⚠️ IMPORTANT: Change these credentials for production!

const ADMIN_CREDENTIALS = {
    // Admin login credentials
    username: 'admin',
    password: 'admin123',
    admin_id: '7574316340',
    
    // Security settings
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    
    // API endpoints (if needed)
    api: {
        baseUrl: '/api',
        endpoints: {
            users: '../users/index.html',
            transactions: '../transactions/index.html',
            statistics: '/statistics'
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ADMIN_CREDENTIALS;
} else {
    window.ADMIN_CREDENTIALS = ADMIN_CREDENTIALS;
}

// 🔒 SECURITY NOTES:
// 1. Change username and password immediately
// 2. Use strong passwords (12+ characters, mixed case, numbers, symbols)
// 3. Never commit real credentials to version control
// 4. Consider using environment variables in production
// 5. Regularly rotate credentials
// 6. Monitor login attempts
