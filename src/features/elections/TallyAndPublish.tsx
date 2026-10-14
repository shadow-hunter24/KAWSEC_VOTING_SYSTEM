import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Trophy, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TallyRow } from '../../types';

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
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();

  const [groups,     setGroups]     = useState<TallyGroup[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  useEffect(() => {
    if (!electionId) return;
    supabase.rpc('tally_election_results', { p_election_id: electionId })
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        const rows = (data as TallyRow[]) ?? [];

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

        // Detect ties
        Object.values(map).forEach(g => {
          const topVotes = g.rows[0]?.vote_count ?? 0;
          const topCount = g.rows.filter(r => r.vote_count === topVotes).length;
          g.tie = topCount > 1;
        });

        setGroups(Object.values(map));
        setLoading(false);
      });
  }, [electionId]);

  const hasPendingTies = groups.some(g => g.tie && !g.panelDecision.trim());

  async function handlePublish() {
    if (hasPendingTies) { setError('Resolve all ties before publishing.'); return; }
    setPublishing(true); setError('');

    // Build results payload
    const resultsPayload = groups.flatMap(g =>
      g.rows.map(r => ({
        position_id:    r.position_id,
        candidate_id:   r.candidate_id,
        vote_count:     r.vote_count,
        rank:           r.rank,
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
      setError(data?.message ?? err?.message ?? 'Failed to publish.');
      setPublishing(false);
      return;
    }

    setSuccess(`Results published successfully! ${data.rows_published} result rows written.`);
    setPublishing(false);
    setTimeout(() => navigate('/results'), 2500);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.textMuted }}>Loading tally…</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Tally &amp; Publish Results</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>IT Coordinator review — resolve ties then publish</p>
            </div>
          </div>
          <Link to="/admin/elections" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Elections</Link>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 24px' }}>

        {error && (
          <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '20px' }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
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
            <Flag size={16} color="#b45309" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
              There are tied positions. Enter the panel decision for each tie before publishing.
            </p>
          </div>
        )}

        {/* Position tally cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '36px' }}>
          {groups.map((group, gi) => {
            const winner     = group.rows[0];
            const totalVotes = group.rows.reduce((s, r) => s + Number(r.vote_count), 0);
            return (
              <div key={group.position_id} style={{ backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${group.tie ? '#fcd34d' : C.creamBorder}`, overflow: 'hidden' }}>
                {/* Position header */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.creamBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>{group.position_title}</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {group.tie && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309' }}>
                        ⚠ TIE — Panel Decision Required
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: C.textMuted }}>{totalVotes} votes cast</span>
                  </div>
                </div>

                {/* Candidates */}
                <div style={{ padding: '16px 20px' }}>
                  {group.rows.map((row, i) => {
                    const pct   = totalVotes > 0 ? Math.round((Number(row.vote_count) / totalVotes) * 100) : 0;
                    const isTop = i === 0;
                    return (
                      <div key={row.candidate_id} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                        <div style={{ width: '28px', flexShrink: 0, textAlign: 'center' }}>
                          {isTop && !group.tie
                            ? <Trophy size={18} color={C.greenPrimary} />
                            : <span style={{ fontSize: '13px', fontWeight: 700, color: C.textMuted }}>#{i + 1}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '14px', fontWeight: isTop ? 700 : 500, color: isTop ? C.greenPrimary : '#1a1a1a' }}>
                              {row.candidate_name}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: C.textMuted }}>{row.vote_count} ({pct}%)</span>
                          </div>
                          <div style={{ height: '6px', borderRadius: '999px', backgroundColor: C.creamCard, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '999px', width: `${pct}%`, backgroundColor: isTop && !group.tie ? C.greenPrimary : '#94a3b8', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Tie resolution input */}
                  {group.tie && (
                    <div style={{ marginTop: '14px', padding: '14px 16px', borderRadius: '10px', backgroundColor: '#fefce8', border: '1px solid #fcd34d' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                        Panel Decision — who wins this position?
                      </label>
                      <input
                        value={group.panelDecision}
                        onChange={e => {
                          setGroups(prev => prev.map((g, idx) =>
                            idx === gi ? { ...g, panelDecision: e.target.value } : g
                          ));
                        }}
                        placeholder="Enter the winner's full name as decided by the panel…"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #fcd34d', fontSize: '13px', fontFamily: 'inherit', backgroundColor: '#fff', outline: 'none' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Publish button */}
        {!success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={handlePublish}
              disabled={publishing || hasPendingTies}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '14px 32px', borderRadius: '10px', border: 'none',
                backgroundColor: hasPendingTies || publishing ? C.creamBorder : C.greenPrimary,
                color: hasPendingTies || publishing ? C.textMuted : '#fff',
                fontSize: '15px', fontWeight: 700,
                cursor: hasPendingTies || publishing ? 'not-allowed' : 'pointer',
                boxShadow: hasPendingTies ? 'none' : '0 4px 16px rgba(26,77,46,0.25)',
              }}
              aria-busy={publishing}
            >
              {publishing
                ? <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Publishing…</>
                : <><CheckCircle size={17} /> Publish Official Results</>}
            </button>
            {hasPendingTies && <p style={{ fontSize: '13px', color: '#b45309' }}>Resolve all ties above first.</p>}
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
