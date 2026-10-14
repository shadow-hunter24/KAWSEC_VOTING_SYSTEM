import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const C = {
  greenPrimary: '#1a4d2e', greenDark: '#0f2d1a', greenLight: '#e8f5ee',
  creamBg: '#fffdf7', creamCard: '#f5f0e8', creamBorder: '#e8e0cc', textMuted: '#5a5a4a',
};

export default function ITCoordinatorLogin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { signIn, session, loading } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');

  // If already logged in, redirect immediately
  useEffect(() => {
    if (!loading && session) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from ?? '/admin/dashboard', { replace: true });
    }
  }, [session, loading, navigate, location]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setError(''); setBusy(true);
    const { error: authError } = await signIn(email.trim(), password);
    if (authError) {
      // User-friendly messages for common Supabase auth errors
      if (authError.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (authError.includes('Email not confirmed')) {
        setError('Your email address has not been confirmed. Check your inbox.');
      } else if (authError.includes('Too many requests')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setError(authError);
      }
    }
    // On success, useEffect above handles the redirect
    setBusy(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '14px',
    color: '#1a1a1a', backgroundColor: C.creamBg, outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  };

  if (loading) return null; // AuthProvider handles the loading spinner

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      background: `linear-gradient(150deg, ${C.greenDark} 0%, ${C.greenPrimary} 100%)`,
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ backgroundColor: C.creamBg, borderRadius: '20px', boxShadow: '0 20px 60px rgba(15,45,26,0.4)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '32px 32px 24px', textAlign: 'center', backgroundColor: C.greenDark, borderBottom: `3px solid ${C.creamCard}` }}>
            <img src="/logo.png" alt="KAWSEC" width={64} height={64}
              style={{ display: 'block', margin: '0 auto 14px', objectFit: 'contain' }} />
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '17px' }}>IT Coordinator Access</h1>
            <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '12px', marginTop: '4px' }}>KAWSEC Election Management System</p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px 32px' }}>
            {error && (
              <div role="alert" style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '13px', fontWeight: 500 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-label="IT Coordinator login form">
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="email-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginBottom: '6px' }}>
                  Email Address
                </label>
                <input id="email-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="coordinator@kawsec.edu.gh" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                  autoFocus autoComplete="username" disabled={busy}
                  aria-required="true" />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="password-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginBottom: '6px' }}>
                  Password
                </label>
                <input id="password-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                  autoComplete="current-password" disabled={busy}
                  aria-required="true" />
              </div>

              <button type="submit" disabled={busy} aria-busy={busy} style={{
                width: '100%', padding: '13px', borderRadius: '10px',
                backgroundColor: C.greenPrimary, color: '#fff',
                fontSize: '14px', fontWeight: 700, border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1, transition: 'opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                {busy
                  ? <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} aria-hidden="true" /> Signing In…</>
                  : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <Link to="/" style={{ fontSize: '13px', color: C.textMuted, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = C.greenPrimary; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; }}
              >← Back to Home</Link>
            </div>

            {/* Setup hint — remove before production */}
            <div style={{ marginTop: '20px', padding: '12px 14px', borderRadius: '10px', backgroundColor: C.creamCard, border: `1px solid ${C.creamBorder}` }}>
              <p style={{ fontSize: '11px', color: C.textMuted, lineHeight: 1.6 }}>
                <strong style={{ color: C.greenPrimary }}>Setup:</strong> Create an IT Coordinator account in Supabase Dashboard → Authentication → Users → Add User. Use that email and password here.
              </p>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
