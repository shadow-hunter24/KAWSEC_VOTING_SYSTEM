import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Clock, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Election, PublishedResult } from '../../types';
import { C } from '../../lib/tokens';

// Rank metadata
const RANK_META: Record<number, { label: string; colour: string; bg: string; border: string }> = {
  1: { label: 'Main Prefect',   colour: C.greenPrimary, bg: C.greenLight,   border: C.greenPrimary + '30' },
  2: { label: '1st Assistant',  colour: '#1e40af',      bg: '#dbeafe',       border: '#93c5fd'             },
  3: { label: '2nd Assistant',  colour: '#7c3aed',      bg: '#ede9fe',       border: '#c4b5fd'             },
  4: { label: '3rd Assistant',  colour: '#b45309',      bg: '#fef3c7',       border: '#fcd34d'             },
};

/* ── Position result card ────────────────────────────────────── */
function PositionCard({ position, results }: { position: string; results: PublishedResult[] }) {
  const sorted     = [...results].sort((a, b) => a.rank - b.rank);
  const totalVotes = sorted.reduce((s, r) => s + r.vote_count, 0);

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${C.creamBorder}`, overflow: 'hidden', breakInside: 'avoid' }}>
      {/* Position header */}
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.creamBorder}`, backgroundColor: C.creamCard }}>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.textMuted, marginBottom: '2px' }}>Prefect Position</p>
        <h3 style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary }}>{position}</h3>
        <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{totalVotes} total votes · {sorted.length} ranked</p>
      </div>

      {/* Ranked candidates */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.map(r => {
          const meta  = RANK_META[r.rank] ?? { label: `Rank ${r.rank}`, colour: C.textMuted, bg: C.creamCard, border: C.creamBorder };
          const pct   = totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0;
          const isTop = r.rank === 1;

          return (
            <div key={r.candidate_id} style={{
              borderRadius: '12px', padding: '14px 16px',
              backgroundColor: meta.bg,
              border: `1px solid ${meta.border}`,
            }}>
              {/* Rank badge + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ flexShrink: 0 }}>
                  {isTop
                    ? <Trophy size={18} color={meta.colour} aria-hidden="true" />
                    : <Medal size={18} color={meta.colour} aria-hidden="true" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: meta.colour }}>{r.candidate_name}</span>
                    {r.tie_flag && r.panel_decision && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309' }}>Panel Decision</span>
                    )}
                  </div>
                  <span style={{
                    display: 'inline-block', marginTop: '3px',
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                    backgroundColor: '#fff', color: meta.colour, border: `1px solid ${meta.border}`,
                  }}>{meta.label}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: meta.colour, flexShrink: 0 }}>
                  {r.vote_count} votes
                </span>
              </div>

              {/* Vote bar */}
              <div style={{ height: '6px', borderRadius: '999px', backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '999px', backgroundColor: meta.colour, width: `${pct}%`, transition: 'width 0.6s ease' }}
                  role="progressbar" aria-valuenow={r.vote_count} aria-valuemin={0} aria-valuemax={totalVotes}
                  aria-label={`${r.candidate_name}: ${r.vote_count} of ${totalVotes} votes`} />
              </div>
              <p style={{ fontSize: '11px', color: meta.colour, marginTop: '4px', textAlign: 'right', opacity: 0.8 }}>{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function ResultsPage() {
  const [elections,      setElections]      = useState<Election[]>([]);
  const [activeId,       setActiveId]       = useState('');
  const [results,        setResults]        = useState<PublishedResult[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [noResults,      setNoResults]      = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('elections').select('id, title, status, updated_at')
      .eq('status', 'published').order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as Election[]) ?? [];
        setElections(list);
        if (list.length > 0) setActiveId(list[0].id);
        else { setNoResults(true); setLoading(false); }
      });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    supabase.from('published_results').select('*')
      .eq('election_id', activeId).order('rank')
      .then(({ data }) => { setResults((data as PublishedResult[]) ?? []); setLoading(false); });
  }, [activeId]);

  // Group by position title
  const grouped: Record<string, PublishedResult[]> = {};
  results.forEach(r => {
    if (!grouped[r.position_title]) grouped[r.position_title] = [];
    grouped[r.position_title].push(r);
  });

  // Group positions by role (strip M/F for section headers)
  function getRoleGroup(title: string) {
    return title
      .replace(/ \(Male\)| \(Female\)/, '')
      .replace(/Head Boy|Head Girl/, 'School Prefect')
      .replace(/ House Captain.*/, ' House Captain')
      .trim();
  }

  const roleGroups: Record<string, string[]> = {};
  Object.keys(grouped).forEach(pos => {
    const rg = getRoleGroup(pos);
    if (!roleGroups[rg]) roleGroups[rg] = [];
    roleGroups[rg].push(pos);
  });

  const activeElection = elections.find(e => e.id === activeId);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Header */}
      <header className="no-print" style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Election Results</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>KAWSEC Prefect Elections · Nkawkaw Senior High School</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {results.length > 0 && (
              <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: C.creamCard, color: C.greenPrimary, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                <Download size={14} /> Export / Print PDF
              </button>
            )}
            <Link to="/" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Home</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Election selector */}
        {elections.length > 1 && (
          <div className="no-print" style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginRight: '10px' }}>Election:</label>
            <select value={activeId} onChange={e => setActiveId(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', backgroundColor: '#fff' }}>
              {elections.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
        )}

        {/* Not published */}
        {noResults && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Clock size={32} color={C.greenPrimary} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.greenPrimary, marginBottom: '10px' }}>Results Not Yet Published</h2>
            <p style={{ fontSize: '14px', color: C.textMuted, maxWidth: '380px', margin: '0 auto', lineHeight: 1.7 }}>
              Results will appear here once the IT Coordinator has verified and officially published them after voting closes.
            </p>
          </div>
        )}

        {loading && !noResults && <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading results…</p>}

        {/* Published results */}
        {!loading && !noResults && results.length > 0 && (
          <div ref={printRef}>
            {/* Print header */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <img src="/logo.png" alt="KAWSEC" width={72} height={72} style={{ display: 'block', margin: '0 auto 14px', objectFit: 'contain' }} />
              <h2 style={{ fontWeight: 800, fontSize: '24px', color: C.greenPrimary }}>{activeElection?.title}</h2>
              <p style={{ fontSize: '13px', color: C.textMuted, marginTop: '4px' }}>
                Official Results · Published {activeElection?.updated_at ? new Date(activeElection.updated_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </p>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
                {[1,2,3].map(rank => {
                  const m = RANK_META[rank];
                  return (
                    <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', backgroundColor: m.bg, border: `1px solid ${m.border}` }}>
                      {rank === 1 ? <Trophy size={13} color={m.colour} /> : <Medal size={13} color={m.colour} />}
                      <span style={{ fontSize: '12px', fontWeight: 700, color: m.colour }}>{m.label}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ width: '60px', height: '3px', backgroundColor: C.greenPrimary, margin: '16px auto 0', borderRadius: '2px' }} />
            </div>

            {/* Grouped by role */}
            {Object.entries(roleGroups).map(([roleGroup, positions]) => (
              <div key={roleGroup} style={{ marginBottom: '44px' }}>
                <h3 style={{ fontWeight: 800, fontSize: '17px', color: C.greenPrimary, marginBottom: '16px', paddingBottom: '8px', borderBottom: `2px solid ${C.creamBorder}` }}>
                  {roleGroup}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {positions.map(pos => (
                    <PositionCard key={pos} position={pos} results={grouped[pos]} />
                  ))}
                </div>
              </div>
            ))}

            <p style={{ fontSize: '11px', color: C.textMuted, textAlign: 'center', marginTop: '32px' }}>
              Official results published by KAWSEC IT Coordinator · Nkawkaw Senior High School · © 2026
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
