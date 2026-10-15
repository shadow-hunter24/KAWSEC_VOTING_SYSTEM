import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useVotingSession } from '../../contexts/VotingSessionContext';

const C = {
  greenPrimary: '#1a4d2e', greenDark: '#0f2d1a', greenLight: '#e8f5ee',
  creamBg: '#fffdf7', creamCard: '#f5f0e8', creamBorder: '#e8e0cc', textMuted: '#5a5a4a',
};

const AUTO_LOGOUT_SECONDS = 10; // return to login after 10 seconds

interface CompleteState {
  full_name:    string;
  ballot_count: number;
  election_id:  string;
}

export default function BallotComplete() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const state     = location.state as CompleteState | null;
  const { markVoted, clearSession } = useVotingSession();

  const [countdown, setCountdown] = useState(AUTO_LOGOUT_SECONDS);

  // Mark voted + start auto-logout countdown
  useEffect(() => {
    if (!state?.full_name) { navigate('/', { replace: true }); return; }

    // Tell the session context voting is complete — stops the 5-min timer
    markVoted();

    const interval = setInterval(() => {
      setCountdown(s => {
        if (s <= 1) {
          clearInterval(interval);
          clearSession();
          navigate('/vote', { replace: true }); // back to login for next student
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) return null;

  function handleLogoutNow() {
    clearSession();
    navigate('/vote', { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: C.creamBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>

        <img src="/logo.png" alt="KAWSEC" width={72} height={72}
          style={{ display: 'block', margin: '0 auto 24px', objectFit: 'contain' }} />

        {/* Success ring */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          backgroundColor: C.greenLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: `0 0 0 8px ${C.greenLight}, 0 0 0 16px ${C.creamCard}`,
        }} aria-hidden="true">
          <CheckCircle size={40} color={C.greenPrimary} />
        </div>

        <h1 style={{ fontWeight: 800, fontSize: 'clamp(22px, 4vw, 30px)', color: C.greenPrimary, marginBottom: '10px' }}>
          Ballot Submitted!
        </h1>
        <p style={{ fontSize: '16px', color: '#1a1a1a', marginBottom: '6px' }}>
          Thank you, <strong>{state.full_name}</strong>.
        </p>
        <p style={{ fontSize: '14px', color: C.textMuted, lineHeight: 1.7, maxWidth: '380px', margin: '0 auto 24px' }}>
          Your ballot has been recorded. Your vote is private — results will be published by the IT Coordinator after voting closes.
        </p>

        {/* Non-revealing receipt */}
        <div style={{
          padding: '18px 24px', borderRadius: '14px',
          backgroundColor: C.white, border: `1px solid ${C.creamBorder}`,
          marginBottom: '24px', textAlign: 'left',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: C.textMuted, marginBottom: '12px' }}>
            Ballot Receipt
          </p>
          {[
            { label: 'Voter',          value: state.full_name },
            { label: 'Positions voted',value: String(state.ballot_count) },
            { label: 'Status',         value: '✓ Accepted', green: true },
            { label: 'Time',           value: new Date().toLocaleTimeString() },
          ].map(({ label, value, green }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: C.textMuted }}>{label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: green ? C.greenPrimary : '#1a1a1a' }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: C.creamCard }}>
            <p style={{ fontSize: '11px', color: C.textMuted, lineHeight: 1.5 }}>
              Your vote choices are private and are not shown here or to anyone — including administrators. This is by design.
            </p>
          </div>
        </div>

        {/* Auto-logout countdown */}
        <div style={{
          padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
          backgroundColor: countdown <= 3 ? '#fef2f2' : C.greenLight,
          border: `1px solid ${countdown <= 3 ? '#fca5a5' : C.greenPrimary + '30'}`,
          transition: 'background-color 0.5s',
        }} role="status" aria-live="polite">
          <p style={{ fontSize: '13px', fontWeight: 600, color: countdown <= 3 ? '#dc2626' : C.greenPrimary }}>
            {countdown <= 3
              ? `Logging out in ${countdown}…`
              : `This screen will close in ${countdown} seconds so the next student can vote.`}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={handleLogoutNow} style={{
            width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
            backgroundColor: C.greenPrimary, color: '#fff',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          }}>
            Done — Next Student
          </button>
          <Link to="/results" style={{ fontSize: '13px', color: C.textMuted, textDecoration: 'none', marginTop: '4px' }}>
            View Election Results Page →
          </Link>
        </div>

        <p style={{ marginTop: '28px', fontSize: '11px', color: C.creamBorder }}>
          KAWSEC Voting System · Nkawkaw Senior High School · © 2026
        </p>
      </div>
    </div>
  );
}
