// Matchmaking Microservice Client Wrapper
// This file acts as the bridge to an isolated matchmaking microservice,
// ensuring the main client app is free from direct database matchmaking writes.

export interface MatchSession {
  sessionId: string;
  opponentId: string;
  opponentName: string;
  classId: string;
  subjectId: string;
}

export const MatchmakingService = {
  /**
   * Registers a user in the matchmaking queue via a microservice endpoint.
   * Currently disabled on the main client app as per design guidelines.
   */
  joinQueue: async (userId: string, classId: string, subjectId: string): Promise<MatchSession | null> => {
    console.log(`[Matchmaking Service] Requesting matchmaking for user: ${userId} in ${classId}-${subjectId}`);
    
    // In a future deployment, this makes a POST request to our external matchmaking microservice API:
    // const res = await fetch('https://matchmaking-service-url/api/queue', { method: 'POST', body: JSON.stringify({ userId, classId, subjectId }) });
    // return res.json();
    
    return null; // Bypassed: Solo Gundulu AI play is preferred on the client app
  },

  /**
   * Sends a direct game challenge to a followed friend.
   */
  sendChallenge: async (challengerId: string, opponentId: string, classId: string): Promise<boolean> => {
    console.log(`[Matchmaking Service] Sending direct challenge: ${challengerId} -> ${opponentId}`);
    return false;
  },

  /**
   * Polls or listens to active challenge responses.
   */
  listenToChallenges: (userId: string, onChallengeReceived: (challenge: any) => void) => {
    console.log(`[Matchmaking Service] Listening to challenges for user: ${userId}`);
    // No-op client-side placeholder
    return () => {}; 
  }
};
