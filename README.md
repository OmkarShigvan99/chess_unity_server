# ♟️ Chess Unity — Server (Express)

Real‑time chess backend powering rooms, sockets, Stockfish AI, Redis caching, and MongoDB persistence. Built for fast, resilient gameplay — whether you’re battling a friend or the engine.

• Live Demo: [https://chess-unity-client-qesu.vercel.app/] • Server Repo: [https://github.com/Omishigvan99/chess_unity_server] • Client Repo: [https://github.com/Omishigvan99/chess_unity_client]

> Showcase only — this is not an installation guide.

## ✨ What This Server Does

-   Socket.IO real‑time engine for instant moves and room sync
-   Google Meet–style joining: shareable links/codes for quick matches
-   Stockfish chess engine integration for AI games
-   Redis caching for low‑latency game state and smooth recovery
-   MongoDB persistence for completed games and history
-   Optional JWT auth (Bearer + cookies) for secure APIs

## 🧰 Tech Stack

-   Runtime: Node.js
-   Framework: Express.js
-   Realtime: Socket.IO
-   Cache: Redis
-   Database: MongoDB (Mongoose)
-   Engine: Stockfish
-   Extras: Morgan, Multer, Cloudinary (avatars), Nodemailer (optional)

## 🧱 High‑Level Architecture

Client (React + Socket.IO Client)
⇅
Server (Express + Socket.IO)
⇄ Redis (live, in‑memory game state)
⇄ MongoDB (finalized game records, users)
⇄ Stockfish (AI move generation)

## 🧩 Core Flows

1. Play with Friend

    - Create room → share link/code → both join via Socket.IO room
    - Moves broadcast in real time; Redis keeps state snappy and resilient

2. Play vs Computer
    - Server evaluates position via Stockfish and emits best move
    - Final results stored in MongoDB

## 📦 Key Highlights

-   Lag‑free real‑time gameplay with room isolation
-   Resilient mid‑game recovery (thanks to Redis)
-   Seamless AI integration for on‑demand bot matches
-   Clean, versioned REST endpoints that pair with the client

## 🔗 Repos

-   Server (this): [https://github.com/Omishigvan99/chess_unity_server]
-   Client (UI, board, GSAP, Ant Design): [https://github.com/Omishigvan99/chess_unity_client]

## 🔒 Security

-   JWT Bearer tokens supported in Authorization header
-   Cookie support for browser sessions
-   CORS configured to allow the paired client app

## 📣 Notes

-   Replace the repo links and demo URL with your actual links
-   This README intentionally focuses on showcasing the backend’s value
-   See the client README for UI/UX and gameplay visuals

---

Built for speed, resilience, and fun ♟️

# ♚ Chess Unity Server

A powerful Node.js backend for a real-time multiplayer chess web application with Stockfish 17 chess engine integration. This server handles game logic, room management, user authentication, and real-time communication through Socket.IO.

## 🎯 Live Demo

Visit the live application: [Chess Unity](https://chess-unity-client-qesu.vercel.app/)

## 📋 Overview

Chess Unity Server is the backend engine that powers the Chess Unity web application. It provides:

-   **Real-time Multiplayer Gaming** via Socket.IO
-   **AI-Powered Gameplay** using Stockfish 17 chess engine
-   **Persistent Game State Management** with Redis caching
-   **User Authentication** with JWT and email verification
-   **Game Statistics Tracking** and user profiles
-   **Room-based Architecture** for collaborative gameplay

## 🏗️ Tech Stack

### Core Technologies

-   **Node.js & Express.js** - RESTful API server and middleware
-   **Socket.IO** - Real-time bidirectional communication for room creation and message passing
-   **MongoDB** - Primary database for persistent data storage
-   **Redis** - In-memory caching for game state and performance optimization
-   **Stockfish 17 Engine** - Chess AI powered by the leading open-source chess engine

### Authentication & Security

-   **JWT (JSON Web Tokens)** - Secure token-based authentication
-   **Email Verification** - User email confirmation system
-   **Bcrypt** - Password hashing and security
-   **CORS** - Cross-origin resource sharing configuration

### Additional Libraries

-   **Cloudinary** - Image storage and management
-   **Nodemailer** - Email service for notifications
-   **Multer** - File upload handling
-   **Morgan** - HTTP request logging
-   **Cookie Parser** - Cookie handling middleware

### Deployment

-   **Render** - Cloud platform for backend hosting

## 🚀 Features

### 1. Real-Time Room Management

-   Create and join game rooms via shareable links (like Google Meet)
-   Temporary room state managed in Redis cache
-   Automatic cleanup of abandoned rooms

### 2. Stockfish Chess Engine Integration

-   Seamless communication via stdin/stdout pipes
-   Chess bot capable of multiple difficulty levels
-   Real-time move calculation and validation

### 3. Game State Management

-   **Fast Read/Write Operations** using Redis cache
-   **Persistent Storage** with MongoDB for completed games
-   **Session Recovery** - Users can resume games if their browser closes unexpectedly
-   **Time Management** - Game state preserved within time limit

### 4. User Authentication

-   JWT-based authentication system
-   Email verification workflow
-   Secure password storage with bcrypt
-   User profile management

### 5. Statistics & Dashboard

-   Track user game history
-   Calculate win/loss ratios
-   Elo rating calculations
-   Performance analytics

## 📁 Project Structure

```
chess_unity_server/
├── src/
│   ├── index.js              # Server entry point
│   ├── app.js                # Express app configuration
│   ├── constants.js          # Application constants
│   ├── controllers/          # Route controllers
│   ├── db/                   # Database configuration
│   ├── middlewares/          # Custom middlewares
│   ├── models/               # MongoDB schemas
│   ├── routes/               # API routes
│   ├── sockets/              # Socket.IO event handlers
│   ├── utils/                # Utility functions
│   └── chess_engine/         # Stockfish integration
├── public/
│   └── temp/                 # Temporary files
├── .env                      # Environment variables
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies
└── Dockerfile               # Docker configuration
```

## 🛠️ Installation & Setup

### Prerequisites

-   Node.js (v16 or higher)
-   MongoDB (local or cloud - Atlas)
-   Redis (local or cloud)
-   Stockfish 17 chess engine

### Steps

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd chess_unity_server
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Configure environment variables**

    Create a `.env` file in the root directory:

    ```env
    # Server Configuration
    PORT=5000
    NODE_ENV=development

    # Database
    MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chess_unity

    # Redis
    REDIS_URL=redis://localhost:6379
    # or for cloud Redis
    REDIS_URL=redis://:password@host:port

    # JWT Configuration
    JWT_SECRET=your_jwt_secret_key_here
    JWT_EXPIRE=7d

    # Email Configuration
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASSWORD=your_app_password
    EMAIL_SERVICE=gmail

    # Cloudinary
    CLOUDINARY_NAME=your_cloudinary_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret

    # Client URL (for CORS)
    CLIENT_URL=http://localhost:5173

    # Stockfish Path
    STOCKFISH_PATH=./chess_engine/stockfish/stockfish
    ```

4. **Set up Stockfish engine**

    - Download Stockfish 17 from [official website](https://stockfishchess.org/download/)
    - Place executable in `chess_engine/stockfish/` directory

5. **Start MongoDB and Redis**

    ```bash
    # MongoDB (if running locally)
    mongod

    # Redis (if running locally)
    redis-server
    ```

6. **Run the server**

    ```bash
    # Development mode with hot reload
    npm run dev

    # Production mode
    npm start
    ```

    Server will start on `http://localhost:5000`

<!-- API Endpoints & Data Models removed for simplicity -->

## 🔒 Authentication Flow

1. User registers with email and password
2. Verification email sent to user's email
3. User verifies email and completes registration
4. On login, JWT token is generated and sent
5. Token is used for subsequent authenticated requests
6. Refresh token mechanism for session extension

## 🎮 Game Logic

### Move Validation

-   Moves validated against chess rules using Stockfish
-   Invalid moves rejected with error message
-   Move history maintained in game record

### AI Opponent

-   Stockfish engine evaluates board position
-   Best move calculated based on difficulty level
-   Move sent to client in real-time

### Game Completion

-   Game ends on checkmate, stalemate, or resignation
-   Final game state saved to MongoDB
-   User statistics updated

<!-- Docker and Render deployment sections removed as requested -->

## 🛣️ Future Enhancements

-   [ ] Tournament system
-   [ ] Spectator mode
-   [ ] Game analysis tools
-   [ ] Player ratings and leaderboards
-   [ ] Mobile app support
-   [ ] WebRTC for peer-to-peer gameplay
-   [ ] Advanced statistics and performance metrics

## 📞 API Response Format

All API responses follow this format:

```json
{
    "success": true,
    "data": {
        /* response data */
    },
    "message": "Operation successful"
}
```

Error responses:

```json
{
    "success": false,
    "error": "Error message",
    "statusCode": 400
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🔗 Related Repositories

-   **Frontend Client**: [Chess Unity Client](https://github.com/Omishigvan99/chess-unity-client)

## 💬 Contact & Support

For issues, questions, or suggestions, please open an issue on the repository or contact the development team.

---

**Built with ❤️ by the Chess Unity Team**

**Powered by Stockfish 17** - The World's Strongest Open-Source Chess Engine
