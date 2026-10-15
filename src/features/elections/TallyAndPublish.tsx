import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Trophy, Flag, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TallyRow, Election } from '../../types';

const C = {
  greenPrimary: '#1a4d2e', greenLight: '#e8f5ee', greenMid: '#2d7a4f',
  creamBg: '#fffdf7', creamCard: '#f5f0e8', creamBorder: '#e8e0cc', textMuted: '#5a5a4a',
};

interface TallyGroup {
  position_id:    string;
  position_title: string;
  rows:           TallyRow[];
  tie:            boolean;
  panelDecision:  string;
}

export default function TallyAndPublish() {
  // electionId may come from URL param OR be selected via dropdown
  const { electionId: urlId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();

  const [elections,   setElections]   = useState<Election[]>([]);
  const [electionId,  setElectionId]  = useState(urlId ?? '');
  const [groups,      setGroups]      = useState<TallyGroup[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [noData,      setNoData]      = useState(false);

  // Load all elections that are closed or verified (ready to tally)
  useEffect(() => {
    supabase
      .from('elections')
      .select('id, title, status')
      .in('status', ['closed', 'verified', 'open']) // include open for testing
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as Election[]) ?? [];
        setElections(list);
        // If no URL param but elections exist, auto-select first
        if (!urlId && list.length > 0) {
          setElectionId(list[0].id);
        }
      });
  }, [urlId]);

  // Load tally when electionId changes
  useEffect(() => {
    if (!electionId) return;
    setLoading(true);
    setError('');
    setNoData(false);
    setGroups([]);

    supabase.rpc('tally_election_results', { p_election_id: electionId })
      .then(({ data, error: err }) => {
        if (err) {
          setError(`Could not load tally: ${err.message}`);
          setLoading(false);
          return;
        }

        const rows = (data as TallyRow[]) ?? [];

        if (rows.length === 0) {
          setNoData(true);
          setLoading(false);
          return;
        }

        // Group by position
        const map: Record<string, TallyGroup> = {};
        rows.forEach(r => {
          if (!map[r.position_id]) {
            map[r.position_id] = {
              position_id:    r.position_id,
              position_title: r.position_title,
              rows:           [],
              tie:            false,
              panelDecision:  '',
            };
          }
          map[r.position_id].rows.push(r);
        });

        // Detect ties — top 2+ candidates with equal votes
        Object.values(map).forEach(g => {
          const topVotes = g.rows[0]?.vote_count ?? 0;
          const topCount = g.rows.filter(r => Number(r.vote_count) === Number(topVotes)).length;
          g.tie = topCount > 1 && Number(topVotes) > 0;
        });

        setGroups(Object.values(map));
        setLoading(false);
      });
  }, [electionId]);

  const hasPendingTies = groups.some(g => g.tie && !g.panelDecision.trim());
  const activeElection = elections.find(e => e.id === electionId);

  async function handlePublish() {
    if (hasPendingTies) { setError('Resolve all ties before publishing.'); return; }
    setPublishing(true); setError('');

    const resultsPayload = groups.flatMap(g =>
      g.rows.map(r => ({
        position_id:    r.position_id,
        candidate_id:   r.candidate_id,
        vote_count:     Number(r.vote_count),
        rank:           Number(r.rank),
        tie_flag:       g.tie,
        panel_decision: g.tie ? g.panelDecision : null,
      }))
    );

    const { data, error: err } = await supabase.rpc('publish_election_results', {
      p_election_id: electionId,
      p_publisher:   'IT Coordinator',
      p_results:     JSON.stringify(resultsPayload),
    });

    if (err || !data?.success) {
      setError(data?.message ?? err?.message ?? 'Failed to publish. Make sure the election is in "verified" status first.');
      setPublishing(false);
      return;
    }

    setSuccess(`✓ Results published! ${data.rows_published} result rows written.`);
    setPublishing(false);
    setTimeout(() => navigate('/results'), 2500);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Tally &amp; Publish Results</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>
                Review vote counts, resolve ties, then publish
              </p>
            </div>
          </div>
          <Link to="/admin/elections" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>
            ← Elections
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 24px' }}>

        {/* Election selector — shown when no URL param or multiple elections */}
        {elections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🗳️</div>
            <h2 style={{ fontWeight: 700, color: C.greenPrimary, marginBottom: '10px' }}>No Elections Ready for Tally</h2>
            <p style={{ fontSize: '14px', color: C.textMuted, maxWidth: '360px', margin: '0 auto 20px', lineHeight: 1.65 }}>
              Elections must be in <strong>closed</strong> or <strong>verified</strong> status before tallying.
              Go to Election Settings to close an open election first.
            </p>
            <Link to="/admin/elections" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '11px 22px', borderRadius: '10px',
              backgroundColor: C.greenPrimary, color: '#fff',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none',
            }}>Go to Election Settings</Link>
          </div>
        ) : (
          <>
            {/* Election picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <select
                  value={electionId}
                  onChange={e => { setElectionId(e.target.value); setSuccess(''); setError(''); }}
                  style={{
                    padding: '10px 40px 10px 14px', borderRadius: '10px',
                    border: `1.5px solid ${C.creamBorder}`, fontSize: '14px',
                    backgroundColor: '#fff', appearance: 'none', cursor: 'pointer',
                    fontWeight: 600, color: C.greenPrimary, minWidth: '280px',
                  }}
                >
                  {elections.map(e => (
                    <option key={e.id} value={e.id}>{e.title} — {e.status}</option>
                  ))}
                </select>
                <ChevronDown size={16} color={C.textMuted} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
              {activeElection && (
                <span style={{
                  fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px',
                  backgroundColor: activeElection.status === 'verified' ? C.greenLight : '#fef3c7',
                  color: activeElection.status === 'verified' ? C.greenPrimary : '#92400e',
                  border: `1px solid ${activeElection.status === 'verified' ? C.greenPrimary + '40' : '#fcd34d'}`,
                  textTransform: 'capitalize',
                }}>
                  {activeElection.status}
                  {activeElection.status !== 'verified' && ' — Mark Verified before publishing'}
                </span>
              )}
            </div>

            {/* Feedback banners */}
            {error && (
              <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '20px' }}>
                <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
              </div>
            )}

            {success && (
              <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '20px' }}>
                <CheckCircle size={16} color={C.greenPrimary} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: C.greenPrimary, fontWeight: 600 }}>{success}</p>
              </div>
            )}

            {hasPendingTies && (
              <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '24px' }}>
                <Flag size={16} color="#b45309" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
                  Tied positions detected. Enter the panel decision for each tie before publishing.
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '64px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: C.textMuted, fontSize: '14px' }}>Loading tally results…</p>
              </div>
            )}

            {/* No votes yet */}
            {!loading && noData && (
              <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${C.creamBorder}` }}>
                <div style={{ fontSize: '40px', marginBottom: '14px' }}>📊</div>
                <h3 style={{ fontWeight: 700, color: C.greenPrimary, marginBottom: '8px' }}>No votes recorded yet</h3>
                <p style={{ fontSize: '13px', color: C.textMuted, maxWidth: '320px', margin: '0 auto', lineHeight: 1.65 }}>
                  No ballots have been cast in this election, or candidates have not been approved yet.
                  Make sure candidates are approved and voting has taken place.
                </p>
              </div>
            )}

            {/* Tally results */}
            {!loading && !noData && groups.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '17px', color: C.greenPrimary }}>
                    Vote Tally — {groups.length} Position{groups.length !== 1 ? 's' : ''}
                  </h2>
                  <span style={{ fontSize: '12px', color: C.textMuted }}>
                    Only visible to IT Coordinator
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '36px' }}>
                  {groups.map((group, gi) => {
                    const totalVotes = group.rows.reduce((s, r) => s + Number(r.vote_count), 0);
                    return (
                      <div key={group.position_id} style={{
                        backgroundColor: '#fff', borderRadius: '16px',
                        border: `1px solid ${group.tie ? '#fcd34d' : C.creamBorder}`,
                        overflow: 'hidden',
                      }}>
                        {/* Position header */}
                        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.creamBorder}`, backgroundColor: C.creamCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <h3 style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary }}>{group.position_title}</h3>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {group.tie && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309' }}>
                                ⚠ TIE
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: C.textMuted }}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast</span>
                          </div>
                        </div>

                        {/* Candidates */}
                        <div style={{ padding: '16px 20px' }}>
                          {group.rows.map((row, i) => {
                            const pct   = totalVotes > 0 ? Math.round((Number(row.vote_count) / totalVotes) * 100) : 0;
                            const isTop = i === 0;
                            return (
                              <div key={row.candidate_id} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: i < group.rows.length - 1 ? '14px' : '0' }}>
                                <div style={{ width: '28px', flexShrink: 0, textAlign: 'center' }}>
                                  {isTop && !group.tie
                                    ? <Trophy size={18} color={C.greenPrimary} aria-hidden="true" />
                                    : <span style={{ fontSize: '13px', fontWeight: 700, color: C.textMuted }}>#{i + 1}</span>}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: isTop ? 700 : 500, color: isTop && !group.tie ? C.greenPrimary : '#1a1a1a' }}>
                                      {row.candidate_name}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.textMuted }}>
                                      {row.vote_count} vote{Number(row.vote_count) !== 1 ? 's' : ''} ({pct}%)
                                    </span>
                                  </div>
                                  <div style={{ height: '8px', borderRadius: '999px', backgroundColor: C.creamCard, overflow: 'hidden' }}>
                                    <div style={{
                                      height: '100%', borderRadius: '999px',
                                      width: `${pct}%`,
                                      backgroundColor: isTop && !group.tie ? C.greenPrimary : '#94a3b8',
                                      transition: 'width 0.6s ease',
                                    }} role="progressbar" aria-valuenow={Number(row.vote_count)} aria-valuemin={0} aria-valuemax={totalVotes} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Tie panel decision input */}
                          {group.tie && (
                            <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '10px', backgroundColor: '#fefce8', border: '1px solid #fcd34d' }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
                                Panel Decision — enter the name of the winner as decided by the panel:
                              </label>
                              <input
                                value={group.panelDecision}
                                onChange={e => setGroups(prev => prev.map((g, idx) =>
                                  idx === gi ? { ...g, panelDecision: e.target.value } : g
                                ))}
                                placeholder="e.g. Kwame Asante Mensah"
                                style={{
                                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                                  border: '1.5px solid #fcd34d', fontSize: '13px',
                                  fontFamily: 'inherit', backgroundColor: '#fff', outline: 'none',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Publish */}
                {!success && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${C.creamBorder}` }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary, marginBottom: '4px' }}>
                        Ready to publish?
                      </p>
                      <p style={{ fontSize: '12px', color: C.textMuted }}>
                        {activeElection?.status === 'verified'
                          ? 'Election is verified. You can publish results now.'
                          : `Election status is "${activeElection?.status}". Go to Election Settings → Mark Verified before publishing.`}
                      </p>
                    </div>
                    <button
                      onClick={handlePublish}
                      disabled={publishing || hasPendingTies || activeElection?.status !== 'verified'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '13px 28px', borderRadius: '10px', border: 'none',
                        backgroundColor: (publishing || hasPendingTies || activeElection?.status !== 'verified') ? C.creamBorder : C.greenPrimary,
                        color: (publishing || hasPendingTies || activeElection?.status !== 'verified') ? C.textMuted : '#fff',
                        fontSize: '14px', fontWeight: 700,
                        cursor: (publishing || hasPendingTies || activeElection?.status !== 'verified') ? 'not-allowed' : 'pointer',
                        boxShadow: (publishing || hasPendingTies) ? 'none' : '0 4px 16px rgba(26,77,46,0.25)',
                        flexShrink: 0,
                      }}
                      aria-busy={publishing}
                    >
                      {publishing
                        ? <><span style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Publishing…</>
                        : <><CheckCircle size={17} />Publish Official Results</>}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
