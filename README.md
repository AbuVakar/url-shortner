# Link Shrink - URL Shortener

A full-stack URL shortener application built with React, Node.js, Express, and MongoDB. This application allows users to shorten long URLs and provides an admin dashboard to manage shortened links.

## Features

- **URL Shortening**: Convert long URLs into short, shareable links
- **Link Redirection**: Short links redirect to the original URLs
- **Visit Tracking**: Track the number of clicks on each shortened URL
- **Admin Dashboard**: View and manage all shortened URLs
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- React Icons for UI icons
- Inline styles for styling

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- nanoid for generating short codes
- CORS for cross-origin requests

## Project Structure

```
url-shortener/
├── frontend/               # React frontend
│   ├── public/             # Static files
│   └── src/                # Source files
│       ├── pages/          # Page components
│       │   └── AdminPage.js # Admin dashboard
│       ├── App.js          # Main component
│       └── index.js        # Entry point
└── backend/                # Node.js backend
    ├── models/             # Database models
    │   └── Url.js          # URL model
    ├── routes/             # API routes
    │   └── urlRoutes.js    # URL-related routes
    ├── server.js           # Express server
    └── package.json        # Backend dependencies
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ADMIN_SECRET=your_admin_secret
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. The application should now be running at `http://localhost:3000`

## API Endpoints

### Public Endpoints

- `POST /api/shorten` - Create a new short URL
  - Request body: `{ "original_url": "https://example.com" }`
  - Response: `{ "short_url": "http://localhost:5000/abc123" }`

- `GET /:code` - Redirect to the original URL

### Admin Endpoints (Requires Authentication)

- `GET /api/admin/urls` - Get all URLs
- `DELETE /api/admin/urls/:short_code` - Delete a URL

## Admin Access

To access the admin dashboard:
1. Navigate to `/admin`
2. Enter the admin secret (default: `admin123` or as set in `.env`)

## Deployment

### Frontend Deployment

1. Build the production version:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the `build` directory to your preferred static hosting service (e.g., Vercel, Netlify, or GitHub Pages).

### Backend Deployment

1. Deploy the backend to a Node.js hosting service (e.g., Heroku, Render, or Railway).
2. Update the frontend's API base URL to point to your deployed backend.

## Environment Variables

### Backend
- `PORT` - Port for the backend server (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `ADMIN_SECRET` - Secret key for admin authentication

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

[Your Name] - [Your Email]

## Acknowledgments

- Built with React and Express
- Uses MongoDB for data storage
- Icons from React Icons
