# 🔐 Admin Panel Authentication Setup Guide

## Overview
This guide explains how to set up secure authentication for your OTP Bot Admin Panel.

## 🚀 Quick Setup

### 1. Default Credentials
The admin panel comes with default credentials:
- **Username:** `admin`
- **Password:** `admin123`
- **Admin ID:** `7574316340`

⚠️ **IMPORTANT:** These are demo credentials and should be changed immediately!

### 2. Change Admin Credentials

#### Option A: Edit admin-config.js (Recommended for Development)
1. Open `website/admin-config.js`
2. Update the credentials section:
```javascript
credentials: {
    username: 'your_new_username',
    password: 'your_secure_password',
    admin_id: 'your_admin_id'
}
```

#### Option B: Environment Variables (Recommended for Production)
1. Create a `.env` file in your website directory:
```bash
# Admin Panel Credentials
ADMIN_USERNAME=your_new_username
ADMIN_PASSWORD=your_secure_password
ADMIN_ID=your_admin_id

# Security Settings
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
SESSION_TIMEOUT=86400000
REQUIRE_2FA=false
```

2. Update `admin-config.js` to read from environment variables:
```javascript
const ADMIN_CONFIG = {
    credentials: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        admin_id: process.env.ADMIN_ID || '7574316340'
    },
    // ... rest of config
};
```

## 🔒 Security Features

### 1. Session Management
- **Session Timeout:** 24 hours (configurable)
- **Automatic Logout:** When session expires
- **Secure Token Storage:** Base64 encoded with expiration

### 2. Login Protection
- **Max Attempts:** 5 failed attempts (configurable)
- **Account Lockout:** 15 minutes (configurable)
- **Password Validation:** Client-side validation

### 3. Token Security
- **Token Expiration:** Automatic cleanup
- **Secure Storage:** localStorage with validation
- **Admin ID Verification:** Embedded in token

## 📱 How to Use

### 1. Access Admin Panel
Navigate to `/admin_panel.html` in your browser

### 2. Login Process
1. Enter your username and password
2. Click "Login" button
3. If successful, you'll be redirected to the admin dashboard
4. Your session will be saved in localStorage

### 3. Logout
- Click the "🚪 Logout" button in the top-right corner
- Confirm logout when prompted
- Session will be cleared from localStorage

## 🛠️ Customization

### 1. Change Session Timeout
```javascript
security: {
    sessionTimeout: 2 * 60 * 60 * 1000, // 2 hours
}
```

### 2. Enable 2FA (Future Feature)
```javascript
security: {
    require2FA: true
}
```

### 3. Custom API Endpoints
```javascript
api: {
    baseUrl: 'https://your-api-domain.com/api',
    endpoints: {
        users: '/admin/users',
        // ... custom endpoints
    }
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Can't Login
- Check if credentials are correct in `admin-config.js`
- Verify the file is loaded (check browser console)
- Clear browser localStorage and try again

#### 2. Session Expires Too Quickly
- Increase `sessionTimeout` in config
- Check if browser time is correct
- Verify localStorage is working

#### 3. Admin Panel Not Loading
- Check browser console for JavaScript errors
- Verify `admin-config.js` is accessible
- Check if all required files are loaded

### Debug Mode
Add this to your browser console to debug:
```javascript
// Check current config
console.log('Admin Config:', window.ADMIN_CONFIG);

// Check authentication status
console.log('Token:', localStorage.getItem('adminToken'));
console.log('Login Time:', localStorage.getItem('adminLoginTime'));

// Validate token
console.log('Token Valid:', validateToken());
```

## 🚨 Security Best Practices

### 1. Strong Passwords
- Use at least 12 characters
- Include uppercase, lowercase, numbers, and symbols
- Avoid common words or patterns

### 2. Regular Updates
- Change credentials monthly
- Update admin ID when needed
- Monitor login attempts

### 3. Access Control
- Limit admin access to trusted users only
- Use different credentials for development and production
- Consider IP whitelisting for production

### 4. Environment Separation
- Never commit real credentials to version control
- Use different configs for dev/staging/production
- Keep production credentials secure

## 📋 File Structure
```
website/
├── admin_panel.html          # Main admin panel (now with auth)
├── admin-config.js           # Admin configuration
├── .env                      # Environment variables (create this)
└── ADMIN_SETUP_README.md     # This file
```

## 🔄 Migration from Old System

If you were using the old unsecured admin panel:

1. **Backup your data** before making changes
2. **Update the config** with your desired credentials
3. **Test the login** with new credentials
4. **Remove old access** methods if needed

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all files are properly loaded
3. Test with default credentials first
4. Check file permissions and accessibility

---

**Remember:** Security is everyone's responsibility. Keep your credentials safe and update them regularly!
