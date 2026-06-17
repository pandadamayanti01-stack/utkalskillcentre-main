import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

interface QueueEntry {
  userId: string;
  userName: string;
  classId: string;
  subjectId: string;
  joinedAt: number;
}

interface MatchSession {
  sessionId: string;
  players: {
    player1: { userId: string; userName: string };
    player2: { userId: string; userName: string };
  };
  classId: string;
  subjectId: string;
  createdAt: number;
}

// In-memory queues and match states
let queue: QueueEntry[] = [];
const activeSessions = new Map<string, MatchSession>();
const userToSessionMap = new Map<string, string>(); // userId -> sessionId

// Matchmaking Loop running every 2 seconds
setInterval(() => {
  if (queue.length < 2) return;

  // Group queue by classId + subjectId to match peers of same curriculum levels
  const groups = new Map<string, QueueEntry[]>();
  for (const entry of queue) {
    const key = `${entry.classId}-${entry.subjectId}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  // Process matches in each curriculum group
  for (const [key, group] of groups.entries()) {
    // Sort by joinedAt (First-In, First-Out)
    group.sort((a, b) => a.joinedAt - b.joinedAt);

    while (group.length >= 2) {
      const p1 = group.shift()!;
      const p2 = group.shift()!;

      // Remove the matched users from the global queue
      queue = queue.filter(x => x.userId !== p1.userId && x.userId !== p2.userId);

      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const session: MatchSession = {
        sessionId,
        players: {
          player1: { userId: p1.userId, userName: p1.userName },
          player2: { userId: p2.userId, userName: p2.userName }
        },
        classId: p1.classId,
        subjectId: p1.subjectId,
        createdAt: Date.now()
      };

      activeSessions.set(sessionId, session);
      userToSessionMap.set(p1.userId, sessionId);
      userToSessionMap.set(p2.userId, sessionId);

      console.log(`[Matcher] Matched: ${p1.userName} (${p1.userId}) & ${p2.userName} (${p2.userId}) inside session: ${sessionId} for ${key}`);
    }
  }
}, 2000);

// Periodically clean up old sessions (inactive after 30 minutes)
setInterval(() => {
  const now = Date.now();
  const sessionExpiryLimit = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.createdAt > sessionExpiryLimit) {
      userToSessionMap.delete(session.players.player1.userId);
      userToSessionMap.delete(session.players.player2.userId);
      activeSessions.delete(sessionId);
      console.log(`[Cleanup] Cleared expired session: ${sessionId}`);
    }
  }
}, 60000);

// Join Queue Endpoint
app.post('/api/matchmaking/join', (req: express.Request, res: express.Response) => {
  const { userId, userName, classId, subjectId } = req.body;
  if (!userId || !userName || !classId || !subjectId) {
    return res.status(400).json({ error: 'Missing required parameters (userId, userName, classId, subjectId)' });
  }

  // Remove existing entries if already queued or matched
  queue = queue.filter(x => x.userId !== userId);
  const existingSessionId = userToSessionMap.get(userId);
  if (existingSessionId) {
    const session = activeSessions.get(existingSessionId);
    if (session) {
      userToSessionMap.delete(session.players.player1.userId);
      userToSessionMap.delete(session.players.player2.userId);
      activeSessions.delete(existingSessionId);
    }
  }

  const entry: QueueEntry = {
    userId,
    userName,
    classId,
    subjectId,
    joinedAt: Date.now()
  };
  queue.push(entry);

  console.log(`[Queue] User ${userName} (${userId}) joined queue for ${classId}-${subjectId}`);
  return res.json({ status: 'queued', userId });
});

// Leave Queue Endpoint
app.post('/api/matchmaking/leave', (req: express.Request, res: express.Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  const beforeCount = queue.length;
  queue = queue.filter(x => x.userId !== userId);
  
  if (queue.length < beforeCount) {
    console.log(`[Queue] User (${userId}) left the queue`);
  }

  return res.json({ status: 'removed' });
});

// Check Match Status Endpoint
app.get('/api/matchmaking/status/:userId', (req: express.Request, res: express.Response) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  const sessionId = userToSessionMap.get(userId);
  if (sessionId) {
    const session = activeSessions.get(sessionId);
    if (session) {
      return res.json({ status: 'matched', session });
    }
  }

  const isQueued = queue.some(x => x.userId === userId);
  if (isQueued) {
    return res.json({ status: 'waiting' });
  }

  return res.json({ status: 'idle' });
});

// Admin endpoint to inspect current queue
app.get('/api/matchmaking/queue', (_req: express.Request, res: express.Response) => {
  return res.json({ count: queue.length, queue });
});

// Admin endpoint to inspect active matched sessions
app.get('/api/matchmaking/sessions', (_req: express.Request, res: express.Response) => {
  return res.json({ count: activeSessions.size, sessions: Array.from(activeSessions.values()) });
});

// Health check endpoint
app.get('/health', (_req: express.Request, res: express.Response) => {
  return res.json({ status: 'ok', time: new Date() });
});

app.listen(PORT, () => {
  console.log(`Matchmaking microservice listening on port ${PORT}`);
});
