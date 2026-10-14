import { Link } from 'react-router-dom';

const C = {
  greenPrimary: '#1a4d2e',
  greenDark:    '#0f2d1a',
  greenLight:   '#e8f5ee',
  creamCard:    '#f5f0e8',
  creamBorder:  '#e8e0cc',
  textMuted:    '#5a5a4a',
};

export default function BallotPlaceholder() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      background: `linear-gradient(150deg, ${C.greenDark} 0%, ${C.greenPrimary} 100%)`,
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{
          backgroundColor: '#fffdf7', borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(15,45,26,0.4)',
          padding: '40px 32px', textAlign: 'center',
        }}>
          <img src="/logo.png" alt="KAWSEC" width={72} height={72}
            style={{ display: 'block', margin: '0 auto 20px', objectFit: 'contain' }} />

          <h1 style={{ fontSize: '20px', fontWeight: 800, color: C.greenPrimary, marginBottom: '8px' }}>
            Ballot Voting
          </h1>
          <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '20px' }}>
            Phase 4 — Coming Soon
          </p>

          <div style={{
            padding: '14px 16px', borderRadius: '10px', marginBottom: '20px',
            backgroundColor: C.greenLight, border: `1px solid ${C.greenPrimary}22`,
          }} role="status" aria-live="polite">
            <p style={{ fontSize: '14px', fontWeight: 600, color: C.greenPrimary }}>✓ Authenticated successfully</p>
          </div>

          <p style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.65, marginBottom: '28px' }}>
            The position-by-position ballot voting interface will be implemented in Phase 4.
            Your authentication is working correctly.
          </p>

          <span style={{
            display: 'inline-block', fontSize: '11px', fontWeight: 700,
            padding: '5px 14px', borderRadius: '999px', marginBottom: '28px',
            backgroundColor: C.creamCard, color: C.greenPrimary,
            border: `1px solid ${C.creamBorder}`,
          }}>Phase 4 — Secure Ballot Voting</span>

          <div>
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '10px',
              backgroundColor: C.greenPrimary, color: '#fff',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none',
            }}>← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
