# Improve My City - Backend

REST API backend for the Improve My City civic issue reporting platform. Built with Node.js, Express, TypeScript, and MongoDB.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/improve-my-city
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/improve-my-city

JWT_SECRET=your-secret-key-here

GMAIL_PASSWORD=your-gmail-password

GROQ_API_KEY=your-groq-api-key
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start at `http://localhost:3000`

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/issues` - Get all issues
- `POST /api/issues` - Create new issue
- `PATCH /api/issues/:id` - Update issue
- `DELETE /api/issues/:id` - Delete issue
- `GET /api/leaderboard` - Get leaderboard
- `POST /api/chatbot` - Chatbot interactions

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- JWT Authentication
- Winston (Logging)
- Langchain (AI Chatbot)
