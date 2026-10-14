import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const C = {
  greenPrimary: '#1a4d2e',
  greenDark:    '#0f2d1a',
  greenLight:   '#e8f5ee',
  creamBg:      '#fffdf7',
  creamCard:    '#f5f0e8',
  creamBorder:  '#e8e0cc',
  textMuted:    '#5a5a4a',
};

export default function StudentLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'id' | 'credential'>('id');
  const [studentId, setStudentId] = useState('');
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) { setError('Please enter your Student ID.'); return; }
    setError(''); setLoading(true);
    setTimeout(() => { setLoading(false); setStep('credential'); }, 900);
  }

  function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!credential.trim()) { setError('Please enter your voting credential.'); return; }
    setError(''); setLoading(true);
    setTimeout(() => { setLoading(false); navigate('/vote/ballot'); }, 900);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '14px',
    color: '#1a1a1a', backgroundColor: C.creamBg,
    outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      background: `linear-gradient(150deg, ${C.greenDark} 0%, ${C.greenPrimary} 100%)`,
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Card */}
        <div style={{ backgroundColor: C.creamBg, borderRadius: '20px', boxShadow: '0 20px 60px rgba(15,45,26,0.4)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{
            padding: '32px 32px 24px', textAlign: 'center',
            backgroundColor: C.greenPrimary,
            borderBottom: `3px solid ${C.creamCard}`,
          }}>
            <img src="/logo.png" alt="KAWSEC" width={68} height={68}
              style={{ display: 'block', margin: '0 auto 14px', objectFit: 'contain' }} />
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', letterSpacing: '0.5px' }}>KAWSEC Voting System</h1>
            <p style={{ color: 'rgba(245,240,232,0.7)', fontSize: '12px', marginTop: '4px' }}>Nkawkaw Senior High School</p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px 32px' }}>

            {/* Step dots */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }} aria-label="Authentication steps">
              {[1, 2].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700,
                    backgroundColor: (n === 1 && step === 'id') || (n === 2 && step === 'credential') ? C.greenPrimary : C.creamBorder,
                    color: (n === 1 && step === 'id') || (n === 2 && step === 'credential') ? '#fff' : C.textMuted,
                  }} aria-current={((n === 1 && step === 'id') || (n === 2 && step === 'credential')) ? 'step' : undefined}>{n}</div>
                  {n === 1 && <div style={{ width: '40px', height: '2px', backgroundColor: step === 'credential' ? C.greenPrimary : C.creamBorder, borderRadius: '2px', transition: 'background-color 0.3s' }} />}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div role="alert" style={{
                marginBottom: '16px', padding: '12px 14px', borderRadius: '10px',
                backgroundColor: '#fef2f2', color: '#dc2626',
                border: '1px solid #fecaca', fontSize: '13px', fontWeight: 500,
              }}>{error}</div>
            )}

            {/* Step 1 */}
            {step === 'id' && (
              <form onSubmit={handleIdSubmit} noValidate>
                <h2 style={{ fontWeight: 700, fontSize: '16px', color: C.greenPrimary, marginBottom: '4px' }}>Enter Your Student ID</h2>
                <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '20px' }}>Identify yourself to proceed to voting.</p>
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="student-id" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginBottom: '6px' }}>Student ID</label>
                  <input id="student-id" type="text" value={studentId} onChange={e => setStudentId(e.target.value)}
                    placeholder="e.g. KAWSEC/2024/001" style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                    onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                    aria-describedby="id-hint" autoFocus autoComplete="off" disabled={loading} />
                  <p id="id-hint" style={{ fontSize: '12px', color: C.textMuted, marginTop: '6px' }}>Your Student ID is printed on your school ID card.</p>
                </div>
                <button type="submit" disabled={loading} aria-busy={loading} style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  backgroundColor: C.greenPrimary, color: '#fff',
                  fontSize: '14px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
                }}>
                  {loading ? 'Verifying…' : <><span>Continue</span><ChevronRight size={17} /></>}
                </button>
              </form>
            )}

            {/* Step 2 */}
            {step === 'credential' && (
              <form onSubmit={handleCredentialSubmit} noValidate>
                <h2 style={{ fontWeight: 700, fontSize: '16px', color: C.greenPrimary, marginBottom: '4px' }}>Enter Your Voting Credential</h2>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: '8px', marginBottom: '20px',
                  backgroundColor: C.greenLight, fontSize: '13px',
                }} aria-live="polite">
                  <span style={{ color: C.textMuted, fontSize: '12px' }}>Voting as:</span>
                  <strong style={{ color: C.greenPrimary }}>{studentId}</strong>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="credential" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginBottom: '6px' }}>Voting Credential</label>
                  <input id="credential" type="password" value={credential} onChange={e => setCredential(e.target.value)}
                    placeholder="Enter your credential" style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                    onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                    aria-describedby="cred-hint" autoFocus disabled={loading} />
                  <p id="cred-hint" style={{ fontSize: '12px', color: C.textMuted, marginTop: '6px' }}>Your credential was issued by your class teacher. Contact IT if you need help.</p>
                </div>
                <button type="submit" disabled={loading} aria-busy={loading} style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  backgroundColor: C.greenPrimary, color: '#fff',
                  fontSize: '14px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? 'Authenticating…' : <><span>Access Ballot</span><ChevronRight size={17} /></>}
                </button>
                <button type="button" onClick={() => { setStep('id'); setError(''); setCredential(''); }} style={{
                  width: '100%', marginTop: '12px', padding: '10px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', color: C.textMuted,
                }}>← Back to Student ID</button>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'rgba(245,240,232,0.6)' }}>
          <Link to="/" style={{ color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,240,232,0.7)'; }}
          >← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
