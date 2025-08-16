# 🏠 Local Development Guide

This guide will help you run the OTP Bot application locally for development and testing.

## 📋 **Prerequisites**

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **MongoDB** (optional for local testing)
4. **Git** (for version control)

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
cd website
npm install
```

### **2. Start Local Server**
```bash
# Option 1: Using npm script
npm run local

# Option 2: Direct node command
node start-local-server.js

# Option 3: Direct API server
node api/index.js
```

### **3. Access the Application**
- **Main Dashboard:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **Admin Fixed:** http://localhost:3000/admin_fixed.html
- **Users Page:** http://localhost:3000/users
- **Transactions:** http://localhost:3000/transactions
- **Servers:** http://localhost:3000/servers
- **API Config:** http://localhost:3000/api-config

## ⚙️ **Environment Configuration**

### **Create Local Environment File**
1. Copy `env_local.txt` to `.env.local`
2. Update the values as needed:

```bash
# Copy environment template
cp env_local.txt .env.local

# Edit the file with your settings
nano .env.local
```

### **Required Environment Variables**
```bash
# Development Settings
NODE_ENV=development
DEBUG=true
PORT=3000

# MongoDB (optional for local testing)
MONGODB_URI=mongodb://localhost:27017/otp_bot

# Admin Panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_ID=7574316340

# OTP Services (add your API keys)
FIVESIM_API_KEY=your_actual_api_key_here
```

## 🔧 **Available Scripts**

### **Development Scripts**
```bash
# Start local development server
npm run local

# Start with Vercel dev (if you have Vercel CLI)
npm run dev

# Start production server
npm start

# Start with debug mode
npm run debug

# Test MongoDB connection
npm run test:mongodb
```

### **Direct Commands**
```bash
# Start API server directly
node api/index.js

# Start with custom port
PORT=4000 node api/index.js

# Start with debug logging
DEBUG=true node api/index.js
```

## 🌐 **Local URLs**

### **Main Pages**
- **Home:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **Admin Fixed:** http://localhost:3000/admin_fixed.html
- **Users:** http://localhost:3000/users
- **Transactions:** http://localhost:3000/transactions
- **Servers:** http://localhost:3000/servers
- **API Config:** http://localhost:3000/api-config

### **API Endpoints**
- **Health Check:** http://localhost:3000/api/health
- **Test Endpoint:** http://localhost:3000/api/test
- **Users API:** http://localhost:3000/api/users
- **Statistics:** http://localhost:3000/api/statistics
- **Transactions:** http://localhost:3000/api/transactions

### **Debug Endpoints**
- **Environment Info:** http://localhost:3000/api/debug/environment
- **Debug Logs:** http://localhost:3000/api/debug/logs
- **MongoDB Status:** http://localhost:3000/api/debug/mongodb

### **OTP API Endpoints**
- **Countries:** http://localhost:3000/api/otp/countries
- **Products:** http://localhost:3000/api/otp/products
- **Buy Number:** POST http://localhost:3000/api/otp/buy
- **Check SMS:** GET http://localhost:3000/api/otp/check/:orderId
- **Service Balance:** http://localhost:3000/api/otp/balance
- **Service Status:** http://localhost:3000/api/otp/status

## 🗄️ **Database Setup**

### **Option 1: Local MongoDB**
```bash
# Install MongoDB locally
# Then start MongoDB service
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env.local
```

### **Option 2: MongoDB Atlas (Recommended)**
1. Create free account at https://mongodb.com/atlas
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env.local`

### **Option 3: No Database (Development Mode)**
The application will work without MongoDB for basic testing.

## 🧪 **Testing the Application**

### **1. Test Basic Functionality**
```bash
# Start the server
npm run local

# Open browser to http://localhost:3000
# Check if the main page loads
```

### **2. Test Admin Panel**
```bash
# Go to http://localhost:3000/admin
# Login with:
# Username: admin
# Password: admin123
```

### **3. Test API Endpoints**
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test users endpoint
curl http://localhost:3000/api/users

# Test OTP countries endpoint
curl http://localhost:3000/api/otp/countries
```

### **4. Test OTP Integration**
```bash
# Test service status (requires API key)
curl http://localhost:3000/api/otp/status

# Test buying a number (requires API key and balance)
curl -X POST http://localhost:3000/api/otp/buy \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 12345" \
  -d '{"country": "russia", "product": "any"}'
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"Port already in use"**
   ```bash
   # Kill process on port 3000
   npx kill-port 3000
   
   # Or use different port
   PORT=4000 npm run local
   ```

2. **"Module not found"**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **"MongoDB connection failed"**
   ```bash
   # Check if MongoDB is running
   # Or use MongoDB Atlas
   # Or run without database for testing
   ```

4. **"Admin panel not loading"**
   ```bash
   # Check if admin_fixed.html exists
   ls -la admin_fixed.html
   
   # Check server logs for errors
   ```

### **Debug Mode**
```bash
# Start with debug logging
DEBUG=true npm run local

# Check debug logs
curl http://localhost:3000/api/debug/logs
```

### **Log Files**
- Server logs appear in console
- Debug logs available at `/api/debug/logs`
- MongoDB status at `/api/debug/mongodb`

## 📱 **Testing Bot Integration**

### **1. Update Bot Configuration**
In your bot's `config.py` or environment:
```python
ADMIN_PANEL_URL = "http://localhost:3000"
```

### **2. Test Bot Commands**
```bash
# Start your bot
cd ../backend
python main.py

# Test bot commands
# /buy russia
# /check 12345
# /balance
```

### **3. Monitor API Calls**
Check server logs for bot API requests:
```bash
# Watch server logs
npm run local
```

## 🔄 **Development Workflow**

### **1. Make Changes**
1. Edit files in the `website` directory
2. Save changes
3. Server auto-restarts (if using nodemon)

### **2. Test Changes**
1. Open browser to http://localhost:3000
2. Test affected functionality
3. Check console for errors

### **3. Debug Issues**
1. Check browser console (F12)
2. Check server logs
3. Use debug endpoints
4. Test API endpoints directly

### **4. Deploy Changes**
1. Test locally first
2. Commit changes to git
3. Deploy to Vercel

## 📊 **Monitoring & Logs**

### **Server Logs**
- All requests are logged
- Debug mode shows detailed logs
- Errors are highlighted

### **API Monitoring**
- Health check: `/api/health`
- Environment info: `/api/debug/environment`
- MongoDB status: `/api/debug/mongodb`
- Request logs: `/api/debug/logs`

### **Performance**
- Request timing is logged
- Database query performance
- Memory usage monitoring

## 🚀 **Production Deployment**

### **Before Deploying**
1. Test all functionality locally
2. Update environment variables
3. Check API keys are set
4. Test OTP integration

### **Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or use GitHub integration
# Push to main branch
```

---

## ✅ **Success Checklist**

- [ ] Server starts without errors
- [ ] Admin panel loads at http://localhost:3000/admin
- [ ] API endpoints respond correctly
- [ ] MongoDB connection works (if using)
- [ ] OTP API endpoints work (with API keys)
- [ ] Bot can connect to local server
- [ ] All pages load correctly
- [ ] Debug endpoints accessible

## 🆘 **Need Help?**

1. Check the troubleshooting section
2. Review server logs
3. Test individual endpoints
4. Check environment variables
5. Verify file paths and permissions

---

**Happy Coding! 🎉**
