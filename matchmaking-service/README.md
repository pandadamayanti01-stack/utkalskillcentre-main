# Matchmaking Microservice

This is a standalone matchmaking microservice designed for the **Gundulu Game Zone**. It maintains an in-memory queue of active players seeking gameplay matchups and couples them into game sessions based on shared curriculum levels (Class and Subject).

## Features
- In-memory player queue with automated matcher looping every 2 seconds.
- FIFO queue processing.
- Multi-game/subject groupings.
- Clean session expiration after 30 minutes.

## Setup & Running Local

1. Navigate to the microservice directory:
   ```bash
   cd matchmaking-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Build and start production:
   ```bash
   npm run build
   npm start
   ```

The server listens on port `3001` by default.

## API Endpoints

### 1. Join Queue
- **URL**: `POST /api/matchmaking/join`
- **Body**:
  ```json
  {
    "userId": "user_123",
    "userName": "Rohan",
    "classId": "class_5",
    "subjectId": "math"
  }
  ```
- **Response**:
  ```json
  {
    "status": "queued",
    "userId": "user_123"
  }
  ```

### 2. Leave Queue
- **URL**: `POST /api/matchmaking/leave`
- **Body**:
  ```json
  {
    "userId": "user_123"
  }
  ```
- **Response**:
  ```json
  {
    "status": "removed"
  }
  ```

### 3. Check Matchmaking Status
- **URL**: `GET /api/matchmaking/status/:userId`
- **Response (Waiting)**:
  ```json
  {
    "status": "waiting"
  }
  ```
- **Response (Matched)**:
  ```json
  {
    "status": "matched",
    "session": {
      "sessionId": "session-178156...",
      "players": {
        "player1": { "userId": "user_123", "userName": "Rohan" },
        "player2": { "userId": "user_456", "userName": "Priya" }
      },
      "classId": "class_5",
      "subjectId": "math",
      "createdAt": 1781561234567
    }
  }
  ```

### 4. Admin Queue State
- **URL**: `GET /api/matchmaking/queue`

### 5. Admin Matched Sessions
- **URL**: `GET /api/matchmaking/sessions`

### 6. Health Check
- **URL**: `GET /health`
