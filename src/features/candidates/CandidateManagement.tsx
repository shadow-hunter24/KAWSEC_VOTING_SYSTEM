import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, X, ChevronDown, ChevronUp, User, FileText, AlertTriangle, UserMinus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Position, Candidate, Election } from '../../types';
import { C } from '../../lib/tokens';

/* ── Candidate card ──────────────────────────────────────────── */
function CandidateCard({
  candidate, onApprove, onReject, onRemove, loading, electionStatus,
}: {
  candidate: Candidate & { students?: { full_name: string; student_id_number: string } };
  onApprove: (id: string) => void;
  onReject:  (id: string, reason: string) => void;
  onRemove:  (id: string) => void;
  loading:   boolean;
  electionStatus: string;
}) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason]         = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  const withdrawLocked = ['open', 'closed', 'verified', 'published', 'cancelled'].includes(electionStatus);

  const displayStatus = (candidate.status === 'rejected' && candidate.rejected_reason?.startsWith('Withdrawn:'))
    ? 'withdrawn'
    : candidate.status;

  const statusColor: Record<string, string> = {
    pending: '#f59e0b', approved: C.greenPrimary, rejected: '#dc2626', withdrawn: '#92400e',
  };
  const statusBg: Record<string, string> = {
    pending: '#fef3c7', approved: C.greenLight, rejected: '#fef2f2', withdrawn: '#fef3c7',
  };

  return (
    <div style={{ backgroundColor: C.white, borderRadius: '14px', border: `1px solid ${C.creamBorder}`, overflow: 'hidden' }}>
      {/* Top */}
      <div style={{ display: 'flex', gap: '16px', padding: '18px' }}>
        {/* Photo */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '12px', flexShrink: 0,
          backgroundColor: C.creamCard, border: `1px solid ${C.creamBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {candidate.photo_url
            ? <img src={candidate.photo_url} alt={candidate.students?.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <User size={28} color={C.creamBorder} />}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>
                {candidate.students?.full_name ?? 'Unknown'}
              </p>
              <p style={{ fontSize: '12px', color: C.textMuted, fontFamily: 'monospace' }}>
                {candidate.students?.student_id_number}
              </p>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
              backgroundColor: statusBg[displayStatus] ?? '#f3f4f6',
              color: statusColor[displayStatus] ?? C.textMuted,
              textTransform: 'capitalize', flexShrink: 0,
            }}>{displayStatus}</span>
          </div>

          {/* Manifesto preview */}
          {candidate.manifesto_text && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
              <FileText size={14} color={C.textMuted} style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '12px', color: C.textMuted, lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              }}>{candidate.manifesto_text}</p>
            </div>
          )}

          {candidate.rejected_reason && (
            <p style={{ fontSize: '12px', color: displayStatus === 'withdrawn' ? '#92400e' : '#dc2626', marginTop: '6px' }}>
              {displayStatus === 'withdrawn' ? 'Withdrawn' : 'Rejected'}: {candidate.rejected_reason.replace(/^Withdrawn: /, '')}
            </p>
          )}
        </div>
      </div>

      {/* Actions — only for pending */}
      {candidate.status === 'pending' && (
        <div style={{ borderTop: `1px solid ${C.creamBorder}`, padding: '12px 18px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onApprove(candidate.id)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: C.greenPrimary, color: '#fff',
              fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          ><Check size={14} /> Approve</button>

          <button
            onClick={() => setShowReject(v => !v)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              border: '1.5px solid #fca5a5', backgroundColor: '#fef2f2',
              color: '#dc2626', fontSize: '13px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          ><X size={14} /> {showReject ? 'Cancel' : 'Reject'}</button>
        </div>
      )}

      {/* Reject form */}
      {candidate.status === 'pending' && showReject && (
        <div style={{ padding: '14px 18px', borderTop: `1px solid #fecaca`, backgroundColor: '#fff5f5' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#dc2626', marginBottom: '6px' }}>
            Reason for rejection <span aria-hidden="true">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why this candidate is being rejected…"
            rows={2}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '1.5px solid #fca5a5', fontSize: '13px',
              fontFamily: 'inherit', resize: 'vertical',
              backgroundColor: '#fff',
            }}
          />
          <button
            onClick={() => { if (reason.trim()) { onReject(candidate.id, reason.trim()); setShowReject(false); setReason(''); } }}
            disabled={!reason.trim() || loading}
            style={{
              marginTop: '10px', padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: reason.trim() ? '#dc2626' : C.creamBorder,
              color: reason.trim() ? '#fff' : C.textMuted,
              fontSize: '13px', fontWeight: 700,
              cursor: reason.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
          >Confirm Rejection</button>
        </div>
      )}

      {/* Withdraw action — only for approved candidates */}
      {candidate.status === 'approved' && (
        <div style={{ borderTop: `1px solid ${C.creamBorder}`, padding: '12px 18px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { if (!withdrawLocked) setShowWithdraw(v => !v); }}
            disabled={loading || withdrawLocked}
            title={withdrawLocked ? 'Cannot withdraw after voting opens' : undefined}
            style={{display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              border: '1.5px solid #fcd34d', backgroundColor: '#fffbeb',
              color: '#d97706', fontSize: '13px', fontWeight: 700,
              cursor: (loading || withdrawLocked) ? 'not-allowed' : 'pointer',
              opacity: withdrawLocked ? 0.4 : 1,}}
          ><UserMinus size={14} /> {showWithdraw ? 'Cancel' : 'Withdraw'}</button>
        </div>
      )}

      {/* Withdraw form */}
      {candidate.status === 'approved' && showWithdraw && !withdrawLocked && (
        <div style={{padding: '14px 18px', borderTop: `1px solid #fde68a`, backgroundColor: '#fffbeb'}}>
          <label style={{display: 'block', fontSize: '13px', fontWeight: 600, color: '#d97706', marginBottom: '6px'}}>
            Reason for withdrawal <span aria-hidden="true">*</span>
          </label>
          <textarea
            value={withdrawReason}
            onChange={e => setWithdrawReason(e.target.value)}
            placeholder="Explain why this candidate is being withdrawn…"
            rows={2}
            style={{width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '1.5px solid #fcd34d', fontSize: '13px',
              fontFamily: 'inherit', resize: 'vertical',
              backgroundColor: '#fff',}}
          />
          <div style={{display: 'flex', gap: '8px', marginTop: '10px'}}>
            <button
              onClick={() => {
                if (withdrawReason.trim()) {
                  onReject(candidate.id, 'Withdrawn: ' + withdrawReason.trim());
                  setShowWithdraw(false);
                  setWithdrawReason('');
                }
              }}
              disabled={!withdrawReason.trim() || loading}
              style={{padding: '8px 16px', borderRadius: '8px', border: 'none',
                backgroundColor: withdrawReason.trim() ? '#d97706' : C.creamBorder,
                color: withdrawReason.trim() ? '#fff' : C.textMuted,
                fontSize: '13px', fontWeight: 700,
                cursor: withdrawReason.trim() && !loading ? 'pointer' : 'not-allowed',}}
            >Confirm Withdrawal</button>
            <button
              onClick={() => { setShowWithdraw(false); setWithdrawReason(''); }}
              style={{
                padding: '8px 14px', borderRadius: '8px',
                border: `1.5px solid ${C.creamBorder}`, background: 'none',
                color: C.textMuted, fontSize: '13px', cursor: 'pointer',
              }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Remove — only in draft elections */}
      {electionStatus === 'draft' && (
        <div style={{ borderTop: `1px solid ${C.creamBorder}`, padding: '12px 18px' }}>
          <button
            onClick={() => {
              if (!window.confirm('Permanently remove this candidate? This cannot be undone.')) return;
              onRemove(candidate.id);
            }}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              border: '1.5px solid #fca5a5', backgroundColor: '#fef2f2',
              color: '#dc2626', fontSize: '13px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          ><Trash2 size={14} /> Remove</button>
        </div>
      )}
    </div>
  );
}

/* ── Add candidate form ──────────────────────────────────────── */
function AddCandidateForm({
  positionId, electionId, onAdded,
}: { positionId: string; electionId: string; onAdded: () => void }) {
  const [studentId, setStudentId]   = useState('');
  const [manifesto, setManifesto]   = useState('');
  const [photoUrl,  setPhotoUrl]    = useState('');
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) { setError('Student ID is required.'); return; }
    setError(''); setLoading(true);

    try {
      // Look up student
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('id')
        .eq('student_id_number', studentId.trim().toUpperCase())
        .single();

      if (sErr || !student) { setError('Student not found. Check the Student ID and try again.'); return; }

      const { error: insertErr } = await supabase.from('candidates').insert({
        position_id:    positionId,
        student_id:     student.id,
        manifesto_text: manifesto.trim() || null,
        photo_url:      photoUrl.trim() || null,
        status:         'pending',
      });

      if (insertErr) {
        if (insertErr.code === '23505') setError('This student is already a candidate for this position.');
        else setError(insertErr.message);
        return;
      }

      setStudentId(''); setManifesto(''); setPhotoUrl('');
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: C.creamCard, borderRadius: '14px', padding: '18px', marginBottom: '20px', border: `1px solid ${C.creamBorder}` }}>
      <h4 style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Plus size={16} /> Add Candidate
      </h4>

      {error && (
        <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '12px' }}>
          <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: '#dc2626' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '4px' }}>
            Student ID *
          </label>
          <input value={studentId} onChange={e => setStudentId(e.target.value)}
            placeholder="e.g. KAWSEC/2024/001" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '4px' }}>
            Photo URL <span style={{ fontWeight: 400, color: C.textMuted }}>(optional)</span>
          </label>
          <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
            placeholder="https://…/photo.jpg" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '4px' }}>
          Manifesto <span style={{ fontWeight: 400, color: C.textMuted }}>(optional)</span>
        </label>
        <textarea value={manifesto} onChange={e => setManifesto(e.target.value)}
          placeholder="Candidate's plans and campaign statement…"
          rows={3} style={{ ...inputStyle, resize: 'vertical' }}
          onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
      </div>

      <button type="submit" disabled={loading} style={{
        padding: '9px 18px', borderRadius: '8px', border: 'none',
        backgroundColor: loading ? C.creamBorder : C.greenPrimary,
        color: loading ? C.textMuted : '#fff',
        fontSize: '13px', fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}>{loading ? 'Adding…' : 'Add Candidate'}</button>
    </form>
  );
}

/* ── Position accordion ──────────────────────────────────────── */
function PositionSection({
  position, electionId, electionStatus,
}: { position: Position; electionId: string; electionStatus: string }) {
  const [open,       setOpen]       = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [actionLoad, setActionLoad] = useState(false);

  async function loadCandidates() {
    setLoading(true);
    const { data } = await supabase
      .from('candidates')
      .select('*, students(full_name, student_id_number)')
      .eq('position_id', position.id)
      .order('created_at');
    setCandidates((data as Candidate[]) ?? []);
    setLoading(false);
  }

  function toggle() {
    if (!open) loadCandidates();
    setOpen(v => !v);
  }

  async function handleApprove(id: string) {
    setActionLoad(true);
    await supabase.from('candidates').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
    await loadCandidates();
    setActionLoad(false);
  }

  async function handleReject(id: string, reason: string) {
    setActionLoad(true);
    await supabase.from('candidates').update({ status: 'rejected', rejected_reason: reason }).eq('id', id);
    await loadCandidates();
    setActionLoad(false);
  }

  async function handleRemove(id: string) {
    setActionLoad(true);
    await supabase.from('candidates').delete().eq('id', id);
    await loadCandidates();
    setActionLoad(false);
  }

  const approved = candidates.filter(c => c.status === 'approved').length;
  const pending  = candidates.filter(c => c.status === 'pending').length;

  return (
    <div style={{ border: `1px solid ${C.creamBorder}`, borderRadius: '14px', marginBottom: '10px', overflow: 'hidden' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          backgroundColor: open ? C.creamCard : C.white,
        }}
        aria-expanded={open}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, backgroundColor: position.gender_scope === 'male' ? '#3b82f6' : '#ec4899' }} aria-hidden="true" />
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{position.title}</p>
            <p style={{ fontSize: '12px', color: C.textMuted }}>{position.role_group} · {position.eligibility_scope === 'house' ? 'House only' : 'School-wide'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {pending > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309' }}>{pending} pending</span>}
          {approved > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: C.greenLight, color: C.greenPrimary }}>{approved} approved</span>}
          {open ? <ChevronUp size={18} color={C.textMuted} /> : <ChevronDown size={18} color={C.textMuted} />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.creamBorder}`, backgroundColor: C.white }}>
          <AddCandidateForm positionId={position.id} electionId={electionId} onAdded={loadCandidates} />

          {loading ? (
            <p style={{ fontSize: '13px', color: C.textMuted, textAlign: 'center', padding: '20px' }}>Loading candidates…</p>
          ) : candidates.length === 0 ? (
            <p style={{ fontSize: '13px', color: C.textMuted, textAlign: 'center', padding: '20px' }}>No candidates added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {candidates.map(c => (
                <CandidateCard key={c.id} candidate={c as Candidate & { students?: { full_name: string; student_id_number: string } }}
                  onApprove={handleApprove} onReject={handleReject} onRemove={handleRemove} loading={actionLoad} electionStatus={electionStatus} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function CandidateManagement() {
  const [elections,  setElections]  = useState<Election[]>([]);
  const [activeElec, setActiveElec] = useState<string>('');
  const [positions,  setPositions]  = useState<Position[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    supabase.from('elections').select('id, title, status').order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data ?? [];
        setElections(list as Election[]);
        if (list.length > 0) { setActiveElec(list[0].id); }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeElec) return;
    supabase.from('positions').select('*').eq('election_id', activeElec).order('sort_order')
      .then(({ data }) => setPositions((data as Position[]) ?? []));
  }, [activeElec]);

  const roleGroups = [...new Set(positions.map(p => p.role_group))];
  const activeElecStatus = elections.find(e => e.id === activeElec)?.status ?? 'draft';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Candidate Management</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Add, review and approve election candidates</p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

        {loading ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading elections…</p>
        ) : elections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <p style={{ color: C.textMuted, fontSize: '15px' }}>No elections found.</p>
            <p style={{ color: C.textMuted, fontSize: '13px', marginTop: '6px' }}>Create an election first via Election Settings.</p>
          </div>
        ) : (
          <>
            {/* Election selector */}
            {elections.length >= 1 && (
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginBottom: '6px' }}>Election</label>
                <select
                  value={activeElec}
                  onChange={e => setActiveElec(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, fontSize: '14px', backgroundColor: C.white, cursor: 'pointer' }}
                >
                  {elections.map(e => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}
                </select>
              </div>
            )}

            {/* Group positions by role */}
            {roleGroups.map(group => (
              <div key={group} style={{ marginBottom: '32px' }}>
                <h2 style={{ fontWeight: 800, fontSize: '16px', color: C.greenPrimary, marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${C.creamBorder}` }}>
                  {group}
                </h2>
                {positions.filter(p => p.role_group === group).map(pos => (
                  <PositionSection key={pos.id} position={pos} electionId={activeElec} electionStatus={activeElecStatus} />
                ))}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
