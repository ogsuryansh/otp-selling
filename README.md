# OTP Bot System - Modular Website

A comprehensive SMS OTP management system with a modular, organized website structure.

## 📁 Project Structure

```
website/
├── index.html                 # Main navigation hub
├── assets/                    # Shared assets
│   ├── css/
│   │   └── main.css          # Main stylesheet
│   ├── js/
│   │   └── main.js           # Main JavaScript utilities
│   └── images/               # Images and icons
├── admin/                     # Admin panel
│   ├── index.html            # Main admin interface
│   ├── admin-auth.js         # Authentication logic
│   ├── admin-config.js       # Configuration management
│   └── admin-credentials.js  # Credential management
├── dashboard/                 # Dashboard
│   └── index.html            # Main dashboard with all features
├── api-config/               # API configuration
│   └── index.html            # API setup and management
├── services/                  # Services management
│   └── index.html            # OTP services and orders
├── users/                     # User management
│   └── index.html            # User accounts and management
├── servers/                   # Server management
│   └── index.html            # Server configuration
├── transactions/              # Transaction history
│   └── index.html            # Payment and transaction logs
├── promo-codes/               # Promotional codes
│   └── index.html            # Promo code management
├── docs/                      # Documentation
│   ├── index.html            # Documentation hub
│   ├── ADMIN_SETUP_README.md
│   ├── API_CONFIGURATION_README.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── ...                   # Other documentation files
├── api/                       # API endpoints
│   ├── index.js              # Main API server
│   ├── otp.js                # OTP service endpoints
│   └── services/             # API services
├── data/                      # Data storage
├── package.json              # Node.js dependencies
├── vercel.json               # Vercel deployment config
└── README.md                 # This file
```

## 🚀 Features

### 📊 Dashboard
- Complete system overview
- Real-time statistics
- User management
- Auto import API services
- Server management
- Service configuration
- API connection tools
- Bot settings
- Promo code management

### ⚙️ Admin Panel
- System administration
- User management
- Configuration settings
- Security controls
- Monitoring tools

### 🔌 API Configuration
- Dynamic SMS service setup
- Multiple provider support
- Authentication methods
- Response parsing
- Rate limiting
- Testing tools

### 👥 User Management
- User registration
- Account management
- Balance tracking
- Order history
- Profile settings

### 🖥️ Server Management
- Server configuration
- Performance monitoring
- Health checks
- Scaling options

### 💰 Transactions
- Payment processing
- Transaction history
- Financial reports
- Invoice generation

### 🎫 Promo Codes
- Promotional code creation
- Discount management
- Usage tracking
- Expiration handling

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Deployment**: Vercel
- **APIs**: RESTful API design

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env_template.txt .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
WEBHOOK_URL=your_webhook_url

# API Settings
API_PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_admin_password
```

### API Configuration
1. Navigate to `/api-config/`
2. Add your SMS service providers
3. Configure authentication methods
4. Test API connections
5. Set up rate limiting

## 📱 Usage

### Accessing Different Modules

- **Home**: `http://localhost:3000/`
- **Dashboard**: `http://localhost:3000/dashboard/`
- **Admin**: `http://localhost:3000/admin/`
- **API Config**: `http://localhost:3000/api-config/`
- **Services**: `http://localhost:3000/services/`
- **Users**: `http://localhost:3000/users/`
- **Servers**: `http://localhost:3000/servers/`
- **Transactions**: `http://localhost:3000/transactions/`
- **Promo Codes**: `http://localhost:3000/promo-codes/`
- **Documentation**: `http://localhost:3000/docs/`

### Key Features

#### Dashboard Overview
- View system statistics
- Monitor active users
- Track API performance
- Manage all services from one place

#### Auto Import
- Import services from files (JSON/CSV)
- Import from external URLs
- Bulk configuration
- Import history tracking

#### API Management
- Support for multiple SMS providers
- Dynamic API configuration
- Authentication methods
- Response parsing
- Rate limiting
- Testing tools

#### User Management
- User registration and authentication
- Balance management
- Order tracking
- Profile customization

## 🚀 Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Manual Deployment
1. Build the project
2. Upload to your server
3. Configure web server
4. Set up SSL certificates

## 📚 Documentation

Comprehensive documentation is available in the `/docs/` directory:

- **Setup Guides**: Installation and configuration
- **API Documentation**: Endpoint references
- **Deployment Guides**: Production deployment
- **Troubleshooting**: Common issues and solutions

## 🔒 Security

- JWT authentication
- Password hashing
- Rate limiting
- Input validation
- CORS configuration
- Environment variable protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: `/docs/`
- **Issues**: GitHub Issues
- **Community**: GitHub Discussions

## 🔄 Updates

- Regular security updates
- Feature enhancements
- Bug fixes
- Performance improvements

---

**Note**: This is a modular system designed for easy maintenance and scalability. Each module can be developed and deployed independently while maintaining consistency through shared assets and utilities.
