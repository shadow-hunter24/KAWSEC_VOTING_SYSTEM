// ============================================================
// KAWSEC Voting System — BallotReview
// ============================================================
// Shows all selections before final submission.
// Student can go back to change a selection or confirm to
// submit. On confirm, calls the cast-ballot Edge Function.
// ============================================================

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, User } from 'lucide-react';
import type { BallotAuthState, PositionWithCandidates } from './BallotFlow';
import { useVotingSession } from '../../contexts/VotingSessionContext';
import { C } from '../../lib/tokens';

// Re-export the type so BallotFlow can import it
export type { PositionWithCandidates };

interface ReviewState extends BallotAuthState {
  selections: Record<string, string>;
  positions:  PositionWithCandidates[];
}

// ── type fix: PositionWithCandidates not yet exported from BallotFlow
// We redefine minimally here to avoid circular imports
interface CandidateMin {
  id: string; photo_url: string | null;
  students: { full_name: string; student_id_number: string };
}
interface PositionMin { id: string; title: string; role_group: string; candidates: CandidateMin[]; }

export default function BallotReview() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const state     = location.state as ReviewState | null;
  const { markVoted } = useVotingSession();

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  if (!state?.student_id || !state?.positions) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.creamBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: C.textMuted, marginBottom: '16px' }}>Session expired. Please log in again.</p>
          <Link to="/vote" style={{ color: C.greenPrimary, fontWeight: 700 }}>← Back to Login</Link>
        </div>
      </div>
    );
  }

  const { student_id, election_id, session_token, full_name, selections, positions } = state;

  // Build review rows
  const reviewRows = (positions as unknown as PositionMin[]).map(pos => {
    const candidateId = selections[pos.id];
    const candidate   = pos.candidates.find(c => c.id === candidateId);
    return { position: pos, candidate };
  });

  async function handleSubmit() {
    setError(''); setSubmitting(true);

    const votes = reviewRows
      .filter(r => r.candidate)
      .map(r => ({ position_id: r.position.id, candidate_id: r.candidate!.id }));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey     = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/cast-ballot`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey':        anonKey,
        },
        body: JSON.stringify({ student_id, election_id, session_token, votes }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Failed to submit ballot. Please try again.');
        return;
      }

      // Mark voted — stops the 5-minute countdown
      markVoted();

      navigate('/vote/complete', {
        state: { full_name, ballot_count: data.ballot_count, election_id },
        replace: true,
      });
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 12px rgba(15,45,26,0.35)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/logo.png" alt="KAWSEC" width={36} height={36} style={{ objectFit: 'contain' }} />
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>Review Your Ballot</p>
            <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '11px' }}>{full_name}</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Warning */}
        <div style={{ display: 'flex', gap: '12px', padding: '16px 18px', borderRadius: '12px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '28px' }}>
          <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '13px', color: '#92400e' }}>Final check — this action cannot be undone</p>
            <p style={{ fontSize: '12px', color: '#92400e', marginTop: '3px' }}>
              Once you submit, your ballot is final. Review your selections carefully before confirming.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '20px' }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        <h2 style={{ fontWeight: 800, fontSize: '18px', color: C.greenPrimary, marginBottom: '20px' }}>
          Your Selections ({reviewRows.length} position{reviewRows.length !== 1 ? 's' : ''})
        </h2>

        {/* Review list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
          {reviewRows.map(({ position, candidate }) => (
            <div key={position.id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 18px', borderRadius: '14px',
              backgroundColor: C.white, border: `1px solid ${C.creamBorder}`,
            }}>
              {/* Candidate photo */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0,
                backgroundColor: C.creamCard, border: `1px solid ${C.creamBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {candidate?.photo_url
                  ? <img src={candidate.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <User size={22} color={C.creamBorder} />}
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: C.textMuted, marginBottom: '2px' }}>
                  {position.role_group}
                </p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: C.greenPrimary, marginBottom: '1px' }}>
                  {position.title}
                </p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>
                  {candidate?.students.full_name ?? '—'}
                </p>
              </div>

              {/* Checkmark */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} aria-hidden="true">
                <span style={{ color: C.greenPrimary, fontSize: '14px', fontWeight: 700 }}>✓</span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            disabled={submitting}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '13px 20px', borderRadius: '10px',
              border: `1.5px solid ${C.creamBorder}`, background: 'none',
              color: C.textMuted, fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          ><ChevronLeft size={16} /> Go Back &amp; Edit</button>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px 24px', borderRadius: '10px', border: 'none',
              backgroundColor: submitting ? C.creamBorder : C.greenPrimary,
              color: submitting ? C.textMuted : '#fff',
              fontSize: '15px', fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : '0 4px 16px rgba(26,77,46,0.25)',
            }}
            aria-busy={submitting}
          >
            {submitting
              ? <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} aria-hidden="true" /> Submitting…</>
              : '✓ Confirm &amp; Submit Ballot'}
          </button>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
