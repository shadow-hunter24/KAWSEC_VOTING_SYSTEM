import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Download, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Election, PublishedResult } from '../../types';

const C = {
  greenPrimary: '#1a4d2e', greenDark: '#0f2d1a', greenLight: '#e8f5ee',
  creamBg: '#fffdf7', creamCard: '#f5f0e8', creamBorder: '#e8e0cc', textMuted: '#5a5a4a',
};

/* ── Individual result card ─────────────────────────────────── */
function ResultCard({ position, results }: {
  position: string;
  results:  PublishedResult[];
}) {
  const sorted     = [...results].sort((a, b) => a.rank - b.rank);
  const winner     = sorted[0];
  const runners    = sorted.slice(1);
  const totalVotes = sorted.reduce((s, r) => s + r.vote_count, 0);
  const hasTie     = winner?.tie_flag;

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${C.creamBorder}`, overflow: 'hidden', breakInside: 'avoid' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.creamBorder}`, backgroundColor: C.creamCard }}>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.textMuted, marginBottom: '2px' }}>
          Prefect Position
        </p>
        <h3 style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary }}>{position}</h3>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {/* Winner */}
        <div style={{ borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', backgroundColor: C.greenLight, border: `1px solid ${C.greenPrimary}22` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} color={C.greenPrimary} aria-hidden="true" />
              <span style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>{winner?.candidate_name}</span>
              {hasTie && winner?.panel_decision && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309' }}>Panel Decision</span>
              )}
            </div>
            <span style={{ fontWeight: 800, fontSize: '14px', color: C.greenPrimary }}>{winner?.vote_count} votes</span>
          </div>
          <div style={{ height: '6px', borderRadius: '999px', backgroundColor: '#c8e6d0', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', backgroundColor: C.greenPrimary, width: totalVotes > 0 ? `${Math.round((winner.vote_count / totalVotes) * 100)}%` : '0%' }}
              role="progressbar" aria-label={`${winner?.candidate_name}: ${winner?.vote_count} of ${totalVotes} votes`}
              aria-valuenow={winner?.vote_count} aria-valuemin={0} aria-valuemax={totalVotes} />
          </div>
        </div>

        {/* Runners-up */}
        {runners.map(r => {
          const pct = totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0;
          return (
            <div key={r.candidate_id} style={{ borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', backgroundColor: C.creamCard }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: C.textMuted }}>{r.candidate_name}</span>
                <span style={{ fontSize: '12px', color: C.textMuted }}>{r.vote_count} ({pct}%)</span>
              </div>
              <div style={{ height: '4px', borderRadius: '999px', backgroundColor: C.creamBorder, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '999px', backgroundColor: '#a3b89c', width: `${pct}%` }} />
              </div>
            </div>
          );
        })}

        <p style={{ fontSize: '11px', color: C.textMuted, textAlign: 'right', marginTop: '6px' }}>{totalVotes} votes cast</p>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function ResultsPage() {
  const [elections,  setElections]  = useState<Election[]>([]);
  const [activeId,   setActiveId]   = useState('');
  const [results,    setResults]    = useState<PublishedResult[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [noResults,  setNoResults]  = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('elections').select('id, title, status, voting_closes_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
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
      .then(({ data }) => {
        setResults((data as PublishedResult[]) ?? []);
        setLoading(false);
      });
  }, [activeId]);

  // Group results by position
  const grouped: Record<string, PublishedResult[]> = {};
  results.forEach(r => {
    if (!grouped[r.position_title]) grouped[r.position_title] = [];
    grouped[r.position_title].push(r);
  });

  // Group positions by role_group (strip Male/Female for section headers)
  function getRoleGroup(title: string) {
    return title
      .replace(/ \(Male\)| \(Female\)/, '')
      .replace(/Head Boy|Head Girl/, 'School Prefect')
      .trim();
  }

  const roleGroups: Record<string, string[]> = {};
  Object.keys(grouped).forEach(pos => {
    const rg = getRoleGroup(pos);
    if (!roleGroups[rg]) roleGroups[rg] = [];
    roleGroups[rg].push(pos);
  });

  function handlePrint() {
    window.print();
  }

  const activeElection = elections.find(e => e.id === activeId);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Print styles */}
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; }
          .print-area { padding: 0 !important; }
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
              <button onClick={handlePrint} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                backgroundColor: C.creamCard, color: C.greenPrimary,
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}><Download size={14} /> Export / Print PDF</button>
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
              Results will appear here once the IT Coordinator has reviewed, verified, and officially published them after voting closes.
            </p>
          </div>
        )}

        {loading && !noResults && (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading results…</p>
        )}

        {/* Published results */}
        {!loading && !noResults && results.length > 0 && (
          <div ref={printRef} className="print-area">
            {/* Print header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <img src="/logo.png" alt="KAWSEC" width={64} height={64} style={{ display: 'block', margin: '0 auto 12px', objectFit: 'contain' }} />
              <h2 style={{ fontWeight: 800, fontSize: '22px', color: C.greenPrimary }}>{activeElection?.title}</h2>
              <p style={{ fontSize: '13px', color: C.textMuted }}>
                Official Results · Published {activeElection ? new Date(activeElection.updated_at ?? '').toLocaleDateString() : ''}
              </p>
              <div style={{ width: '60px', height: '3px', backgroundColor: C.greenPrimary, margin: '14px auto 0', borderRadius: '2px' }} />
            </div>

            {/* Grouped by role */}
            {Object.entries(roleGroups).map(([roleGroup, positions]) => (
              <div key={roleGroup} style={{ marginBottom: '40px' }}>
                <h3 style={{ fontWeight: 800, fontSize: '16px', color: C.greenPrimary, marginBottom: '14px', paddingBottom: '8px', borderBottom: `2px solid ${C.creamBorder}` }}>
                  {roleGroup}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                  {positions.map(pos => (
                    <ResultCard key={pos} position={pos} results={grouped[pos]} />
                  ))}
                </div>
              </div>
            ))}

            <p style={{ fontSize: '11px', color: C.textMuted, textAlign: 'center', marginTop: '24px' }}>
              Official results published by the KAWSEC IT Coordinator · Nkawkaw Senior High School · © 2026
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
