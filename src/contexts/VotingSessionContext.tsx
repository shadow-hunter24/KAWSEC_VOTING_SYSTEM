// ============================================================
// VotingSessionContext
// ============================================================
// Holds the authenticated student's ballot session state.
// Enforces a 5-minute countdown from the moment the student
// authenticates. When time expires, session is cleared and
// the student is redirected back to /vote automatically.
//
// Also tracks whether the student has already voted so the
// system can show an "already voted" screen immediately on
// any attempt to re-enter the ballot.
// ============================================================

import {
  createContext, useContext, useEffect, useRef,
  useState, type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

export const SESSION_DURATION_SECONDS = 5 * 60; // 5 minutes

export interface VotingAuthState {
  student_id:    string;
  full_name:     string;
  election_id:   string;
  session_token: string;
  started_at:    number; // Date.now() when session began
}

interface VotingSessionValue {
  session:          VotingAuthState | null;
  secondsRemaining: number;
  expired:          boolean;
  alreadyVoted:     boolean;
  startSession:     (auth: Omit<VotingAuthState, 'started_at'>) => void;
  markVoted:        () => void;
  clearSession:     () => void;
}

const VotingSessionContext = createContext<VotingSessionValue>({
  session: null, secondsRemaining: SESSION_DURATION_SECONDS,
  expired: false, alreadyVoted: false,
  startSession: () => {}, markVoted: () => {}, clearSession: () => {},
});

export function VotingSessionProvider({ children }: { children: ReactNode }) {
  const navigate    = useNavigate();
  const [session,          setSession]          = useState<VotingAuthState | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(SESSION_DURATION_SECONDS);
  const [expired,          setExpired]          = useState(false);
  const [alreadyVoted,     setAlreadyVoted]     = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startSession(auth: Omit<VotingAuthState, 'started_at'>) {
    const newSession: VotingAuthState = { ...auth, started_at: Date.now() };
    setSession(newSession);
    setSecondsRemaining(SESSION_DURATION_SECONDS);
    setExpired(false);
    setAlreadyVoted(false);
  }

  function markVoted() {
    setAlreadyVoted(true);
    // Clear the countdown — no point counting down after voting
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function clearSession() {
    setSession(null);
    setExpired(false);
    setAlreadyVoted(false);
    setSecondsRemaining(SESSION_DURATION_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  // Countdown tick
  useEffect(() => {
    if (!session || alreadyVoted) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - session.started_at) / 1000);
      const remaining = Math.max(SESSION_DURATION_SECONDS - elapsed, 0);
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        setExpired(true);
        setSession(null);
        // Redirect to login with expiry message
        navigate('/vote', { state: { expired: true }, replace: true });
      }
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session, alreadyVoted, navigate]);

  return (
    <VotingSessionContext.Provider value={{
      session, secondsRemaining, expired, alreadyVoted,
      startSession, markVoted, clearSession,
    }}>
      {children}
    </VotingSessionContext.Provider>
  );
}

export function useVotingSession() {
  return useContext(VotingSessionContext);
}

// ── Timer display helper ──────────────────────────────────────
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
