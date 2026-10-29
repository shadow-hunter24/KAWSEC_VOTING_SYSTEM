import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, ChevronRight, AlertTriangle, CheckCircle, Settings, Trash2, Ban, RotateCcw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Election } from '../../types';
import { C } from '../../lib/tokens';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#f3f4f6', text: '#374151' },
  approved:  { bg: '#dbeafe', text: '#1e40af' },
  open:      { bg: C.greenLight, text: C.greenPrimary },
  closed:    { bg: '#fef3c7', text: '#92400e' },
  verified:  { bg: '#ede9fe', text: '#5b21b6' },
  published: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
};

const NEXT_ACTION: Record<string, { label: string; target: string; danger?: boolean }> = {
  draft:    { label: 'Approve & Generate Entitlements', target: 'approved' },
  approved: { label: 'Open Voting',   target: 'open' },
  open:     { label: 'Close Voting',  target: 'closed', danger: true },
  closed:   { label: 'Mark Verified', target: 'verified' },
  verified: { label: 'Publish Results (go to Tally page)', target: '' },
};

export default function ElectionSettings() {
  const [elections,   setElections]   = useState<Election[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [actionMsg,   setActionMsg]   = useState('');
  const [actionErr,   setActionErr]   = useState('');
  const [showCreate,  setShowCreate]  = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [confirmClose, setConfirmClose] = useState<Election | null>(null); // ES-1

  // New election form
  const [title,      setTitle]      = useState('');
  const [opensAt,    setOpensAt]    = useState('');
  const [closesAt,   setClosesAt]   = useState('');
  const [description, setDescription] = useState('');

  async function loadElections() {
    const { data: elData } = await supabase
      .from('elections').select('*').order('created_at', { ascending: false });
    const list = (elData ?? []) as Election[];

    // For each draft election, load position + approved candidate counts
    const enriched = await Promise.all(list.map(async el => {
      if (el.status !== 'draft') return { ...el, positionCount: null, candidateCount: null };
      const [{ count: posCount }, { count: candCount }] = await Promise.all([
        supabase.from('positions').select('*', { count: 'exact', head: true }).eq('election_id', el.id),
        supabase.from('candidates').select('positions!inner(election_id)', { count: 'exact', head: true })
          .eq('positions.election_id', el.id).eq('status', 'approved'),
      ]);
      return { ...el, positionCount: posCount ?? 0, candidateCount: candCount ?? 0 };
    }));

    setElections(enriched as Election[]);
    setLoading(false);
  }

  useEffect(() => { loadElections(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    // ES-3: client-side validation — close must be after open
    if (opensAt && closesAt && closesAt <= opensAt) {
      setActionErr('Voting close time must be after the open time. Please check the dates.');
      return;
    }
    setCreating(true); setActionErr('');
    const { error } = await supabase.from('elections').insert({
      title: title.trim(),
      status: 'draft',
      voting_opens_at:  opensAt  || null,
      voting_closes_at: closesAt || null,
      description: description.trim() || null,
      created_by: 'IT Coordinator',
    });
    if (error) { setActionErr(error.message); }
    else {
      setTitle(''); setOpensAt(''); setClosesAt(''); setDescription('');
      setShowCreate(false);
      setActionMsg('Election created. Add positions in Position Management, then add candidates.');
      await loadElections();
    }
    setCreating(false);
  }

  async function handleTransition(electionId: string, target: string) {
    if (!target) return;
    setActionErr(''); setActionMsg('');
    const { data, error } = await supabase.rpc('set_election_status', {
      p_election_id: electionId,
      p_status:      target,
      p_actor:       'IT Coordinator',
    });
    if (error || !data?.success) {
      setActionErr(data?.message ?? error?.message ?? 'Action failed.');
    } else {
      setActionMsg(`Election status updated to "${target}".`);
      if (target === 'approved') {
        // Generate entitlements
        const { data: entData } = await supabase.rpc('generate_voting_entitlements', {
          p_election_id: electionId,
        });
        if (entData?.entitlements_created !== undefined) {
          setActionMsg(`Approved. ${entData.entitlements_created} voting entitlements generated.`);
        }
      }
      await loadElections();
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Election Settings</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Create and manage elections</p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 24px' }}>

        {/* ES-8: dismissible feedback banners */}
        {actionMsg && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '14px 16px', borderRadius: '12px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '20px' }}>
            <CheckCircle size={16} color={C.greenPrimary} style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '13px', color: C.greenPrimary, fontWeight: 600, flex: 1 }}>{actionMsg}</p>
            <button onClick={() => setActionMsg('')} aria-label="Dismiss message" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.greenPrimary, padding: '0 2px', flexShrink: 0, opacity: 0.6, fontSize: '16px', lineHeight: 1 }}>×</button>
          </div>
        )}
        {actionErr && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '20px' }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '13px', color: '#dc2626', flex: 1 }}>{actionErr}</p>
            <button onClick={() => setActionErr('')} aria-label="Dismiss error" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 2px', flexShrink: 0, opacity: 0.6, fontSize: '16px', lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Create button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontWeight: 800, fontSize: '18px', color: C.greenPrimary }}>Elections</h2>
          <button onClick={() => setShowCreate(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            backgroundColor: C.greenPrimary, color: '#fff',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}><Plus size={16} /> New Election</button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} style={{ backgroundColor: C.white, borderRadius: '16px', padding: '24px', border: `1px solid ${C.creamBorder}`, marginBottom: '28px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} /> Create New Election
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' }}>Election Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 2026 KAWSEC Prefect Elections" style={inputStyle} required
                  onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />Voting Opens At
                </label>
                <input type="datetime-local" value={opensAt} onChange={e => setOpensAt(e.target.value)} style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />Voting Closes At
                </label>
                <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' }}>Description (optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  placeholder="Brief description of this election…"
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={creating} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: C.greenPrimary, color: '#fff', fontSize: '13px', fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer' }}>
                {creating ? 'Creating…' : 'Create Election'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, background: 'none', color: C.textMuted, fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Elections list */}
        {loading ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading…</p>
        ) : elections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', color: C.textMuted }}>
            <p>No elections yet. Create one above.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {elections.map(el => {
              const sc    = STATUS_COLORS[el.status] ?? STATUS_COLORS.draft;
              const next  = NEXT_ACTION[el.status];
              return (
                <div key={el.id} style={{ backgroundColor: C.white, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.creamBorder}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>{el.title}</h3>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '999px', backgroundColor: sc.bg, color: sc.text, textTransform: 'capitalize', flexShrink: 0 }}>
                          {el.status}
                        </span>
                      </div>
                      {el.voting_opens_at && (
                        <p style={{ fontSize: '12px', color: C.textMuted }}>
                          Opens: {new Date(el.voting_opens_at).toLocaleString()} →
                          Closes: {el.voting_closes_at ? new Date(el.voting_closes_at).toLocaleString() : 'Manual'}
                        </p>
                      )}
                      {el.description && <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>{el.description}</p>}

                      {/* Draft checklist — guide admin through setup steps */}
                      {el.status === 'draft' && (
                        <div style={{ marginTop: '14px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '10px' }}>
                            ⚡ Complete these steps before approving:
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                            {/* Step 1 — Positions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 800,
                                backgroundColor: (el as Election & { positionCount?: number }).positionCount ? C.greenPrimary : C.creamBorder,
                                color: '#fff',
                              }}>
                                {(el as Election & { positionCount?: number }).positionCount ? '✓' : '1'}
                              </span>
                              <span style={{ fontSize: '12px', color: (el as Election & { positionCount?: number }).positionCount ? C.greenPrimary : '#92400e', fontWeight: 600 }}>
                                Add ballot positions
                                {(el as Election & { positionCount?: number }).positionCount
                                  ? ` — ${(el as Election & { positionCount?: number }).positionCount} position${(el as Election & { positionCount?: number }).positionCount !== 1 ? 's' : ''} added ✓`
                                  : ' — none yet'}
                              </span>
                              {!(el as Election & { positionCount?: number }).positionCount && (
                                <Link to="/admin/positions" style={{ fontSize: '11px', fontWeight: 700, color: C.greenPrimary, textDecoration: 'none', marginLeft: 'auto', padding: '3px 10px', borderRadius: '6px', backgroundColor: C.greenLight }}>
                                  Go →
                                </Link>
                              )}
                            </div>

                            {/* Step 2 — Candidates */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 800,
                                backgroundColor: (el as Election & { candidateCount?: number }).candidateCount ? C.greenPrimary : C.creamBorder,
                                color: '#fff',
                              }}>
                                {(el as Election & { candidateCount?: number }).candidateCount ? '✓' : '2'}
                              </span>
                              <span style={{ fontSize: '12px', color: (el as Election & { candidateCount?: number }).candidateCount ? C.greenPrimary : '#92400e', fontWeight: 600 }}>
                                Add & approve candidates
                                {(el as Election & { candidateCount?: number }).candidateCount
                                  ? ` — ${(el as Election & { candidateCount?: number }).candidateCount} approved ✓`
                                  : ' — none approved yet'}
                              </span>
                              {!(el as Election & { candidateCount?: number }).candidateCount && (
                                <Link to="/admin/candidates" style={{ fontSize: '11px', fontWeight: 700, color: C.greenPrimary, textDecoration: 'none', marginLeft: 'auto', padding: '3px 10px', borderRadius: '6px', backgroundColor: C.greenLight }}>
                                  Go →
                                </Link>
                              )}
                            </div>

                            {/* Step 3 — Approve */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 800,
                                backgroundColor: C.creamBorder, color: '#fff',
                              }}>3</span>
                              <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                                Come back here → click "Approve & Generate Entitlements"
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {next && next.target && (
                        <button
                          // ES-1: Close Voting opens a confirmation modal; ES-7: descriptive aria-label
                          onClick={() => next.danger ? setConfirmClose(el) : handleTransition(el.id, next.target)}
                          aria-label={`${next.label} for ${el.title}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 16px', borderRadius: '8px', border: 'none',
                            backgroundColor: next.danger ? '#dc2626' : C.greenPrimary,
                            color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                          }}
                        >{next.label} <ChevronRight size={13} /></button>
                      )}
                      {el.status === 'verified' && (
                        <Link to={`/admin/tally/${el.id}`} aria-label={`Go to Tally & Publish for ${el.title}`} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '9px 16px', borderRadius: '8px',
                          backgroundColor: C.greenPrimary, color: '#fff',
                          fontSize: '12px', fontWeight: 700, textDecoration: 'none',
                        }}>Go to Tally & Publish <ChevronRight size={13} /></Link>
                      )}
                      {el.status === 'draft' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete "${el.title}"? This will permanently remove the election and ALL related data (positions, candidates, entitlements, ballots). This cannot be undone.`)) return;
                            setActionErr(''); setActionMsg('');
                            try {
                              await supabase.from('audit_events').insert({
                                action: 'election.deleted',
                                actor: 'IT Coordinator',
                                details: { election_id: el.id, title: el.title, status: el.status },
                              });
                            } catch (_) { /* best-effort */ }
                            const { error } = await supabase.from('elections').delete().eq('id', el.id);
                            if (error) { setActionErr(error.message); }
                            else { setActionMsg(`"${el.title}" deleted successfully.`); await loadElections(); }
                          }}
                          aria-label={`Delete election ${el.title}`}
                          style={{display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 16px', borderRadius: '8px', border: 'none',
                            backgroundColor: '#dc2626', color: '#fff',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',}}
                        ><Trash2 size={13} /> Delete</button>
                      )}
                      {/* Delete button for non-draft elections */}
                      {el.status !== 'draft' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`⚠ DELETE "${el.title}"?\n\nThis will permanently remove:\n• All positions and candidates\n• All votes and ballots\n• All entitlements and credentials\n• All published results\n\nThis CANNOT be undone. Are you absolutely sure?`)) return;
                            setActionErr(''); setActionMsg('');
                            try {
                              await supabase.from('audit_events').insert({
                                action: 'election.deleted',
                                actor: 'IT Coordinator',
                                details: { election_id: el.id, title: el.title, status: el.status },
                              });
                            } catch (_) { /* best-effort */ }
                            const { error } = await supabase.from('elections').delete().eq('id', el.id);
                            if (error) { setActionErr(`Delete failed: ${error.message}. Run the cascade FK migration in Supabase SQL Editor first.`); }
                            else { setActionMsg(`"${el.title}" and all related data deleted.`); await loadElections(); }
                          }}
                          aria-label={`Delete election ${el.title}`}
                          style={{display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 16px', borderRadius: '8px',
                            border: '1.5px solid #dc2626', backgroundColor: 'transparent', color: '#dc2626',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',}}
                        ><Trash2 size={13} /> Delete</button>
                      )}
                      {(el.status === 'approved' || el.status === 'open') && (
                        <button
                          onClick={() => {
                            if (!window.confirm('Cancel this election? All entitlements and votes will be preserved in the audit log but the election will be permanently cancelled.')) return;
                            handleTransition(el.id, 'cancelled');
                          }}
                          aria-label={`Cancel election ${el.title}`}
                          style={{display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 16px', borderRadius: '8px', border: 'none',
                            backgroundColor: '#d97706', color: '#fff',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',}}
                        ><Ban size={13} /> Cancel Election</button>
                      )}
                      {el.status === 'published' && (
                        <button
                          disabled={unpublishing}
                          onClick={async () => {
                            if (!window.confirm('Unpublish results for this election? The election will return to "verified" status and results will be hidden from the public.')) return;
                            setActionErr(''); setActionMsg(''); setUnpublishing(true);
                            await supabase.from('published_results').delete().eq('election_id', el.id);
                            await supabase.from('elections').update({ status: 'verified', updated_at: new Date().toISOString() }).eq('id', el.id);
                            await supabase.from('audit_events').insert({ action: 'results.unpublished', actor: 'IT Coordinator', election_id: el.id, details: { previous_status: 'published' } });
                            setActionMsg('Results unpublished. Election returned to verified status.');
                            await loadElections();
                            setUnpublishing(false);
                          }}
                          aria-label={`Unpublish results for ${el.title}`}
                          style={{display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 16px', borderRadius: '8px', border: 'none',
                            backgroundColor: '#d97706', color: '#fff',
                            fontSize: '12px', fontWeight: 700,
                            cursor: unpublishing ? 'not-allowed' : 'pointer',
                            opacity: unpublishing ? 0.6 : 1,}}
                        ><RotateCcw size={13} /> Unpublish Results</button>
                      )}                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ES-1: Close Voting confirmation modal */}
      {confirmClose && (
        <div role="dialog" aria-modal="true" aria-labelledby="close-voting-title"
          onClick={e => { if (e.target === e.currentTarget) setConfirmClose(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(15,45,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: C.creamBg, borderRadius: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(15,45,26,0.35)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 id="close-voting-title" style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Close Voting?</h2>
              <button onClick={() => setConfirmClose(null)} aria-label="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.6, marginBottom: '14px' }}>
                You are about to close voting for <strong style={{ color: C.greenPrimary }}>{confirmClose.title}</strong>.
              </p>
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '18px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '12px', color: '#dc2626', lineHeight: 1.5 }}>
                  Closing voting ends the election for all students. Any student who has not yet voted will be unable to do so. This action is recorded in the audit log.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setConfirmClose(null)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, background: 'none', color: C.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => { const el = confirmClose; setConfirmClose(null); handleTransition(el.id, 'closed'); }}
                  style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Ban size={15} /> Close Voting Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
