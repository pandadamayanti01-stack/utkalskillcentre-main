import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc,
  query,
  where,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export interface RemoteCommand {
  type: 'navigate' | 'click' | 'scroll' | 'highlight' | 'pointer';
  target?: string; // CSS selector or path
  data?: any;
  timestamp: number;
}

export interface SupportSession {
  id: string;
  studentUid: string;
  studentName: string;
  status: 'pending' | 'active' | 'ended';
  adminUid?: string;
  lastCommand?: RemoteCommand;
  pointer?: { x: number, y: number };
  createdAt: any;
}

/**
 * Generates a random 6-digit session ID
 */
export const generateSupportCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Creates a new support session for a student
 */
export const createSupportSession = async (studentUid: string, studentName: string) => {
  const code = generateSupportCode();
  const sessionDoc = doc(db, 'remote_support', code);
  
  const sessionData: SupportSession = {
    id: code,
    studentUid,
    studentName,
    status: 'pending',
    createdAt: serverTimestamp()
  };

  await setDoc(sessionDoc, sessionData);
  return code;
};

/**
 * Admin joins a session
 */
export const joinSupportSession = async (code: string, adminUid: string) => {
  const sessionDoc = doc(db, 'remote_support', code);
  const snap = await getDoc(sessionDoc);
  
  if (!snap.exists()) {
    throw new Error("Invalid support code");
  }

  await updateDoc(sessionDoc, {
    adminUid,
    status: 'active'
  });
};

/**
 * Sends a command from Admin to Student
 */
export const sendRemoteCommand = async (code: string, command: RemoteCommand) => {
  const sessionDoc = doc(db, 'remote_support', code);
  await updateDoc(sessionDoc, {
    lastCommand: { ...command, timestamp: Date.now() }
  });
};

/**
 * Updates the virtual pointer position
 */
export const updatePointer = async (code: string, x: number, y: number) => {
  const sessionDoc = doc(db, 'remote_support', code);
  await updateDoc(sessionDoc, {
    pointer: { x, y }
  });
};

/**
 * Ends a session
 */
export const endSupportSession = async (code: string) => {
  const sessionDoc = doc(db, 'remote_support', code);
  await updateDoc(sessionDoc, { status: 'ended' });
};

/**
 * Subscribes to the queue position for a pending session
 */
export const subscribeToQueuePosition = (
  sessionCreatedAt: any, 
  callback: (position: number) => void
) => {
  if (!sessionCreatedAt) {
    callback(0);
    return () => {};
  }
  
  const q = query(
    collection(db, 'remote_support'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snap) => {
    let position = 1;
    for (const doc of snap.docs) {
      const data = doc.data();
      // If this document was created before our session, we are behind it in queue
      if (data.createdAt && sessionCreatedAt && data.createdAt.toMillis() < sessionCreatedAt.toMillis()) {
        position++;
      } else if (data.createdAt && sessionCreatedAt && data.createdAt.toMillis() === sessionCreatedAt.toMillis()) {
        break; // Found our session
      }
    }
    callback(position);
  });
};

/**
 * Requests the student to start screen sharing
 */
export const requestScreenShare = async (code: string) => {
  const sessionDoc = doc(db, 'remote_support', code);
  await updateDoc(sessionDoc, {
    screenShareRequested: true,
    screenShareStatus: 'requested'
  });
};

/**
 * Updates the screen share status
 */
export const updateScreenShareStatus = async (code: string, status: 'inactive' | 'requested' | 'streaming' | 'failed') => {
  const sessionDoc = doc(db, 'remote_support', code);
  await updateDoc(sessionDoc, {
    screenShareStatus: status
  });
};

/**
 * Stops screen sharing on both ends
 */
export const stopScreenShare = async (code: string) => {
  const sessionDoc = doc(db, 'remote_support', code);
  await updateDoc(sessionDoc, {
    screenShareRequested: false,
    screenShareStatus: 'inactive',
    webrtc_offer: null,
    webrtc_answer: null
  });
};

