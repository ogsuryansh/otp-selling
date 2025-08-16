# 🚀 Dynamic API Configuration System - Complete Guide

## 🎯 **What This System Does**

Your OTP bot now has a **completely dynamic API configuration system** that can work with **ANY SMS service provider** - not just hardcoded ones like 5sim.net. Users can configure their own:

- ✅ **API endpoints** for any service
- ✅ **Authentication methods** (API keys, tokens, basic auth, etc.)
- ✅ **Response parsing** (JSON, XML, HTML, text)
- ✅ **Custom URL patterns** with dynamic placeholders
- ✅ **Request methods** (GET, POST, PUT, PATCH)
- ✅ **Custom headers** and POST data templates

## 🔧 **How It Works**

### **1. Dynamic URL Placeholders**
Instead of hardcoded URLs, you can use placeholders that get replaced dynamically:

```bash
# Example: 5sim.net style
https://5sim.net/v1/user/buy/activation/{service}/{country}/any

# Example: SMS-Activate style  
https://api.sms-activate.org/stubs/handler_api.php?action=getNumber&service={service}&country={country}&api_key={api_key}

# Example: Custom API
https://your-api.com/buy?country={country}&service={service}&token={api_key}
```

**Available Placeholders:**
- `{country}` - Country code (usa, russia, india, etc.)
- `{service}` - Service type (whatsapp, google, telegram, etc.)
- `{api_key}` - Your API key/token
- `{id}` - Order ID from previous response
- `{phone}` - Phone number from previous response

### **2. Flexible Authentication**
Support for all common authentication methods:

| Method | Description | Example |
|--------|-------------|---------|
| **API Key in Header** | `X-API-Key: your_key` | Most common |
| **API Key in URL** | `?api_key=your_key` | Simple APIs |
| **Bearer Token** | `Authorization: Bearer token` | Modern APIs |
| **Basic Auth** | Username/password | Legacy systems |
| **Custom Header** | Any header name | Special cases |

### **3. Smart Response Parsing**
Automatically extract data from any response format:

#### **JSON Responses**
```json
{
  "status": "success",
  "data": {
    "phone": "+1234567890",
    "id": "12345",
    "sms": [{"text": "Your OTP is 123456"}]
  }
}
```

**Paths to extract:**
- Phone: `data.phone`
- Order ID: `data.id`  
- SMS Text: `data.sms.0.text`

#### **XML Responses**
```xml
<response>
  <status>success</status>
  <phone>+1234567890</phone>
  <id>12345</id>
  <sms>Your OTP is 123456</sms>
</response>
```

**XPath to extract:**
- Phone: `//phone`
- Order ID: `//id`
- SMS Text: `//sms`

#### **Text Responses**
```
ACCESS_12345:1234567890
```

**Parse with:**
- Status check: `startsWith` + `ACCESS_`
- Extract data with regex patterns

## 📱 **Real-World Examples**

### **Example 1: 5sim.net Configuration**

```yaml
API Name: 5sim.net WhatsApp API
Authentication: API Key in Header
Response Type: JSON

URLs:
  Get Number: https://5sim.net/v1/user/buy/activation/wa/{country}/any
  Check Status: https://5sim.net/v1/user/check/{id}
  Activate: https://5sim.net/v1/user/finish/{id}
  Cancel: https://5sim.net/v1/user/cancel/{id}
  Balance: https://5sim.net/v1/user/profile

Response Paths:
  Message: sms.0.text
  Phone: phone
  Order ID: id
  Status: status
```

### **Example 2: SMS-Activate Configuration**

```yaml
API Name: SMS-Activate API
Authentication: API Key in URL Parameter
Response Type: Text

URLs:
  Get Number: https://api.sms-activate.org/stubs/handler_api.php?action=getNumber&service={service}&country={country}&api_key={api_key}
  Check Status: https://api.sms-activate.org/stubs/handler_api.php?action=getStatus&id={id}&api_key={api_key}
  Activate: https://api.sms-activate.org/stubs/handler_api.php?action=setStatus&status=8&id={id}&api_key={api_key}

Response Parsing:
  Status Check: startsWith + ACCESS_
  Extract ID and phone from text response
```

### **Example 3: Custom API Configuration**

```yaml
API Name: My Custom SMS Service
Authentication: Bearer Token
Response Type: JSON
Request Method: POST

URLs:
  Get Number: https://my-api.com/buy
  Check Status: https://my-api.com/check/{id}
  Activate: https://my-api.com/finish/{id}

POST Data Template:
  {"country": "{country}", "service": "{service}", "api_key": "{api_key}"}

Response Paths:
  Message: data.message
  Phone: data.phone
  Order ID: data.id
  Status: data.status
```

## 🛠️ **Step-by-Step Configuration**

### **Step 1: Basic Information**
1. **API Name**: Give it a descriptive name
2. **Server**: Associate with your server
3. **Enable Service**: Check to activate

### **Step 2: Authentication**
1. **Method**: Choose authentication type
2. **Credentials**: Enter API key, username, etc.
3. **Custom Headers**: Add any special headers

### **Step 3: URLs**
1. **Get Number**: Endpoint to buy phone number
2. **Check Status**: Endpoint to check for SMS
3. **Activate**: Endpoint to finish order (optional)
4. **Cancel**: Endpoint to cancel order (optional)
5. **Balance**: Endpoint to check balance (optional)

### **Step 4: Response Configuration**
1. **Response Type**: JSON, XML, HTML, or Text
2. **Message Path**: Where to find SMS text
3. **Status Check**: How to verify success
4. **Data Paths**: Where to find phone, ID, etc.

### **Step 5: Request Configuration**
1. **Method**: GET, POST, PUT, or PATCH
2. **POST Data**: Template for POST requests
3. **Headers**: Additional HTTP headers
4. **Timeout**: Request timeout in seconds

### **Step 6: Advanced Settings**
1. **Auto Cancel**: Minutes before auto-cancellation
2. **Retry Count**: Number of retry attempts
3. **Rate Limit**: Requests per minute
4. **Priority**: Service priority level

## 🧪 **Testing Your Configuration**

### **1. Use Built-in Examples**
Click on the example service cards to pre-fill forms:
- 🔌 **5sim.net** - Complete example
- 📱 **SMS-Activate** - Text-based API
- ⚙️ **Custom API** - POST request example

### **2. Test Each Endpoint**
1. **Test URL**: Verify URLs work in browser
2. **Test Auth**: Check authentication works
3. **Test Response**: Verify data extraction
4. **Test Flow**: Complete full number purchase

### **3. Debug Common Issues**
- **404 Errors**: Check URL format
- **Auth Errors**: Verify API key/credentials
- **Parse Errors**: Check response paths
- **Timeout Errors**: Increase timeout value

## 🔄 **Dynamic URL Processing**

### **How Placeholders Work**

When a user requests a number, the system:

1. **Replaces placeholders** with actual values:
   ```bash
   Original: https://api.com/buy?country={country}&service={service}
   User Request: /buy usa whatsapp
   Final URL: https://api.com/buy?country=usa&service=whatsapp
   ```

2. **Makes the API call** with proper authentication

3. **Parses the response** using your configured paths

4. **Extracts required data** (phone, ID, status)

5. **Stores for later use** in status checking

### **Response Chain Example**

```bash
1. User: /buy usa whatsapp
2. Bot: Calls your configured "Get Number" URL
3. API Response: {"id": "12345", "phone": "+1234567890"}
4. Bot: Extracts ID and phone using your paths
5. Bot: Sends phone number to user
6. User: /check 12345
7. Bot: Calls your "Check Status" URL with {id} = 12345
8. API Response: {"sms": "Your OTP is 123456"}
9. Bot: Extracts SMS using your message path
10. Bot: Sends OTP to user
```

## 📊 **Advanced Features**

### **1. Multiple API Support**
Configure multiple APIs for the same service:
- **Primary API**: High priority, main service
- **Backup API**: Lower priority, fallback service
- **Load Balancing**: Distribute requests across APIs

### **2. Smart Fallback**
If one API fails:
1. **Retry** the same API (configurable retry count)
2. **Fallback** to next priority API
3. **Notify** admin of API issues

### **3. Rate Limiting**
- **Per API**: Respect individual API limits
- **Global**: Overall system rate limiting
- **User-based**: Per-user request limits

### **4. Monitoring & Analytics**
- **API Health**: Track success/failure rates
- **Response Times**: Monitor performance
- **Usage Stats**: Track number purchases
- **Error Logging**: Detailed error information

## 🚀 **Getting Started**

### **Quick Start Guide**

1. **Click "➕ Add New API"**
2. **Choose an example** (5sim.net, SMS-Activate, or Custom)
3. **Modify the configuration** for your needs
4. **Test the configuration** using the test button
5. **Save and activate** your API configuration

### **Best Practices**

1. **Start Simple**: Use basic configuration first
2. **Test Thoroughly**: Verify each endpoint works
3. **Document Everything**: Keep notes on your setup
4. **Monitor Performance**: Watch for errors and timeouts
5. **Have Backups**: Configure multiple APIs when possible

### **Common Use Cases**

- **SMS Verification**: WhatsApp, Google, Telegram
- **Account Creation**: Social media, banking, e-commerce
- **Two-Factor Auth**: Security applications
- **Marketing**: Bulk SMS campaigns
- **Testing**: Development and QA environments

## 🔒 **Security Considerations**

### **API Key Protection**
- **Environment Variables**: Store keys securely
- **Access Control**: Limit who can configure APIs
- **Audit Logging**: Track configuration changes
- **Encryption**: Encrypt sensitive data

### **Rate Limiting**
- **Per API**: Respect provider limits
- **Per User**: Prevent abuse
- **Global**: System-wide protection

### **Error Handling**
- **No Sensitive Data**: Don't log API keys
- **Graceful Degradation**: Handle failures gracefully
- **User Notifications**: Inform users of issues

## 📞 **Support & Troubleshooting**

### **Common Issues**

1. **"API Key Invalid"**
   - Check API key format
   - Verify authentication method
   - Test in browser/Postman

2. **"URL Not Found"**
   - Verify URL format
   - Check placeholder syntax
   - Test endpoint manually

3. **"Parse Error"**
   - Verify response format
   - Check data paths
   - Test with sample response

4. **"Timeout Error"**
   - Increase timeout value
   - Check network connectivity
   - Verify API response time

### **Getting Help**

1. **Check Examples**: Use built-in examples
2. **Test URLs**: Verify endpoints work
3. **Check Logs**: Review error messages
4. **API Documentation**: Consult provider docs
5. **Community Support**: Ask in forums/groups

## 🎉 **You're Ready!**

Your OTP bot now supports **ANY SMS service** with a powerful, flexible configuration system. Users can:

- ✅ **Configure their own APIs** without coding
- ✅ **Use any authentication method** their service supports
- ✅ **Parse any response format** automatically
- ✅ **Create custom URL patterns** with placeholders
- ✅ **Test configurations** before going live
- ✅ **Monitor performance** and handle errors

**Start configuring your APIs and enjoy the flexibility!** 🚀
