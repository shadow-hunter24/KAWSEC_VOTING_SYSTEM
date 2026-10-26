import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronRight, CheckCircle, User, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useVotingSession } from '../../contexts/VotingSessionContext';
import { C } from '../../lib/tokens';

// Steps:
//  'id'         — Enter Student ID
//  'confirm'    — Confirm identity: name + class shown, student taps "Yes, that's me"
//  'credential' — Enter voting credential

interface StudentInfo {
  full_name:  string;
  class_name: string;
  house_name: string;
  year_group: number;
}

export default function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession } = useVotingSession();

  // Show expiry banner if redirected here after timeout
  const wasExpired = (location.state as { expired?: boolean } | null)?.expired === true;

  const [step,        setStep]        = useState<'id' | 'confirm' | 'credential'>('id');
  const [studentId,   setStudentId]   = useState('');
  const [credential,  setCredential]  = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [electionId,  setElectionId]  = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '14px',
    color: '#1a1a1a', backgroundColor: C.creamBg,
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  };

  // ── Step 1: Enter Student ID → look up + show identity ──────
  async function handleIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) { setError('Please enter your Student ID.'); return; }
    setError(''); setLoading(true);

    try {
      // Look up the student directly to show identity confirmation
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select(`
          id, full_name, year_group, is_active,
          classes(name),
          houses(name)
        `)
        .eq('student_id_number', studentId.trim().toUpperCase())
        .single();

      if (sErr || !student) {
        setError('Student ID not found. Please check your ID card and try again, or ask your class teacher.');
        return;
      }

      if (!student.is_active) {
        setError('Your account is not active. Please contact the IT Coordinator.');
        return;
      }

      // Find the active open election
      const { data: elections } = await supabase
        .from('elections')
        .select('id, title, eligible_year_groups')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!elections?.length) {
        setError('No election is currently open. Please check back when voting begins.');
        return;
      }

      const election = elections[0];

      // Check year group restriction
      if (election.eligible_year_groups?.length > 0 &&
          !election.eligible_year_groups.includes(student.year_group)) {
        setError(`Your year group (Form ${student.year_group}) is not eligible to vote in this election.`);
        return;
      }

      // Store info and move to confirmation step
      setStudentInfo({
        full_name:  student.full_name,
        class_name: (student.classes as unknown as { name: string } | null)?.name ?? 'Unknown Class',
        house_name: (student.houses  as unknown as { name: string } | null)?.name ?? 'Unknown House',
        year_group: student.year_group,
      });
      setElectionId(election.id);
      setStep('confirm');

    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Confirm identity → generate credential ──────────
  async function handleConfirm() {
    setLoading(true); setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey     = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-credential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          student_id_number: studentId.trim().toUpperCase(),
          election_id:       electionId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Could not generate credential. Please try again.');
        return;
      }

      // In DEV mode: auto-fill the credential so testers can skip writing it down
      if (import.meta.env.DEV) {
        setCredential(data.credential);
      }

      setStep('credential');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Enter credential → verify → go to ballot ────────
  async function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!credential.trim()) { setError('Please enter your voting credential.'); return; }
    setError(''); setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey     = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/verify-credential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          student_id_number: studentId.trim().toUpperCase(),
          election_id:       electionId,
          credential:        credential.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Incorrect credential. Please check and try again.');
        return;
      }

      // Start the 5-minute session timer
      startSession({
        student_id:    data.student_id,
        full_name:     data.full_name,
        election_id:   electionId,
        session_token: data.session_token,
      });

      navigate('/vote/ballot', {
        state: {
          student_id:    data.student_id,
          full_name:     data.full_name,
          election_id:   electionId,
          session_token: data.session_token,
        },
      });
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step progress indicator ──────────────────────────────────
  const steps = ['id', 'confirm', 'credential'];
  const stepIdx = steps.indexOf(step);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      background: `linear-gradient(150deg, ${C.greenDark} 0%, ${C.greenPrimary} 100%)`,
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ backgroundColor: C.creamBg, borderRadius: '20px', boxShadow: '0 20px 60px rgba(15,45,26,0.4)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '28px 32px 22px', textAlign: 'center', backgroundColor: C.greenPrimary, borderBottom: `3px solid ${C.creamCard}` }}>
            <img src="/logo.png" alt="KAWSEC" width={64} height={64}
              style={{ display: 'block', margin: '0 auto 12px', objectFit: 'contain' }} />
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '17px' }}>KAWSEC Voting System</h1>
            <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px', marginTop: '3px' }}>Nkawkaw Senior High School</p>
          </div>

          <div style={{ padding: '24px 32px 32px' }}>

            {/* Session expired banner */}
            {wasExpired && (
              <div role="alert" style={{
                marginBottom: '16px', padding: '12px 14px', borderRadius: '10px',
                backgroundColor: '#fef3c7', border: '1px solid #fcd34d',
                display: 'flex', gap: '8px', alignItems: 'flex-start',
              }}>
                <Clock size={15} color="#b45309" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>Session expired</p>
                  <p style={{ fontSize: '12px', color: '#92400e', marginTop: '2px' }}>
                    Your 5-minute voting window has ended. Please log in again to continue.
                  </p>
                </div>
              </div>
            )}

            {/* Step indicators */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}
              aria-label="Login steps">
              {['Enter ID', 'Confirm', 'Credential'].map((label, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700,
                      backgroundColor: i < stepIdx ? C.greenMid : i === stepIdx ? C.greenPrimary : C.creamBorder,
                      color: i <= stepIdx ? '#fff' : C.textMuted,
                    }} aria-current={i === stepIdx ? 'step' : undefined}>
                      {i < stepIdx ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: '9px', color: i === stepIdx ? C.greenPrimary : C.textMuted, fontWeight: i === stepIdx ? 700 : 400 }}>{label}</span>
                  </div>
                  {i < 2 && <div style={{ width: '32px', height: '2px', borderRadius: '2px', backgroundColor: i < stepIdx ? C.greenPrimary : C.creamBorder, marginBottom: '14px', transition: 'background-color 0.3s' }} />}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div role="alert" style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '13px', fontWeight: 500 }}>
                {error}
              </div>
            )}

            {/* ── STEP 1: Enter Student ID ─────────────────── */}
            {step === 'id' && (
              <form onSubmit={handleIdSubmit} noValidate>
                <h2 style={{ fontWeight: 700, fontSize: '16px', color: C.greenPrimary, marginBottom: '4px' }}>Enter Your Student ID</h2>
                <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '20px', lineHeight: 1.5 }}>
                  Your Student ID is printed on your school ID card or given to you by your class teacher.
                </p>
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="student-id" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginBottom: '6px' }}>Student ID</label>
                  <input id="student-id" type="text" value={studentId}
                    onChange={e => setStudentId(e.target.value.toUpperCase())}
                    placeholder="e.g. KAWSEC-SCI-2024-0001" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '1px' }}
                    onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                    onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                    aria-describedby="id-hint" autoFocus autoComplete="off" disabled={loading} />
                  <p id="id-hint" style={{ fontSize: '12px', color: C.textMuted, marginTop: '6px' }}>
                    Format: KAWSEC-[DEPT]-[YEAR]-[NUMBER]
                  </p>
                </div>
                <button type="submit" disabled={loading} aria-busy={loading} style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  backgroundColor: C.greenPrimary, color: '#fff', fontSize: '14px', fontWeight: 700, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  {loading ? 'Looking up…' : <><span>Continue</span><ChevronRight size={17} /></>}
                </button>
              </form>
            )}

            {/* ── STEP 2: Confirm identity ─────────────────── */}
            {step === 'confirm' && studentInfo && (
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '16px', color: C.greenPrimary, marginBottom: '4px' }}>Confirm Your Identity</h2>
                <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '20px', lineHeight: 1.5 }}>
                  Please confirm this is you before we generate your voting credential.
                </p>

                {/* Identity card */}
                <div style={{
                  borderRadius: '14px', padding: '20px', marginBottom: '20px',
                  backgroundColor: C.greenLight, border: `2px solid ${C.greenPrimary}30`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: C.greenPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={24} color="#fff" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '17px', color: C.greenPrimary }}>{studentInfo.full_name}</p>
                      <p style={{ fontSize: '12px', color: C.textMuted, fontFamily: 'monospace' }}>{studentId.toUpperCase()}</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Class',      value: studentInfo.class_name },
                      { label: 'House',      value: studentInfo.house_name },
                      { label: 'Year Group', value: `Form ${studentInfo.year_group}` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: C.white, border: `1px solid ${C.creamBorder}` }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: C.textMuted, marginBottom: '2px' }}>{label}</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '16px', fontWeight: 600 }}>
                  Is this you?
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setStep('id'); setStudentInfo(null); setError(''); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, background: 'none', color: C.textMuted, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    No, go back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    style={{
                      flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                      backgroundColor: C.greenPrimary, color: '#fff', fontSize: '14px', fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                    aria-busy={loading}
                  >
                    {loading
                      ? <><span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Generating…</>
                      : <><CheckCircle size={16} /> Yes, that's me</>}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Enter credential ─────────────────── */}
            {step === 'credential' && (
              <form onSubmit={handleCredentialSubmit} noValidate>
                <h2 style={{ fontWeight: 700, fontSize: '16px', color: C.greenPrimary, marginBottom: '4px' }}>Enter Your Voting Credential</h2>

                {/* Confirmed identity banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', backgroundColor: C.greenLight, border: `1px solid ${C.greenPrimary}20` }}>
                  <CheckCircle size={14} color={C.greenPrimary} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: C.greenPrimary }}>{studentInfo?.full_name}</span>
                  <span style={{ fontSize: '12px', color: C.textMuted }}>· {studentInfo?.class_name}</span>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="credential" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginBottom: '6px' }}>Voting Credential</label>
                  <input id="credential" type="text" value={credential}
                    onChange={e => setCredential(e.target.value.toUpperCase())}
                    placeholder="e.g. XXXX-XXXX"
                    style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '3px', fontSize: '20px', textAlign: 'center' }}
                    onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                    onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                    aria-describedby="cred-hint" autoFocus autoComplete="off" disabled={loading} maxLength={9} />
                  <p id="cred-hint" style={{ fontSize: '12px', color: C.textMuted, marginTop: '6px' }}>
                    Your credential appeared on screen after confirming your identity.
                    Contact the IT Coordinator if you didn't see it.
                  </p>
                  {import.meta.env.DEV && credential && (
                    <div role="alert" style={{
                      marginTop: '8px', padding: '8px 12px', borderRadius: '8px',
                      backgroundColor: '#fef3c7', border: '1px solid #f59e0b',
                      fontSize: '12px', color: '#92400e', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <AlertTriangle size={13} color="#b45309" aria-hidden="true" />
                      DEV MODE — credential auto-filled. Remove before production.
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} aria-busy={loading} style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  backgroundColor: C.greenPrimary, color: '#fff', fontSize: '14px', fontWeight: 700, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  {loading ? 'Verifying…' : <><span>Access Ballot</span><ChevronRight size={17} /></>}
                </button>

                <button type="button" onClick={() => { setStep('id'); setError(''); setCredential(''); setStudentInfo(null); }}
                  style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: C.textMuted }}>
                  ← Start Over
                </button>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
          <Link to="/" style={{ color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,240,232,0.7)'; }}
          >← Back to Home</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
