# 🚀 Deployment Guide for OTP Bot Platform

## Prerequisites
- Node.js installed
- Vercel CLI installed (`npm i -g vercel`)
- MongoDB Atlas account (for database)

## Environment Variables Setup

Before deploying, make sure to set up these environment variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:

```
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
```

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Navigate to the website directory:**
   ```bash
   cd website
   ```

2. **Login to Vercel (if not already logged in):**
   ```bash
   vercel login
   ```

3. **Deploy the project:**
   ```bash
   vercel --prod
   ```

4. **Follow the prompts:**
   - Link to existing project or create new
   - Confirm deployment settings
   - Wait for deployment to complete

### Option 2: Deploy via GitHub Integration

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

## Post-Deployment

1. **Test all functionality:**
   - Admin panel: `/admin/dashboard`
   - User pages: `/dashboard`, `/services`, etc.
   - API endpoints: `/api/servers`, `/api/services`, etc.

2. **Monitor logs:**
   - Check Vercel dashboard for any errors
   - Monitor MongoDB connection

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Failed:**
   - Verify MONGODB_URI is correct
   - Check MongoDB Atlas network access
   - Ensure IP whitelist includes Vercel IPs

2. **Static Files Not Loading:**
   - Check vercel.json routes configuration
   - Verify file paths in HTML files

3. **API Routes Not Working:**
   - Check vercel.json API routes
   - Verify environment variables

### Debug Mode (Development Only):
- Set `NODE_ENV=development` in local environment
- Debug logs will appear in console

## Production Optimizations

✅ **Completed:**
- Removed all debug console.log statements
- Optimized vercel.json configuration
- Cleaned up unnecessary files
- Added production environment settings

## Support

If you encounter any issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test locally with `NODE_ENV=production`

---

**Ready for deployment! 🎉**
