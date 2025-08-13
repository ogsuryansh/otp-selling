const app = require('./api/index.js');
const PORT = process.env.PORT || 3000;

console.log('🌐 Starting OTP Bot Admin Server (Local Mode)...');
console.log(`📱 Admin Panel: http://localhost:${PORT}`);
console.log(`🔗 API endpoints: http://localhost:${PORT}/api/`);
console.log('✅ Server is running! Press Ctrl+C to stop.');

app.listen(PORT, () => {
    console.log(`🌐 OTP Bot Admin Server running on port ${PORT}`);
    console.log(`📱 Admin Panel: http://localhost:${PORT}`);
    console.log(`🔗 API endpoints: http://localhost:${PORT}/api/`);
});
