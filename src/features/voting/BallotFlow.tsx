// ============================================================
// KAWSEC Voting System — BallotFlow
// ============================================================
// Position-by-position voting UI. Receives authenticated
// student context via React Router location state (passed
// from StudentLogin after verify-credential succeeds).
//
// Flow:
//   1. Load positions + candidates for the active election
//   2. For each position: show candidate cards
//   3. Student selects one candidate per position
//   4. After all positions: navigate to BallotReview
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, User, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  greenPrimary: '#1a4d2e', greenDark: '#0f2d1a', greenLight: '#e8f5ee',
  greenMid: '#2d7a4f', creamBg: '#fffdf7', creamCard: '#f5f0e8',
  creamBorder: '#e8e0cc', textMuted: '#5a5a4a', white: '#ffffff',
};

/* ── Types ─────────────────────────────────────────────────── */
interface CandidateWithStudent {
  id:             string;
  position_id:    string;
  photo_url:      string | null;
  manifesto_text: string | null;
  students: { full_name: string; student_id_number: string; };
}

interface PositionWithCandidates {
  id:           string;
  title:        string;
  role_group:   string;
  gender_scope: string;
  candidates:   CandidateWithStudent[];
}

export interface BallotAuthState {
  student_id:    string;
  full_name:     string;
  election_id:   string;
  session_token: string;
}

/* ── Candidate card ─────────────────────────────────────────── */
function CandidateCard({
  candidate, selected, onSelect,
}: {
  candidate: CandidateWithStudent;
  selected:  boolean;
  onSelect:  (id: string) => void;
}) {
  const [showFull, setShowFull] = useState(false);

  return (
    <button
      onClick={() => onSelect(candidate.id)}
      aria-pressed={selected}
      aria-label={`Vote for ${candidate.students.full_name}${selected ? ' — selected' : ''}`}
      style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none',
        cursor: 'pointer', borderRadius: '16px',
        boxShadow: selected
          ? `0 0 0 3px ${C.greenPrimary}, 0 4px 16px rgba(26,77,46,0.15)`
          : `0 0 0 1.5px ${C.creamBorder}`,
        backgroundColor: selected ? C.greenLight : C.white,
        transition: 'all 0.15s',
        overflow: 'hidden',
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <div style={{ backgroundColor: C.greenPrimary, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={14} color="#fff" aria-hidden="true" />
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>Your selection</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', padding: '18px' }}>
        {/* Photo */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
          backgroundColor: C.creamCard, border: `1px solid ${C.creamBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {candidate.photo_url
            ? <img src={candidate.photo_url} alt={candidate.students.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <User size={32} color={C.creamBorder} />}
        </div>

        {/* Info */}
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
              }}>
                {candidate.manifesto_text}
              </p>
              {candidate.manifesto_text.length > 120 && (
                <button
                  onClick={e => { e.stopPropagation(); setShowFull(v => !v); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: C.greenMid, fontWeight: 600, padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
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
        <span style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted }}>
          Position {current} of {total}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: C.greenPrimary }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '999px', backgroundColor: C.creamBorder, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '999px', backgroundColor: C.greenPrimary,
          width: `${pct}%`, transition: 'width 0.3s ease',
        }} role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total}
          aria-label={`${current} of ${total} positions voted`} />
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function BallotFlow() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const auth      = location.state as BallotAuthState | null;

  const [positions,    setPositions]    = useState<PositionWithCandidates[]>([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [selections,   setSelections]   = useState<Record<string, string>>({}); // positionId → candidateId
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Guard: redirect to login if no auth state
  useEffect(() => {
    if (!auth?.student_id || !auth?.election_id) {
      navigate('/vote', { replace: true });
    }
  }, [auth, navigate]);

  // Load positions + candidates
  useEffect(() => {
    if (!auth?.election_id) return;

    async function load() {
      setLoading(true);
      setError('');

      // Get positions student is entitled to vote in
      const { data: entitlements, error: eErr } = await supabase
        .from('voting_entitlements')
        .select('position_id')
        .eq('student_id', auth!.student_id)
        .eq('election_id', auth!.election_id)
        .eq('consumed', false);

      if (eErr || !entitlements?.length) {
        setError('No voting positions found. You may have already voted, or the election has ended.');
        setLoading(false);
        return;
      }

      const positionIds = entitlements.map(e => e.position_id);

      // Load positions with approved candidates
      const { data: posData, error: pErr } = await supabase
        .from('positions')
        .select(`
          id, title, role_group, gender_scope,
          candidates!inner(
            id, position_id, photo_url, manifesto_text,
            students(full_name, student_id_number)
          )
        `)
        .in('id', positionIds)
        .eq('candidates.status', 'approved')
        .order('sort_order');

      if (pErr) {
        setError('Failed to load ballot positions. Please refresh.');
        setLoading(false);
        return;
      }

      setPositions((posData as unknown as PositionWithCandidates[]) ?? []);
      setLoading(false);
    }

    load();
  }, [auth]);

  if (!auth) return null;

  const position    = positions[currentIdx];
  const totalPos    = positions.length;
  const selected    = position ? selections[position.id] : undefined;
  const isLast      = currentIdx === totalPos - 1;

  function handleSelect(candidateId: string) {
    if (!position) return;
    setSelections(prev => ({ ...prev, [position.id]: candidateId }));
  }

  function handleNext() {
    if (!selected) return;
    if (isLast) {
      // All positions voted — go to review
      navigate('/vote/review', {
        state: { ...auth, selections, positions },
      });
    } else {
      setCurrentIdx(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleBack() {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const genderColor = (scope: string) =>
    scope === 'male' ? '#3b82f6' : scope === 'female' ? '#ec4899' : C.textMuted;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 12px rgba(15,45,26,0.35)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="KAWSEC" width={36} height={36} style={{ objectFit: 'contain' }} />
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}>KAWSEC Elections</p>
              <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '11px' }}>Ballot — {auth.full_name}</p>
            </div>
          </div>
          {!loading && totalPos > 0 && (
            <span style={{ color: 'rgba(245,240,232,0.8)', fontSize: '12px', fontWeight: 600 }}>
              {currentIdx + 1} / {totalPos}
            </span>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} aria-hidden="true" />
            <p style={{ color: C.textMuted, fontSize: '14px' }}>Loading your ballot…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center' }}>
            <AlertTriangle size={32} color="#dc2626" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>{error}</p>
            <Link to="/vote" style={{ fontSize: '14px', color: C.greenPrimary, fontWeight: 600 }}>← Return to Login</Link>
          </div>
        )}

        {/* Empty — all already voted */}
        {!loading && !error && positions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <CheckCircle size={48} color={C.greenPrimary} style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontWeight: 700, color: C.greenPrimary, marginBottom: '8px' }}>All positions completed</h2>
            <p style={{ color: C.textMuted, marginBottom: '24px' }}>You have already voted in all positions for this election.</p>
            <Link to="/results" style={{ padding: '12px 24px', borderRadius: '10px', backgroundColor: C.greenPrimary, color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>View Results</Link>
          </div>
        )}

        {/* Ballot */}
        {!loading && !error && position && (
          <>
            <ProgressBar current={currentIdx + 1} total={totalPos} />

            {/* Position header */}
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
                Select one candidate below. You cannot change your vote after submitting.
              </p>
            </div>

            {/* Candidate cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}
              role="group" aria-label={`Candidates for ${position.title}`}>
              {position.candidates.map(c => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  selected={selections[position.id] === c.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
              {currentIdx > 0 ? (
                <button onClick={handleBack} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '12px 20px', borderRadius: '10px',
                  border: `1.5px solid ${C.creamBorder}`, background: 'none',
                  color: C.textMuted, fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>
                  <ChevronLeft size={17} /> Back
                </button>
              ) : <div />}

              <button
                onClick={handleNext}
                disabled={!selected}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '14px 28px', borderRadius: '10px', border: 'none',
                  backgroundColor: selected ? C.greenPrimary : C.creamBorder,
                  color: selected ? '#fff' : C.textMuted,
                  fontSize: '15px', fontWeight: 700,
                  cursor: selected ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  boxShadow: selected ? '0 4px 16px rgba(26,77,46,0.2)' : 'none',
                }}
                aria-disabled={!selected}
              >
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
      `}</style>
    </div>
  );
}
