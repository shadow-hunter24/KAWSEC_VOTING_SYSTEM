import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, ChevronRight, AlertTriangle, CheckCircle, Settings, Trash2, Ban, RotateCcw } from 'lucide-react';
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

  // New election form
  const [title,      setTitle]      = useState('');
  const [opensAt,    setOpensAt]    = useState('');
  const [closesAt,   setClosesAt]   = useState('');
  const [description, setDescription] = useState('');

  async function loadElections() {
    const { data } = await supabase
      .from('elections').select('*').order('created_at', { ascending: false });
    setElections((data as Election[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadElections(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
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

        {actionMsg && (
          <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '20px' }}>
            <CheckCircle size={16} color={C.greenPrimary} style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '13px', color: C.greenPrimary, fontWeight: 600 }}>{actionMsg}</p>
          </div>
        )}
        {actionErr && (
          <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '20px' }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '13px', color: '#dc2626' }}>{actionErr}</p>
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
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {next && next.target && (
                        <button
                          onClick={() => handleTransition(el.id, next.target)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 16px', borderRadius: '8px', border: 'none',
                            backgroundColor: next.danger ? '#dc2626' : C.greenPrimary,
                            color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                          }}
                        >{next.label} <ChevronRight size={13} /></button>
                      )}
                      {el.status === 'verified' && (
                        <Link to={`/admin/tally/${el.id}`} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '9px 16px', borderRadius: '8px',
                          backgroundColor: C.greenPrimary, color: '#fff',
                          fontSize: '12px', fontWeight: 700, textDecoration: 'none',
                        }}>Go to Tally &amp; Publish <ChevronRight size={13} /></Link>
                      )}
                      {el.status === 'draft' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('Delete this election? This cannot be undone.')) return;
                            setActionErr(''); setActionMsg('');
                            // Best-effort audit log — do not block delete if this fails
                            try {
                              await supabase.from('audit_events').insert({
                                action: 'election.deleted',
                                actor: 'IT Coordinator',
                                details: { election_id: el.id, title: el.title, status: 'draft' },
                              });
                            } catch (_) { /* best-effort */ }
                            const { error } = await supabase.from('elections').delete().eq('id', el.id);
                            if (error) { setActionErr(error.message); }
                            else { setActionMsg('Election deleted.'); await loadElections(); }
                          }}
                          style={{display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 16px', borderRadius: '8px', border: 'none',
                            backgroundColor: '#dc2626', color: '#fff',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',}}
                        ><Trash2 size={13} /> Delete</button>
                      )}
                      {(el.status === 'approved' || el.status === 'open') && (
                        <button
                          onClick={() => {
                            if (!window.confirm('Cancel this election? All entitlements and votes will be preserved in the audit log but the election will be permanently cancelled.')) return;
                            handleTransition(el.id, 'cancelled');
                          }}
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
    </div>
  );
}
