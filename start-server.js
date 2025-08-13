#!/usr/bin/env node

const app = require('./api/index.js');
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting OTP Bot Admin Panel Server...');
console.log(`🔧 Debug Mode: ${process.env.DEBUG === 'true' ? 'Enabled' : 'Disabled'}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin_panel.html`);
    console.log(`🔧 Debug Dashboard: http://localhost:${PORT}/debug-dashboard.html`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
