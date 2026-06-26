import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';

export interface GameState {
  tigers: { r: number; c: number }[];
  goats: { r: number; c: number }[];
  goatsRemainingToPlace: number;
  capturedGoats: number;
  turn: 'goats' | 'tigers';
  phase: 'placement' | 'movement' | 'victory_goats' | 'victory_tigers';
}

export interface GameSession {
  id: string;
  playerGoats: { uid: string; name: string } | null;
  playerTigers: { uid: string; name: string } | null;
  status: 'waiting' | 'active' | 'abandoned';
  boardState: GameState;
}

/**
 * Service to manage real-time online multiplayer sessions for traditional games via Firestore.
 */
export const multiplayerService = {
  /**
   * Find an open waiting session or create a new one.
   */
  createOrJoinSession: async (userId: string, userName: string): Promise<{ sessionId: string; role: 'goats' | 'tigers' }> => {
    const sessionsColl = collection(db, 'game_sessions');
    
    // Query for any active session waiting for a second player (Tigers)
    const q = query(
      sessionsColl,
      where('status', '==', 'waiting'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const sessionDoc = snapshot.docs[0];
      const sessionId = sessionDoc.id;
      
      // Join as Tigers
      await updateDoc(doc(db, 'game_sessions', sessionId), {
        playerTigers: { uid: userId, name: userName },
        status: 'active',
        updatedAt: serverTimestamp()
      });
      
      return { sessionId, role: 'tigers' };
    } else {
      // Create a new session as Goats (Host)
      const initialBoardState: GameState = {
        tigers: [
          { r: 0, c: 0 },
          { r: 0, c: 4 }
        ],
        goats: [],
        goatsRemainingToPlace: 15,
        capturedGoats: 0,
        turn: 'goats',
        phase: 'placement'
      };
      
      const newSessionRef = await addDoc(sessionsColl, {
        playerGoats: { uid: userId, name: userName },
        playerTigers: null,
        status: 'waiting',
        boardState: initialBoardState,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { sessionId: newSessionRef.id, role: 'goats' };
    }
  },

  /**
   * Listen to real-time changes in a game session.
   */
  listenToSession: (sessionId: string, callback: (session: GameSession) => void) => {
    return onSnapshot(doc(db, 'game_sessions', sessionId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          id: docSnap.id,
          playerGoats: data.playerGoats,
          playerTigers: data.playerTigers,
          status: data.status,
          boardState: data.boardState
        });
      }
    });
  },

  /**
   * Update the game board state.
   */
  updateGameState: async (sessionId: string, boardState: GameState): Promise<void> => {
    await updateDoc(doc(db, 'game_sessions', sessionId), {
      boardState,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Abandons the game session.
   */
  leaveSession: async (sessionId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'game_sessions', sessionId), {
        status: 'abandoned',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Error leaving session:', e);
    }
  }
};
