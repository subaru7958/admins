# Sports Team Management Backend

A comprehensive Express.js backend for sports team management platform with user registration, file uploads, and MongoDB integration.

## Features

- ✅ Team registration with file uploads
- ✅ Password hashing with bcrypt
- ✅ MongoDB integration with Mongoose
- ✅ File upload handling with Multer
- ✅ Email uniqueness validation
- ✅ Comprehensive error handling
- ✅ CORS enabled for frontend integration

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/sportmanager
NODE_ENV=development
```

### 3. Setup Uploads Directory
```bash
node setup.js
```

### 4. Start the Server
```bash
npm run dev
```

## API Endpoints

### POST /api/auth/register
Register a new sports team.

**Request Body (multipart/form-data):**
- `teamName` (string, required): Team name
- `discipline` (string, required): Sport discipline (football, natation, handball, basketball)
- `email` (string, required): Team email (must be unique)
- `password` (string, required): Password (min 6 characters)
- `phoneNumber` (string, required): Phone number
- `teamLogo` (file, optional): Team logo image (max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "Team registered successfully!",
  "data": {
    "_id": "team_id",
    "teamName": "Team Name",
    "discipline": "football",
    "email": "team@example.com",
    "phoneNumber": "+1234567890",
    "teamLogo": "/uploads/filename.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/auth/teams
Get all registered teams (for admin purposes).

**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "team_id",
      "teamName": "Team Name",
      "discipline": "football",
      "email": "team@example.com",
      "phoneNumber": "+1234567890",
      "teamLogo": "/uploads/filename.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/auth/teams/:id
Get a specific team by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "team_id",
    "teamName": "Team Name",
    "discipline": "football",
    "email": "team@example.com",
    "phoneNumber": "+1234567890",
    "teamLogo": "/uploads/filename.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## File Upload

- **Location**: `/uploads/` directory
- **File Types**: Images only (jpg, png, gif, webp, etc.)
- **Max Size**: 5MB
- **Access**: Files are served statically at `/uploads/filename`

## Database Schema

### Team Model
```javascript
{
  teamName: String (required, min 2 chars),
  discipline: String (required, enum: football, natation, handball, basketball),
  email: String (required, unique, lowercase),
  password: String (required, min 6 chars, hashed),
  phoneNumber: String (required),
  teamLogo: String (optional, file path),
  createdAt: Date,
  updatedAt: Date
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Validation error 1", "Validation error 2"] // Optional
}
```

## Security Features

- ✅ Password hashing with bcrypt (salt rounds: 12)
- ✅ Email uniqueness validation
- ✅ File type validation (images only)
- ✅ File size limits (5MB)
- ✅ Input sanitization and validation
- ✅ CORS enabled for frontend integration

## Development

### Running in Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm start
```

## File Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── Controller/
│   └── authController.js    # Authentication logic
├── Models/
│   └── Team.js             # Team model schema
├── routes/
│   └── authRoutes.js       # Authentication routes
├── uploads/                # File upload directory
├── server.js              # Main server file
├── setup.js               # Setup script
└── package.json
``` 