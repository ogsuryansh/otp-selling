# 🔗 OTP Service Integration Setup Guide

This guide will help you set up your bot to sell phone numbers and OTP services using 5sim.net and similar services.

## 📋 **Prerequisites**

1. **5sim.net Account** - Sign up at https://5sim.net
2. **API Key** - Get your API key from 5sim.net dashboard
3. **Balance** - Add funds to your 5sim.net account
4. **Vercel Deployment** - Your admin panel should be deployed

## 🔑 **Step 1: Get API Keys**

### **5sim.net Setup:**
1. Go to https://5sim.net and create an account
2. Add funds to your account (minimum $1)
3. Go to API section and copy your API key
4. Test your API key using their documentation

### **Alternative Services:**
- **SMS-Activate:** https://sms-activate.org
- **SMSHub:** https://smshub.org

## ⚙️ **Step 2: Environment Configuration**

Add these environment variables to your `.env` file:

```bash
# OTP Service API Keys
FIVESIM_API_KEY=your_5sim_api_key_here
SMS_ACTIVATE_API_KEY=your_sms_activate_api_key_here
SMSHUB_API_KEY=your_smshub_api_key_here

# Admin Panel URL
ADMIN_PANEL_URL=https://your-domain.vercel.app
```

## 🚀 **Step 3: Deploy API Endpoints**

The API endpoints are already created in:
- `website/api/services/otp-api.js` - Core OTP service
- `website/api/otp.js` - API endpoints

Make sure these are included in your Vercel deployment.

## 🤖 **Step 4: Bot Commands**

Your bot now supports these OTP commands:

### **📱 Buy Phone Number**
```
/buy <country> [service]
```
**Examples:**
- `/buy russia` - Buy Russian number for any service
- `/buy usa google` - Buy US number for Google verification
- `/buy india whatsapp` - Buy Indian number for WhatsApp

### **📱 Check SMS/OTP**
```
/check <order_id>
```
**Example:**
- `/check 12345` - Check for SMS on order 12345

### **❌ Cancel Order**
```
/cancel <order_id>
```
**Example:**
- `/cancel 12345` - Cancel order 12345

### **💰 Check Service Balance**
```
/balance
```
Shows your 5sim.net account balance

## 🌍 **Available Countries**

| Country | Code | Flag |
|---------|------|------|
| Russia | `russia` | 🇷🇺 |
| Ukraine | `ukraine` | 🇺🇦 |
| Kazakhstan | `kazakhstan` | 🇰🇿 |
| China | `china` | 🇨🇳 |
| USA | `usa` | 🇺🇸 |
| India | `india` | 🇮🇳 |

## 🛠️ **Available Services**

| Service | Code | Description |
|---------|------|-------------|
| Any | `any` | Any verification service |
| Google | `google` | Google account verification |
| WhatsApp | `whatsapp` | WhatsApp verification |
| Telegram | `telegram` | Telegram verification |
| Uber | `uber` | Uber account verification |

## 💰 **Pricing Structure**

### **User Pricing (Bot Balance):**
- **Minimum Cost:** 1.0 💎 per number
- **Service Costs:** Varies by service (1.0-3.0 💎)
- **Country Premiums:** Some countries cost more

### **Service Costs (5sim.net):**
- **Russia:** $0.10-0.50 per number
- **USA:** $0.50-2.00 per number
- **India:** $0.20-1.00 per number

## 🔄 **Order Flow**

1. **User buys number** → `/buy russia google`
2. **Bot purchases from 5sim** → Deducts user balance
3. **User gets phone number** → Uses for verification
4. **User checks for SMS** → `/check 12345`
5. **Bot receives OTP** → Shows to user
6. **User finishes order** → Marks as completed

## 🛡️ **Security Features**

- **Rate Limiting:** 10 requests per minute per user
- **Balance Check:** Users must have sufficient balance
- **Order Tracking:** All orders are tracked and managed
- **Error Handling:** Comprehensive error handling
- **User Authentication:** All requests require user ID

## 📊 **Admin Panel Integration**

The admin panel includes:
- **Service Status:** Check 5sim.net balance and status
- **Order Management:** View and manage all orders
- **User Analytics:** Track user OTP usage
- **Revenue Tracking:** Monitor profits from OTP sales

## 🔧 **Testing Your Setup**

### **1. Test API Connection:**
```bash
curl -X GET "https://your-domain.vercel.app/api/otp/status" \
  -H "X-User-ID: 12345"
```

### **2. Test Bot Commands:**
1. Send `/balance` to check service status
2. Send `/buy russia` to test number purchase
3. Send `/check <order_id>` to test SMS checking

### **3. Monitor Logs:**
Check your bot logs for any errors or issues.

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"API Key Invalid"**
   - Check your 5sim.net API key
   - Ensure you have sufficient balance

2. **"Insufficient Balance"**
   - Add funds to your 5sim.net account
   - Check your bot's balance system

3. **"Service Unavailable"**
   - Check 5sim.net service status
   - Try a different country or service

4. **"Network Error"**
   - Check your internet connection
   - Verify API endpoints are accessible

### **Support:**
- **5sim.net Support:** https://5sim.net/support
- **Bot Issues:** Check your bot logs
- **API Issues:** Test endpoints manually

## 📈 **Revenue Optimization**

### **Pricing Strategy:**
1. **Markup:** Add 20-50% markup to 5sim.net prices
2. **Bulk Discounts:** Offer discounts for multiple numbers
3. **Premium Services:** Charge more for popular services
4. **Country Premiums:** Charge more for high-demand countries

### **Marketing:**
1. **Service List:** Show available countries and services
2. **Success Stories:** Share successful verifications
3. **Support:** Provide excellent customer support
4. **Promotions:** Run special offers and discounts

## 🔄 **Maintenance**

### **Regular Tasks:**
1. **Monitor Balance:** Check 5sim.net balance daily
2. **Update Prices:** Adjust pricing based on costs
3. **Check Logs:** Monitor for errors and issues
4. **Backup Data:** Regular database backups

### **Updates:**
1. **API Changes:** Monitor 5sim.net API updates
2. **New Services:** Add new countries and services
3. **Security:** Regular security updates
4. **Performance:** Optimize for better performance

## 📞 **Support & Resources**

- **5sim.net Documentation:** https://5sim.net/docs
- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Vercel Documentation:** https://vercel.com/docs
- **MongoDB Documentation:** https://docs.mongodb.com

---

## ✅ **Setup Complete!**

Your bot is now ready to sell phone numbers and OTP services! Users can:

1. **Buy numbers** using `/buy` command
2. **Check SMS** using `/check` command  
3. **Cancel orders** using `/cancel` command
4. **Check balance** using `/balance` command

The system is fully automated and integrated with your existing bot infrastructure.
