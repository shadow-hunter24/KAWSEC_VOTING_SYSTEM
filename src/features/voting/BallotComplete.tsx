// ============================================================
// KAWSEC Voting System — BallotComplete
// ============================================================
// Non-revealing confirmation screen shown after successful
// ballot submission. Shows NO candidate names or choices —
// only confirms that the ballot was accepted.
// ============================================================

import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const C = {
  greenPrimary: '#1a4d2e', greenDark: '#0f2d1a', greenLight: '#e8f5ee',
  creamBg: '#fffdf7', creamCard: '#f5f0e8', creamBorder: '#e8e0cc', textMuted: '#5a5a4a',
};

interface CompleteState {
  full_name:    string;
  ballot_count: number;
  election_id:  string;
}

export default function BallotComplete() {
  const location = useLocation();
  const navigate = useNavigate();
  const state    = location.state as CompleteState | null;

  // Guard: if navigated here directly (no state), send home
  useEffect(() => {
    if (!state?.full_name) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  if (!state) return null;

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: C.creamBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>

        {/* Logo */}
        <img src="/logo.png" alt="KAWSEC" width={72} height={72}
          style={{ display: 'block', margin: '0 auto 24px', objectFit: 'contain' }} />

        {/* Success icon */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          backgroundColor: C.greenLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: `0 0 0 8px ${C.greenLight}, 0 0 0 16px ${C.creamCard}`,
        }} aria-hidden="true">
          <CheckCircle size={40} color={C.greenPrimary} />
        </div>

        <h1 style={{
          fontWeight: 800, fontSize: 'clamp(22px, 4vw, 30px)',
          color: C.greenPrimary, marginBottom: '12px',
        }}>
          Ballot Submitted!
        </h1>

        <p style={{ fontSize: '16px', color: '#1a1a1a', marginBottom: '8px' }}>
          Thank you, <strong>{state.full_name}</strong>.
        </p>

        <p style={{ fontSize: '14px', color: C.textMuted, lineHeight: 1.7, maxWidth: '380px', margin: '0 auto 28px' }}>
          Your ballot has been recorded successfully.
          Your votes are private — results will be published by the IT Coordinator after voting closes.
        </p>

        {/* Receipt — no candidate names, just confirmation */}
        <div style={{
          padding: '18px 24px', borderRadius: '14px',
          backgroundColor: C.white, border: `1px solid ${C.creamBorder}`,
          marginBottom: '32px', textAlign: 'left',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: C.textMuted, marginBottom: '10px' }}>
            Ballot Receipt
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: C.textMuted }}>Voter</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{state.full_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: C.textMuted }}>Positions voted</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{state.ballot_count}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: C.textMuted }}>Status</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.greenPrimary }}>✓ Accepted</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: C.textMuted }}>Time</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{new Date().toLocaleTimeString()}</span>
          </div>
          <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '8px', backgroundColor: C.creamCard }}>
            <p style={{ fontSize: '11px', color: C.textMuted, lineHeight: 1.5 }}>
              Your individual vote choices are private and are not shown here or to anyone else — including system administrators. This is by design.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <Link
            to="/results"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '13px 28px', borderRadius: '10px',
              backgroundColor: C.greenPrimary, color: '#fff',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none',
              width: '100%', justifyContent: 'center',
            }}
          >View Election Results Page</Link>

          <Link
            to="/"
            style={{ fontSize: '13px', color: C.textMuted, textDecoration: 'none', marginTop: '4px' }}
          >← Back to Home</Link>
        </div>

        <p style={{ marginTop: '32px', fontSize: '11px', color: C.creamBorder }}>
          KAWSEC Voting System · Nkawkaw Senior High School · © 2026
        </p>
      </div>
    </div>
  );
}
