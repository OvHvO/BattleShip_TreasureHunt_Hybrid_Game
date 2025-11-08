# 🎮 Hybrid Game

A real-time multiplayer turn-based game built with Next.js, featuring QR code scanning mechanics, live scoring, and player statistics tracking.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Game Rules](#game-rules)
- [Environment Variables](#environment-variables)
- [API Routes](#api-routes)
- [Database Schema](#database-schema)
- [Contributing](#contributing)

## ✨ Features

### 🎯 Core Gameplay
- **Turn-Based System**: Players take turns in sequential order (Player 1 → 2 → 3 → 4)
- **QR Code Scanning**: Mobile-optimized QR scanner with automatic back camera detection
- **Multiple Actions**: 
  - Scan QR codes to earn points
  - Skip turn
  - Mark as dead (player elimination)
- **Two Winning Conditions**:
  - First player to reach 10 points wins
  - Last player standing wins

### 👥 Room Management
- Create and join game rooms
- Real-time room status updates
- 4-player maximum per room
- Room codes for easy joining

### 📊 Player Profile
- Personal statistics tracking
- Game history with detailed results
- Win rate and average score calculations
- Performance metrics

### 🔐 Authentication
- User registration and login
- Protected routes
- Session management

### 📱 Responsive Design
- Mobile-first approach
- Optimized QR scanner for mobile devices
- Touch-friendly interface
- Adaptive layouts

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 15.5.2](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: 
  - Radix UI primitives
  - Material-UI components
  - Custom shadcn/ui components
- **QR Scanner**: html5-qrcode

### Backend
- **API**: Next.js API Routes
- **Database**: MySQL
- **Authentication**: Custom auth with bcrypt

### Development Tools
- ESLint for code linting
- Turbopack for fast development builds
- TypeScript for type safety

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- MySQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/OvHvO/Hybrid_Game.git
   cd fwdd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=your_database_name
   DB_PORT=3306
   ```

4. **Set up the database**
   
   Run the SQL schema to create necessary tables:
   - `users` - User accounts
   - `rooms` - Game rooms
   - `room_players` - Player-room relationships
   - `game_results` - Game outcomes and scores
   - `user_stats` - Aggregated player statistics

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
fwdd/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── rooms/         # Room management & game logic
│   │   │   └── profile/       # User profile endpoints
│   │   ├── game/[id]/         # Game room page
│   │   ├── lobby/             # Game lobby
│   │   ├── login/             # Login page
│   │   ├── profile/           # User profile page
│   │   └── register/          # Registration page
│   ├── components/            # React components
│   │   ├── ui/                # UI components
│   │   └── protected-route.tsx
│   ├── lib/                   # Utility libraries
│   │   ├── db.ts              # Database connection
│   │   ├── auth-context.tsx   # Auth context provider
│   │   └── theme.ts           # Theme configuration
│   └── styles/                # Global styles
├── public/                    # Static assets
└── package.json
```

## 🎲 Game Rules

### Starting a Game
1. Create or join a room (max 4 players)
2. Room creator starts the game
3. First player begins their turn

### Turn Actions
Each player on their turn can:
- **Scan QR**: Scan a QR code to earn points
- **Skip**: Pass the turn to the next player
- **Dead**: Mark themselves as eliminated

### Winning the Game
- **Victory Condition 1**: First player to reach 10 points
- **Victory Condition 2**: Last player remaining (all others eliminated)

### Turn Order
- Players take turns sequentially (1 → 2 → 3 → 4 → 1)
- Eliminated players are skipped
- Turn advances automatically after each action

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | MySQL database host | Yes |
| `DB_USER` | MySQL username | Yes |
| `DB_PASSWORD` | MySQL password | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_PORT` | MySQL port (default: 3306) | No |

## 🌐 API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Rooms
- `GET /api/rooms` - List all available rooms
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/[id]` - Get room details
- `POST /api/rooms/[id]/join` - Join a room
- `POST /api/rooms/[id]/leave` - Leave a room
- `POST /api/rooms/[id]/start` - Start the game
- `GET /api/rooms/[id]/players-scores` - Get player scores
- `POST /api/rooms/[id]/update-score` - Update player score
- `POST /api/rooms/[id]/skip-turn` - Skip current turn
- `POST /api/rooms/[id]/mark-dead` - Mark player as dead

### Profile
- `GET /api/profile/[id]/stats` - Get user statistics
- `GET /api/profile/[id]/history` - Get game history

## 🗄️ Database Schema

### Key Tables

**users**
- `user_id`, `username`, `password_hash`, `email`, `created_at`

**rooms**
- `room_id`, `room_name`, `room_code`, `status`, `creator_id`, `current_turn_user_id`, `winner_id`

**room_players**
- `room_id`, `user_id`, `status` (active/dead), `joined_at`

**game_results**
- `result_id`, `room_id`, `user_id`, `score`, `result`, `finished_at`

**user_stats**
- `user_id`, `total_games_played`, `total_wins`, `total_score`

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is private and not licensed for public use.

## 👨‍💻 Author

**OvHvO**
- GitHub: [@OvHvO](https://github.com/OvHvO)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Radix UI for accessible components
- html5-qrcode library for QR scanning functionality

---

Built with ❤️ using Next.js and TypeScript
