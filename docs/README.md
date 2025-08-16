# OTP Bot Admin Panel - Website

This folder contains the web admin panel files for deployment on Vercel.

## Structure

- `public/` - Contains the main HTML file (index.html)
- `api/` - Contains the API endpoints (index.js)
- `package.json` - Node.js dependencies
- `vercel.json` - Vercel configuration
- `start-local.js` - Local development server

## Deployment to Vercel

1. **Connect to Vercel:**
   - Install Vercel CLI: `npm i -g vercel`
   - Login: `vercel login`

2. **Deploy:**
   ```bash
   cd website
   vercel
   ```

3. **Environment Variables:**
   Set these in your Vercel dashboard:
   - `BOT_TOKEN` - Your Telegram bot token
   - `ADMIN_IDS` - Comma-separated admin user IDs

4. **Custom Domain (Optional):**
   - Add your domain in Vercel dashboard
   - Update DNS settings

## Local Development

```bash
cd website
npm install
node start-local.js
```

The admin panel will be available at `http://localhost:3000`

## Features

- User management
- Balance management
- Transaction history
- Statistics dashboard
- Real-time updates
- Mobile responsive design

## API Endpoints

- `GET /api/users` - Get all users
- `GET /api/transactions` - Get transaction history
- `GET /api/statistics` - Get bot statistics
- `POST /api/add_balance` - Add balance to user
- `POST /api/cut_balance` - Deduct balance from user
- `POST /api/ban_user` - Ban a user
- `POST /api/unban_user` - Unban a user
