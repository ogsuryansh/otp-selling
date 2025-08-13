# 🔧 Vercel Deployment Debug Guide

This guide helps you troubleshoot and debug your OTP Bot Admin Panel deployment on Vercel.

## 🚀 Quick Start

1. **Deploy to Vercel**: Push your code to GitHub and connect to Vercel
2. **Access Debug Dashboard**: Visit `https://your-app.vercel.app/debug-dashboard.html`
3. **Check Environment**: Use the dashboard to monitor deployment status

## 🐛 Debug Features Added

### 1. Enhanced Logging
- **Request Tracking**: All API requests are logged with timestamps
- **Error Details**: Detailed error messages with stack traces
- **Environment Info**: Logs include Vercel environment variables
- **Memory Usage**: Tracks memory consumption

### 2. Debug Endpoints
- `/api/debug/environment` - Environment configuration
- `/api/debug/logs` - Recent debug logs
- `/api/debug/filesystem` - File system status
- `/api/debug/test-data` - Generate test data

### 3. Debug Dashboard
- **Real-time Monitoring**: Live status of all components
- **API Testing**: Test endpoints directly from the dashboard
- **Visual Indicators**: Color-coded status cards
- **Log Viewer**: Real-time log display

## 🔍 Common Issues & Solutions

### Issue 1: API Endpoints Not Working
**Symptoms**: 404 errors or empty responses

**Debug Steps**:
1. Check `/api/debug/environment` for Vercel detection
2. Verify `/api/health` endpoint
3. Check Vercel function logs in dashboard

**Solutions**:
```bash
# Check if Vercel is properly configured
curl https://your-app.vercel.app/api/debug/environment

# Test basic health endpoint
curl https://your-app.vercel.app/api/health
```

### Issue 2: File System Access Problems
**Symptoms**: User data not saving or loading

**Debug Steps**:
1. Visit `/api/debug/filesystem` endpoint
2. Check if data directory exists
3. Verify file permissions

**Solutions**:
```bash
# Generate test data to create files
curl -X GET https://your-app.vercel.app/api/debug/test-data

# Check filesystem status
curl https://your-app.vercel.app/api/debug/filesystem
```

### Issue 3: Environment Variables Missing
**Symptoms**: Debug mode disabled or missing config

**Debug Steps**:
1. Check Vercel environment variables in dashboard
2. Verify `DEBUG=true` is set
3. Check `NODE_ENV` value

**Solutions**:
```json
// In vercel.json
{
  "env": {
    "DEBUG": "true",
    "NODE_ENV": "production"
  }
}
```

### Issue 4: Memory Issues
**Symptoms**: Function timeouts or crashes

**Debug Steps**:
1. Monitor memory usage in `/api/debug/environment`
2. Check function duration in Vercel logs
3. Review request logs for memory leaks

**Solutions**:
```json
// In vercel.json
{
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  }
}
```

## 📊 Using the Debug Dashboard

### Environment Status
- **Deployment Type**: Shows if running on Vercel
- **Node.js Version**: Current runtime version
- **Memory Usage**: Real-time memory consumption
- **Uptime**: Server uptime duration
- **Debug Mode**: Whether debugging is enabled

### API Health Check
- **Health Endpoint**: Basic connectivity test
- **Users API**: User data access test
- **Statistics API**: Data processing test
- **Transactions API**: Transaction handling test

### File System Status
- **User Data File**: Existence and size
- **Data Directory**: Directory access status
- **Current Directory**: Working directory path

### Debug Logs
- **Request Logs**: All API requests with details
- **Error Logs**: Detailed error information
- **Performance Logs**: Response times and metrics

## 🛠️ Manual Debugging Commands

### Check Environment
```bash
curl https://your-app.vercel.app/api/debug/environment
```

### View Recent Logs
```bash
curl https://your-app.vercel.app/api/debug/logs?limit=20
```

### Test File System
```bash
curl https://your-app.vercel.app/api/debug/filesystem
```

### Generate Test Data
```bash
curl https://your-app.vercel.app/api/debug/test-data
```

### Test API Endpoints
```bash
# Health check
curl https://your-app.vercel.app/api/health

# Users API
curl https://your-app.vercel.app/api/users

# Statistics API
curl https://your-app.vercel.app/api/statistics
```

## 🔧 Vercel Configuration

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ],
  "env": {
    "DEBUG": "true",
    "NODE_ENV": "production"
  },
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  }
}
```

### Environment Variables
Set these in your Vercel dashboard:
- `DEBUG=true` - Enable debug mode
- `NODE_ENV=production` - Set environment

## 📝 Log Analysis

### Understanding Log Entries
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "Request started: GET /api/users",
  "data": {
    "headers": {...},
    "query": {...},
    "body": {...},
    "ip": "127.0.0.1",
    "userAgent": "..."
  },
  "environment": "production",
  "vercel": true,
  "region": "iad1"
}
```

### Common Log Patterns
- **Request Started**: API call initiated
- **Request Completed**: API call finished with status code
- **Error loading users**: File system issues
- **Users loaded successfully**: Normal operation
- **Unhandled error**: Unexpected errors

## 🚨 Emergency Debugging

### If Dashboard is Not Accessible
1. Check Vercel deployment status
2. Review Vercel function logs
3. Test basic endpoints manually
4. Check environment variables

### If API is Completely Down
1. Verify GitHub repository connection
2. Check Vercel project settings
3. Review build logs
4. Test with minimal endpoint

## 📞 Getting Help

### Before Asking for Help
1. ✅ Check the debug dashboard
2. ✅ Review recent logs
3. ✅ Test basic endpoints
4. ✅ Verify environment variables
5. ✅ Check Vercel function logs

### Information to Provide
- Debug dashboard URL
- Environment status output
- Recent error logs
- Vercel deployment URL
- Specific error messages

## 🔄 Continuous Monitoring

### Regular Checks
- Monitor memory usage
- Check API response times
- Review error logs
- Verify file system access
- Test critical endpoints

### Automated Monitoring
Consider setting up:
- Uptime monitoring for your API
- Error alerting for critical failures
- Performance monitoring for response times
- Log aggregation for better analysis

---

**Remember**: The debug dashboard is your first line of defense. Use it regularly to monitor your deployment health!
