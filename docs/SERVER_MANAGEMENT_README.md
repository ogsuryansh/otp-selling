# 🖥️ Server Management System

## Overview
The Server Management System is a comprehensive solution for managing OTP bot servers through the admin panel. It provides a complete CRUD (Create, Read, Update, Delete) interface for server management with MongoDB integration.

## Features

### ✨ Core Functionality
- **Add New Servers**: Create servers with name, code, country, and status
- **View Server List**: Display all servers in a responsive table format
- **Edit Servers**: Modify existing server details
- **Delete Servers**: Remove servers with confirmation dialog
- **Search & Filter**: Find servers by name, code, or country
- **Real-time Stats**: Live statistics for total, active, and inactive servers

### 🎨 User Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Glass Morphism**: Modern glass effect design with backdrop blur
- **Modal Forms**: Clean, intuitive forms for adding/editing servers
- **Status Indicators**: Color-coded status badges (Active, Inactive, Maintenance)
- **Action Buttons**: Easy-to-use edit and delete buttons for each server

### 🗄️ Data Management
- **MongoDB Integration**: Full database integration with proper error handling
- **Data Validation**: Server-side validation for all inputs
- **Unique Constraints**: Prevents duplicate server codes
- **Timestamps**: Automatic creation and update timestamps
- **Error Handling**: Comprehensive error handling and user feedback

## API Endpoints

### GET /api/servers
Retrieves all servers from the database.
```json
{
  "servers": [
    {
      "_id": "server_id",
      "name": "Server Name",
      "code": "SRV001",
      "country": "India",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/servers
Creates a new server.
```json
{
  "name": "Server Name",
  "code": "SRV001",
  "country": "India",
  "status": "active"
}
```

### PUT /api/servers/:id
Updates an existing server.
```json
{
  "name": "Updated Server Name",
  "code": "SRV001",
  "country": "USA",
  "status": "maintenance"
}
```

### DELETE /api/servers/:id
Deletes a server by ID.

## Database Schema

### Servers Collection
```javascript
{
  _id: ObjectId,
  name: String,        // Server name (required)
  code: String,        // Unique server code (required)
  country: String,     // Server country (required)
  status: String,      // Server status: active/inactive/maintenance (required)
  createdAt: Date,     // Creation timestamp
  updatedAt: Date      // Last update timestamp
}
```

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB database (local or Atlas)
- Express.js server running

### Environment Variables
Ensure these are set in your `.env` file:
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_DATABASE=otp_bot
MONGODB_COLLECTION=users
```

### Dependencies
The system uses these packages (already included):
- `express`: Web framework
- `mongodb`: MongoDB driver
- `cors`: Cross-origin resource sharing

## Usage

### 1. Access Server Management
- Navigate to `/servers` in your admin panel
- Or click "Manage Servers" from the admin dashboard

### 2. Add New Server
- Click "Add New Server" button
- Fill in the form:
  - **Server Name**: Descriptive name for the server
  - **Server Code**: Unique identifier (auto-validated)
  - **Country**: Select from dropdown (defaults to India)
  - **Status**: Choose from Active/Inactive/Maintenance
- Click "Add Server" to save

### 3. Edit Server
- Click the "Edit" button on any server row
- Modify the details in the form
- Click "Update Server" to save changes

### 4. Delete Server
- Click the "Delete" button on any server row
- Confirm deletion in the confirmation dialog
- Server will be permanently removed

### 5. Search & Filter
- Use the search box to find servers by name, code, or country
- Results update in real-time as you type

## File Structure

```
website/
├── servers.html                 # Main server management page
├── test-servers.html           # API testing page
├── api/
│   └── index.js               # API endpoints (servers added)
├── responsive.css              # Responsive styles
└── SERVER_MANAGEMENT_README.md # This documentation
```

## Testing

### Local Testing
1. Start your Node.js server: `npm run local`
2. Open `test-servers.html` in your browser
3. Test each API endpoint using the test buttons
4. Verify responses in the API Response section

### API Testing
Use the test page to verify:
- ✅ GET /api/servers (retrieve all servers)
- ✅ POST /api/servers (create new server)
- ✅ PUT /api/servers/:id (update server)
- ✅ DELETE /api/servers/:id (delete server)

## Responsive Design

### Mobile-First Approach
- **Extra Small (< 480px)**: Single column layout, compact tables
- **Small (480px - 640px)**: Optimized table padding, stacked action buttons
- **Medium (640px - 768px)**: Balanced layout with improved readability
- **Large (768px+)**: Full desktop experience with optimal spacing

### Key Responsive Features
- Collapsible table columns on small screens
- Stacked action buttons on mobile
- Responsive form layouts
- Touch-friendly button sizes
- Optimized typography scaling

## Security Features

### Input Validation
- Server-side validation for all fields
- Unique server code enforcement
- Required field validation
- Data sanitization

### Error Handling
- Comprehensive error messages
- User-friendly error display
- Logging for debugging
- Graceful fallbacks

## Customization

### Adding New Countries
Edit the country dropdown in `servers.html`:
```html
<select id="serverCountry" name="serverCountry" required>
    <option value="India" selected>India</option>
    <option value="USA">USA</option>
    <!-- Add more countries here -->
</select>
```

### Adding New Status Types
Modify the status dropdown and update the status styling logic:
```javascript
// In updateServersTable() function
server.status === 'new_status' ? 'bg-custom-color/20 text-custom-color-300' :
```

### Styling Customization
The system uses Tailwind CSS classes and custom CSS variables:
- Primary colors: `#667eea` and `#764ba2`
- Glass effect: `rgba(255, 255, 255, 0.1)` with backdrop blur
- Responsive breakpoints: 480px, 640px, 768px, 1024px

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed
- Check your `MONGODB_URI` environment variable
- Verify MongoDB service is running
- Check network connectivity to MongoDB Atlas

#### Server Not Saving
- Ensure all required fields are filled
- Check for duplicate server codes
- Verify API endpoint is accessible

#### Page Not Loading
- Check browser console for JavaScript errors
- Verify all CSS and JS files are accessible
- Check server logs for backend errors

### Debug Mode
Enable debug mode to see detailed logs:
```bash
npm run debug
# or
DEBUG=true npm start
```

## Future Enhancements

### Planned Features
- **Server Monitoring**: Real-time server health checks
- **Performance Metrics**: Server load and response time tracking
- **Load Balancing**: Automatic server distribution
- **Backup & Restore**: Server configuration backup
- **API Rate Limiting**: Enhanced security measures
- **Audit Logs**: Track all server changes

### Integration Possibilities
- **Telegram Bot**: Server status notifications
- **Email Alerts**: Server downtime notifications
- **Dashboard Widgets**: Server metrics in admin panel
- **Mobile App**: Server management on mobile devices

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs and browser console
3. Test API endpoints individually
4. Verify MongoDB connection status

## License

This server management system is part of the OTP Bot project and follows the same licensing terms.

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Author**: OTP Bot Development Team
