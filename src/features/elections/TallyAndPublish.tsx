import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Trophy, Flag, ChevronDown, Medal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TallyRow, Election } from '../../types';
import { C } from '../../lib/tokens';

// Rank labels
const RANK_LABELS: Record<number, { title: string; colour: string; bg: string }> = {
  1: { title: 'Main Prefect',    colour: C.greenPrimary, bg: C.greenLight },
  2: { title: '1st Assistant',   colour: '#1e40af',      bg: '#dbeafe'    },
  3: { title: '2nd Assistant',   colour: '#7c3aed',      bg: '#ede9fe'    },
  4: { title: '3rd Assistant',   colour: '#b45309',      bg: '#fef3c7'    },
};

interface TallyGroup {
  position_id:     string;
  position_title:  string;
  ranks_to_publish: number;
  rows:            TallyRow[];
  ties:            number[];   // which ranks have ties
  panelDecisions:  Record<number, string>; // rank → panel decision
}

export default function TallyAndPublish() {
  const { electionId: urlId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();

  const [elections,  setElections]  = useState<Election[]>([]);
  const [electionId, setElectionId] = useState(urlId ?? '');
  const [groups,     setGroups]     = useState<TallyGroup[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [noData,     setNoData]     = useState(false);

  // Load elections
  useEffect(() => {
    supabase.from('elections').select('id, title, status')
      .in('status', ['closed', 'verified', 'open'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as Election[]) ?? [];
        setElections(list);
        if (!urlId && list.length > 0) setElectionId(list[0].id);
      });
  }, [urlId]);

  // Load tally when election changes
  useEffect(() => {
    if (!electionId) return;
    setLoading(true); setError(''); setNoData(false); setGroups([]);

    Promise.all([
      supabase.rpc('tally_election_results', { p_election_id: electionId }),
      supabase.from('positions').select('id, title, ranks_to_publish').eq('election_id', electionId),
    ]).then(([{ data: tallyData, error: tallyErr }, { data: posData }]) => {
      if (tallyErr) { setError(tallyErr.message); setLoading(false); return; }

      const rows   = (tallyData as TallyRow[]) ?? [];
      const posMap: Record<string, number> = {};
      (posData ?? []).forEach((p: { id: string; ranks_to_publish: number }) => {
        posMap[p.id] = p.ranks_to_publish ?? 3;
      });

      if (rows.length === 0) { setNoData(true); setLoading(false); return; }

      // Group by position
      const map: Record<string, TallyGroup> = {};
      rows.forEach(r => {
        if (!map[r.position_id]) {
          map[r.position_id] = {
            position_id:      r.position_id,
            position_title:   r.position_title,
            ranks_to_publish: posMap[r.position_id] ?? 3,
            rows:             [],
            ties:             [],
            panelDecisions:   {},
          };
        }
        map[r.position_id].rows.push(r);
      });

      // Detect ties per rank
      Object.values(map).forEach(g => {
        g.rows.sort((a, b) => Number(a.rank) - Number(b.rank));
        const tiedRanks: number[] = [];
        // Check within each rank group (same vote count at top)
        const topVotes = Number(g.rows[0]?.vote_count ?? 0);
        if (g.rows.filter(r => Number(r.vote_count) === topVotes).length > 1) {
          tiedRanks.push(1);
        }
        // Check rank 2 tie
        const rank2rows = g.rows.filter(r => Number(r.rank) === 2);
        if (rank2rows.length > 1) tiedRanks.push(2);
        // Check rank 3 tie
        const rank3rows = g.rows.filter(r => Number(r.rank) === 3);
        if (rank3rows.length > 1) tiedRanks.push(3);
        g.ties = tiedRanks;
      });

      setGroups(Object.values(map));
      setLoading(false);
    });
  }, [electionId]);

  const hasPendingTies = groups.some(g =>
    g.ties.some(rank => rank <= g.ranks_to_publish && !g.panelDecisions[rank]?.trim())
  );
  const activeElection = elections.find(e => e.id === electionId);

  // Update ranks_to_publish for a position
  async function updateRanks(positionId: string, ranks: number) {
    await supabase.from('positions').update({ ranks_to_publish: ranks }).eq('id', positionId);
    setGroups(prev => prev.map(g =>
      g.position_id === positionId ? { ...g, ranks_to_publish: ranks } : g
    ));
  }

  async function handlePublish() {
    if (hasPendingTies) { setError('Resolve all ties before publishing.'); return; }
    setPublishing(true); setError('');

    // Build payload — include all rows up to ranks_to_publish per position
    const resultsPayload = groups.flatMap(g =>
      g.rows
        .filter(r => Number(r.rank) <= g.ranks_to_publish)
        .map(r => ({
          position_id:    r.position_id,
          candidate_id:   r.candidate_id,
          vote_count:     Number(r.vote_count),
          rank:           Number(r.rank),
          tie_flag:       g.ties.includes(Number(r.rank)),
          panel_decision: g.panelDecisions[Number(r.rank)] ?? null,
        }))
    );

    const { data, error: err } = await supabase.rpc('publish_election_results', {
      p_election_id: electionId,
      p_publisher:   'IT Coordinator',
      p_results:     JSON.stringify(resultsPayload),
    });

    if (err || !data?.success) {
      setError(data?.message ?? err?.message ?? 'Failed to publish. Make sure the election is in "verified" status first.');
      setPublishing(false); return;
    }

    setSuccess(`✓ Results published! ${data.rows_published} result rows written.`);
    setPublishing(false);
    setTimeout(() => navigate('/results'), 2500);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Tally &amp; Publish Results</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Review vote counts · Set ranks · Resolve ties · Publish</p>
            </div>
          </div>
          <Link to="/admin/elections" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Elections</Link>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '36px 24px' }}>

        {/* Election selector */}
        {elections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <p style={{ fontWeight: 700, color: C.greenPrimary, marginBottom: '10px' }}>No Elections Ready for Tally</p>
            <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '20px' }}>Elections must be closed or verified first.</p>
            <Link to="/admin/elections" style={{ padding: '11px 22px', borderRadius: '10px', backgroundColor: C.greenPrimary, color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Go to Election Settings</Link>
          </div>
        ) : (
          <>
            {/* Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <select value={electionId} onChange={e => { setElectionId(e.target.value); setSuccess(''); setError(''); }}
                  style={{ padding: '10px 40px 10px 14px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, fontSize: '14px', backgroundColor: '#fff', appearance: 'none', cursor: 'pointer', fontWeight: 600, color: C.greenPrimary, minWidth: '280px' }}>
                  {elections.map(e => <option key={e.id} value={e.id}>{e.title} — {e.status}</option>)}
                </select>
                <ChevronDown size={16} color={C.textMuted} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
              {activeElection && (
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', backgroundColor: activeElection.status === 'verified' ? C.greenLight : '#fef3c7', color: activeElection.status === 'verified' ? C.greenPrimary : '#92400e', border: `1px solid ${activeElection.status === 'verified' ? C.greenPrimary + '40' : '#fcd34d'}`, textTransform: 'capitalize' }}>
                  {activeElection.status}{activeElection.status !== 'verified' && ' — Mark Verified before publishing'}
                </span>
              )}
            </div>

            {/* Feedback */}
            {error   && <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '20px' }}><AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} /><p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p></div>}
            {success && <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '20px' }}><CheckCircle size={16} color={C.greenPrimary} style={{ flexShrink: 0 }} /><p style={{ fontSize: '13px', color: C.greenPrimary, fontWeight: 600 }}>{success}</p></div>}
            {hasPendingTies && <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '24px' }}><Flag size={16} color="#b45309" style={{ flexShrink: 0 }} /><p style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>Tied positions detected. Enter panel decisions before publishing.</p></div>}

            {/* Loading / empty */}
            {loading && <div style={{ textAlign: 'center', padding: '64px' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} /><p style={{ color: C.textMuted }}>Loading tally…</p></div>}
            {!loading && noData && <div style={{ textAlign: 'center', padding: '64px', backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${C.creamBorder}` }}><p style={{ fontWeight: 700, color: C.greenPrimary, marginBottom: '8px' }}>No votes recorded yet</p><p style={{ fontSize: '13px', color: C.textMuted }}>Cast some votes first, or check that candidates are approved.</p></div>}

            {/* Tally groups */}
            {!loading && !noData && groups.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '17px', color: C.greenPrimary }}>Vote Tally — {groups.length} Position{groups.length !== 1 ? 's' : ''}</h2>
                  <span style={{ fontSize: '12px', color: C.textMuted }}>Visible to IT Coordinator only</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '36px' }}>
                  {groups.map((group, gi) => {
                    const totalVotes = group.rows.reduce((s, r) => s + Number(r.vote_count), 0);
                    return (
                      <div key={group.position_id} style={{ backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${group.ties.length > 0 ? '#fcd34d' : C.creamBorder}`, overflow: 'hidden' }}>

                        {/* Position header */}
                        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.creamBorder}`, backgroundColor: C.creamCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <h3 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>{group.position_title}</h3>
                            <p style={{ fontSize: '12px', color: C.textMuted }}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast · {group.rows.length} candidate{group.rows.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {group.ties.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309' }}>⚠ TIE</span>}
                            {/* Ranks control */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: C.textMuted }}>Publish top</span>
                              <select
                                value={group.ranks_to_publish}
                                onChange={e => updateRanks(group.position_id, Number(e.target.value))}
                                style={{ padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${C.creamBorder}`, fontSize: '12px', fontWeight: 700, color: C.greenPrimary, backgroundColor: C.creamBg, cursor: 'pointer' }}
                              >
                                <option value={1}>1 (Main only)</option>
                                <option value={2}>2 (Main + 1st Asst)</option>
                                <option value={3}>3 (Main + 1st + 2nd)</option>
                                <option value={4}>4</option>
                                <option value={5}>5</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Candidates ranked */}
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {group.rows.map(row => {
                            const rank      = Number(row.rank);
                            const pct       = totalVotes > 0 ? Math.round((Number(row.vote_count) / totalVotes) * 100) : 0;
                            const included  = rank <= group.ranks_to_publish;
                            const rankMeta  = RANK_LABELS[rank] ?? { title: `Rank ${rank}`, colour: C.textMuted, bg: C.creamCard };
                            const isTied    = group.ties.includes(rank);

                            return (
                              <div key={row.candidate_id} style={{
                                borderRadius: '12px', padding: '14px 16px',
                                backgroundColor: included ? rankMeta.bg : C.creamCard,
                                border: `1px solid ${included ? rankMeta.colour + '30' : C.creamBorder}`,
                                opacity: included ? 1 : 0.55,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                  {/* Rank badge */}
                                  <div style={{ flexShrink: 0 }}>
                                    {rank === 1 && included
                                      ? <Trophy size={20} color={rankMeta.colour} />
                                      : rank <= 3 && included
                                      ? <Medal size={20} color={rankMeta.colour} />
                                      : <span style={{ fontSize: '13px', fontWeight: 700, color: C.textMuted }}>#{rank}</span>}
                                  </div>

                                  {/* Info */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: included ? rankMeta.colour : C.textMuted }}>
                                          {row.candidate_name}
                                        </span>
                                        {included && (
                                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: rankMeta.bg, color: rankMeta.colour, border: `1px solid ${rankMeta.colour}30` }}>
                                            {rankMeta.title}
                                          </span>
                                        )}
                                        {isTied && included && (
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309' }}>TIE</span>
                                        )}
                                      </div>
                                      <span style={{ fontSize: '13px', fontWeight: 700, color: C.textMuted }}>
                                        {row.vote_count} vote{Number(row.vote_count) !== 1 ? 's' : ''} ({pct}%)
                                      </span>
                                    </div>
                                    <div style={{ height: '7px', borderRadius: '999px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', borderRadius: '999px', width: `${pct}%`, backgroundColor: included ? rankMeta.colour : '#9ca3af', transition: 'width 0.5s ease' }} />
                                    </div>
                                  </div>
                                </div>

                                {/* Panel decision for ties within published range */}
                                {isTied && included && (
                                  <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fcd34d' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                                      Panel Decision for Rank {rank} ({rankMeta.title}) tie:
                                    </label>
                                    <input
                                      value={group.panelDecisions[rank] ?? ''}
                                      onChange={e => setGroups(prev => prev.map((g, idx) =>
                                        idx === gi ? { ...g, panelDecisions: { ...g.panelDecisions, [rank]: e.target.value } } : g
                                      ))}
                                      placeholder="Enter winner's full name as decided by the panel…"
                                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #fcd34d', fontSize: '13px', fontFamily: 'inherit', backgroundColor: '#fff', outline: 'none' }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Publish button */}
                {!success && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${C.creamBorder}` }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary, marginBottom: '4px' }}>Ready to publish?</p>
                      <p style={{ fontSize: '12px', color: C.textMuted }}>
                        {activeElection?.status === 'verified'
                          ? 'Election is verified. You can publish official results now.'
                          : `Status is "${activeElection?.status}". Go to Election Settings → Mark Verified first.`}
                      </p>
                    </div>
                    <button onClick={handlePublish}
                      disabled={publishing || hasPendingTies || activeElection?.status !== 'verified'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '13px 28px', borderRadius: '10px', border: 'none',
                        backgroundColor: (publishing || hasPendingTies || activeElection?.status !== 'verified') ? C.creamBorder : C.greenPrimary,
                        color: (publishing || hasPendingTies || activeElection?.status !== 'verified') ? C.textMuted : '#fff',
                        fontSize: '14px', fontWeight: 700,
                        cursor: (publishing || hasPendingTies || activeElection?.status !== 'verified') ? 'not-allowed' : 'pointer',
                        boxShadow: publishing ? 'none' : '0 4px 16px rgba(26,77,46,0.25)', flexShrink: 0,
                      }} aria-busy={publishing}>
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
