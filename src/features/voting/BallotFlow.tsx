import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, User, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useVotingSession, formatTime } from '../../contexts/VotingSessionContext';
import { C } from '../../lib/tokens';

interface CandidateWithStudent {
  id: string; position_id: string;
  photo_url: string | null; manifesto_text: string | null;
  students: { full_name: string; student_id_number: string };
}

export interface PositionWithCandidates {
  id: string; title: string; role_group: string; gender_scope: string;
  candidates: CandidateWithStudent[];
}

export interface BallotAuthState {
  student_id: string; full_name: string;
  election_id: string; session_token: string;
}

/* ── Countdown pill ─────────────────────────────────────────── */
function TimerPill({ seconds }: { seconds: number }) {
  const urgent = seconds <= 60;
  const warning = seconds <= 120;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '5px 12px', borderRadius: '999px',
      backgroundColor: urgent ? '#fee2e2' : warning ? '#fef3c7' : 'rgba(245,240,232,0.15)',
      border: `1px solid ${urgent ? '#fca5a5' : warning ? '#fcd34d' : 'rgba(245,240,232,0.2)'}`,
      animation: urgent ? 'pulse-bg 1s ease-in-out infinite' : 'none',
    }} aria-live="polite" aria-label={`Time remaining: ${formatTime(seconds)}`}>
      <Clock size={13} color={urgent ? '#dc2626' : warning ? '#b45309' : 'rgba(245,240,232,0.8)'} />
      <span style={{
        fontSize: '13px', fontWeight: 800, fontFamily: 'monospace',
        color: urgent ? '#dc2626' : warning ? '#b45309' : 'rgba(245,240,232,0.9)',
        letterSpacing: '1px',
      }}>{formatTime(seconds)}</span>
    </div>
  );
}

/* ── Candidate card ─────────────────────────────────────────── */
function CandidateCard({ candidate, selected, onSelect }: {
  candidate: CandidateWithStudent; selected: boolean; onSelect: (id: string) => void;
}) {
  const [showFull, setShowFull] = useState(false);
  return (
    <button onClick={() => onSelect(candidate.id)} aria-pressed={selected}
      aria-label={`Vote for ${candidate.students.full_name}${selected ? ' — selected' : ''}`}
      style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none',
        cursor: 'pointer', borderRadius: '16px',
        boxShadow: selected ? `0 0 0 3px ${C.greenPrimary}, 0 4px 16px rgba(26,77,46,0.15)` : `0 0 0 1.5px ${C.creamBorder}`,
        backgroundColor: selected ? C.greenLight : C.white,
        transition: 'all 0.15s', overflow: 'hidden',
      }}>
      {selected && (
        <div style={{ backgroundColor: C.greenPrimary, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={14} color="#fff" aria-hidden="true" />
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>Your selection</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '16px', padding: '18px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
          backgroundColor: C.creamCard, border: `1px solid ${C.creamBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {candidate.photo_url
            ? <img src={candidate.photo_url} alt={candidate.students.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <User size={32} color={C.creamBorder} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: '16px', color: selected ? C.greenPrimary : '#1a1a1a', marginBottom: '4px' }}>
            {candidate.students.full_name}
          </p>
          <p style={{ fontSize: '12px', color: C.textMuted, fontFamily: 'monospace', marginBottom: '10px' }}>
            {candidate.students.student_id_number}
          </p>
          {candidate.manifesto_text && (
            <div>
              <p style={{
                fontSize: '13px', color: C.textMuted, lineHeight: 1.6,
                overflow: showFull ? 'visible' : 'hidden',
                display: showFull ? 'block' : '-webkit-box',
                WebkitLineClamp: showFull ? 'unset' : 2,
                WebkitBoxOrient: 'vertical' as const,
              }}>{candidate.manifesto_text}</p>
              {candidate.manifesto_text.length > 120 && (
                <button onClick={e => { e.stopPropagation(); setShowFull(v => !v); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: C.greenMid, fontWeight: 600, padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={12} />{showFull ? 'Show less' : 'Read full manifesto'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Progress bar ───────────────────────────────────────────── */
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted }}>Position {current} of {total}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: C.greenPrimary }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '999px', backgroundColor: C.creamBorder, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '999px', backgroundColor: C.greenPrimary, width: `${pct}%`, transition: 'width 0.3s ease' }}
          role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total} />
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────── */
export default function BallotFlow() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const auth      = location.state as BallotAuthState | null;
  const { session, secondsRemaining, clearSession } = useVotingSession();

  const [positions,  setPositions]  = useState<PositionWithCandidates[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  // Guard: no auth state → back to login
  useEffect(() => {
    if (!auth?.student_id || !auth?.election_id) {
      navigate('/vote', { replace: true });
    }
  }, [auth, navigate]);

  // Load positions + check already voted
  useEffect(() => {
    if (!auth?.election_id || !auth?.student_id) return;
    async function load() {
      setLoading(true); setError('');

      // Check if ALL entitlements already consumed → already voted
      const { data: entitlements } = await supabase
        .from('voting_entitlements')
        .select('position_id, consumed')
        .eq('student_id', auth!.student_id)
        .eq('election_id', auth!.election_id);

      if (entitlements && entitlements.length > 0 && entitlements.every(e => e.consumed)) {
        setAlreadyVoted(true);
        setLoading(false);
        return;
      }

      const unconsumed = (entitlements ?? []).filter(e => !e.consumed).map(e => e.position_id);
      if (!unconsumed.length) {
        setError('No voting positions found. The election may have ended.');
        setLoading(false);
        return;
      }

      const { data: posData, error: pErr } = await supabase
        .from('positions')
        .select(`id, title, role_group, gender_scope,
          candidates!inner(id, position_id, photo_url, manifesto_text,
            students(full_name, student_id_number))`)
        .in('id', unconsumed)
        .eq('candidates.status', 'approved')
        .order('sort_order');

      if (pErr) { setError('Failed to load ballot. Please refresh.'); setLoading(false); return; }
      setPositions((posData as unknown as PositionWithCandidates[]) ?? []);
      setLoading(false);
    }
    load();
  }, [auth]);

  if (!auth) return null;

  const position = positions[currentIdx];
  const totalPos = positions.length;
  const selected = position ? selections[position.id] : undefined;
  const isLast   = currentIdx === totalPos - 1;

  function handleSelect(candidateId: string) {
    if (!position) return;
    setSelections(prev => ({ ...prev, [position.id]: candidateId }));
  }

  function handleNext() {
    if (!selected) return;
    if (isLast) {
      navigate('/vote/review', { state: { ...auth, selections, positions } });
    } else {
      setCurrentIdx(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleBack() {
    if (currentIdx > 0) { setCurrentIdx(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  const genderColor = (s: string) => s === 'male' ? '#3b82f6' : s === 'female' ? '#ec4899' : C.textMuted;
  const isUrgent   = secondsRemaining <= 60;
  const isWarning  = secondsRemaining <= 120;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Sticky header with timer */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 12px rgba(15,45,26,0.35)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="KAWSEC" width={36} height={36} style={{ objectFit: 'contain' }} />
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>KAWSEC Elections</p>
              <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '11px' }}>Ballot — {auth.full_name}</p>
            </div>
          </div>
          {/* Session countdown timer */}
          {session && <TimerPill seconds={secondsRemaining} />}
        </div>
      </header>

      {/* Urgent warning banner */}
      {isUrgent && !alreadyVoted && !loading && (
        <div role="alert" style={{ backgroundColor: '#fee2e2', borderBottom: '2px solid #fca5a5', padding: '10px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
            ⚠ Less than 1 minute remaining! Please finish voting now.
          </span>
        </div>
      )}
      {isWarning && !isUrgent && !alreadyVoted && !loading && (
        <div style={{ backgroundColor: '#fef3c7', borderBottom: '1px solid #fcd34d', padding: '8px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>
            2 minutes remaining — please complete your ballot soon.
          </span>
        </div>
      )}

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: C.textMuted, fontSize: '14px' }}>Loading your ballot…</p>
          </div>
        )}

        {/* Already voted */}
        {!loading && alreadyVoted && (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={36} color={C.greenPrimary} />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '20px', color: C.greenPrimary, marginBottom: '8px' }}>You have already voted</h2>
            <p style={{ color: C.textMuted, fontSize: '14px', maxWidth: '340px', margin: '0 auto 24px', lineHeight: 1.65 }}>
              Your ballot was already submitted for this election. Each student can only vote once.
            </p>
            <button onClick={() => { clearSession(); navigate('/vote', { replace: true }); }} style={{
              padding: '12px 28px', borderRadius: '10px', border: 'none',
              backgroundColor: C.greenPrimary, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}>Back to Home</button>
          </div>
        )}

        {/* Error */}
        {!loading && !alreadyVoted && error && (
          <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center' }}>
            <AlertTriangle size={32} color="#dc2626" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>{error}</p>
            <Link to="/vote" style={{ fontSize: '14px', color: C.greenPrimary, fontWeight: 600 }}>← Return to Login</Link>
          </div>
        )}

        {/* Ballot */}
        {!loading && !alreadyVoted && !error && position && (
          <>
            <ProgressBar current={currentIdx + 1} total={totalPos} />

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: genderColor(position.gender_scope), flexShrink: 0 }} aria-hidden="true" />
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.textMuted }}>
                  {position.role_group}
                </p>
              </div>
              <h1 style={{ fontWeight: 800, fontSize: 'clamp(20px, 4vw, 28px)', color: C.greenPrimary, lineHeight: 1.2 }}>
                {position.title}
              </h1>
              <p style={{ fontSize: '13px', color: C.textMuted, marginTop: '6px' }}>
                Select one candidate. Your vote is final after submission.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}
              role="group" aria-label={`Candidates for ${position.title}`}>
              {position.candidates.map(c => (
                <CandidateCard key={c.id} candidate={c}
                  selected={selections[position.id] === c.id}
                  onSelect={handleSelect} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
              {currentIdx > 0
                ? <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, background: 'none', color: C.textMuted, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                    <ChevronLeft size={17} /> Back
                  </button>
                : <div />}

              <button onClick={handleNext} disabled={!selected} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '14px 28px', borderRadius: '10px', border: 'none',
                backgroundColor: selected ? C.greenPrimary : C.creamBorder,
                color: selected ? '#fff' : C.textMuted,
                fontSize: '15px', fontWeight: 700,
                cursor: selected ? 'pointer' : 'not-allowed',
                boxShadow: selected ? '0 4px 16px rgba(26,77,46,0.2)' : 'none',
                transition: 'all 0.15s',
              }} aria-disabled={!selected}>
                {isLast ? 'Review My Ballot' : 'Next Position'}
                <ChevronRight size={17} />
              </button>
            </div>

            {!selected && (
              <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: C.textMuted }} role="status">
                Please select a candidate to continue.
              </p>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-bg { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
      `}</style>
    </div>
  );
}
