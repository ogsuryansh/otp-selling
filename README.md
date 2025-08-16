# Telegram OTP Bot - Phone Number Selling Platform

A complete phone number selling solution for SMS/OTP verification services. This platform allows you to sell phone numbers that users can use to receive verification codes for various services like WhatsApp, Telegram, Gmail, etc.

## 🎯 What This Platform Does

**Core Business Model:** You sell PHONE NUMBERS for receiving SMS/OTP codes. Users pay you to get a phone number, then use that number to receive verification codes for various services.

**Simple Workflow:**
1. User visits your bot
2. User selects a service (e.g., WhatsApp verification)
3. User pays you money
4. Your system gets a phone number from external API
5. User receives the phone number
6. User uses it to get SMS/OTP
7. Your system forwards the SMS to the user

## 🚀 Key Features

### 1. **Admin Dashboard**
- Track earnings, users, and sales
- View revenue trends and popular services
- Monitor recent orders and system status

### 2. **Manage Servers**
- Add phone number providers by country
- Configure server names, country codes, and flags
- Set server status (active/inactive/maintenance)

### 3. **Manage Services**
- Create products to sell (WhatsApp, Telegram, Gmail, etc.)
- Set service codes, prices, and descriptions
- Link services to specific servers

### 4. **Connect External APIs**
- Connect to SMS providers (SMS Activate, 5sim, SMS Hub)
- Configure API keys, URLs, and response formats
- Test API connections and monitor balances

### 5. **Bot Settings**
- Configure Telegram bot token and username
- Set up support channel and contact information
- Configure payment methods (UPI, Paytm, Bank transfer)

### 6. **Order Management**
- Track all transactions and order status
- Filter orders by status, service, and date
- Export order data and manage customer support

## 🛠️ Technology Stack

- **Frontend:** HTML + Tailwind CSS (mobile-friendly design)
- **Backend:** Node.js + Express
- **Database:** MySQL (simple relational structure)
- **Bot:** Telegram Bot API
- **Styling:** Clean blue and white design with Tailwind CSS

## 📁 Project Structure

```
website/
├── index.html                 # Main landing page
├── admin/
│   ├── dashboard.html        # Business overview and metrics
│   ├── servers.html          # Manage phone number servers
│   ├── services.html         # Manage products to sell
│   ├── apis.html            # Connect to SMS providers
│   ├── bot-settings.html    # Configure Telegram bot
│   └── orders.html          # Track all transactions
├── api/                      # Backend API endpoints
├── package.json              # Dependencies and scripts
└── README.md                # This file
```

## 🗄️ Database Schema

### Core Tables
- **servers** - Country-based phone number providers
- **services** - Products you sell (WhatsApp, Telegram, etc.)
- **orders** - User transactions and order status
- **api_configs** - SMS provider API settings
- **bot_settings** - Telegram bot configuration
- **users** - Customer information

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- MySQL database
- Telegram Bot Token (from @BotFather)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env_template.txt .env
   # Edit .env with your database and bot credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the platform**
   - Main page: `http://localhost:3000`
   - Admin panel: `http://localhost:3000/admin/dashboard.html`

## 🔧 Configuration

### 1. **Database Setup**
Create a MySQL database and update the connection settings in your environment file.

### 2. **Telegram Bot**
1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token to your environment file

### 3. **SMS Provider APIs**
- **SMS Activate:** Popular service with global coverage
- **5sim:** Fast SMS service with instant delivery
- **SMS Hub:** Reliable service with good pricing

### 4. **Payment Methods**
Configure your preferred payment methods:
- UPI ID
- Paytm number
- Bank account details

## 📱 Mobile-Friendly Design

The platform is built with a responsive design that works perfectly on:
- Desktop computers
- Tablets
- Mobile phones
- All screen sizes

## 🎨 Design Features

- **Clean Blue & White Theme:** Professional and trustworthy appearance
- **Tailwind CSS:** Modern, utility-first CSS framework
- **Responsive Layout:** Adapts to any device size
- **Intuitive Navigation:** Easy-to-use admin interface
- **Status Indicators:** Clear visual feedback for all operations

## 🔒 Security Features

- API key encryption
- Secure form handling
- Input validation
- SQL injection prevention
- XSS protection

## 📊 Monitoring & Analytics

- Real-time order tracking
- Revenue analytics
- User statistics
- Service popularity metrics
- API health monitoring

## 🚀 Deployment

### Local Development
```bash
npm run local
```

### Production (Vercel)
```bash
npm run build
vercel --prod
```

## 🤝 Support

For support and questions:
- Check the documentation in the `/docs` folder
- Review the admin panel configuration
- Test API connections before going live

## 📈 Business Tips

1. **Start Small:** Begin with 2-3 popular services
2. **Test APIs:** Ensure all SMS providers work before launch
3. **Monitor Quality:** Track delivery rates and user satisfaction
4. **Scale Gradually:** Add more services and servers as you grow
5. **Customer Support:** Provide excellent support for better retention

## 🔄 Updates & Maintenance

- Regular API health checks
- Monitor SMS provider balances
- Update service prices as needed
- Backup database regularly
- Monitor bot performance

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Remember:** You're selling PHONE NUMBERS for SMS verification. That's it. Everything else is extra complexity you don't need right now. Keep it simple and focus on your core business!
