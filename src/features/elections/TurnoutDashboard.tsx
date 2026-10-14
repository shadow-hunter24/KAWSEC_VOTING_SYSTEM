import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Users, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Election, TurnoutRow } from '../../types';

const C = {
  greenPrimary: '#1a4d2e', greenLight: '#e8f5ee', greenMid: '#2d7a4f',
  creamBg: '#fffdf7', creamCard: '#f5f0e8', creamBorder: '#e8e0cc', textMuted: '#5a5a4a',
};

export default function TurnoutDashboard() {
  const [elections,   setElections]   = useState<Election[]>([]);
  const [activeId,    setActiveId]    = useState('');
  const [turnout,     setTurnout]     = useState<TurnoutRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.from('elections').select('id, title, status')
      .in('status', ['open', 'closed', 'verified', 'published'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as Election[]) ?? [];
        setElections(list);
        if (list.length > 0) setActiveId(list[0].id);
      });
  }, []);

  async function loadTurnout(id: string) {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.rpc('get_election_turnout', { p_election_id: id });
    setTurnout((data as TurnoutRow[]) ?? []);
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadTurnout(activeId);
    // Auto-refresh every 30 seconds while dashboard is open
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => loadTurnout(activeId), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeId]);

  const totalEligible = turnout.reduce((s, r) => s + Number(r.total_eligible), 0);
  const totalVoted    = turnout.reduce((s, r) => s + Number(r.total_voted), 0);
  const overallPct    = totalEligible > 0 ? Math.round((totalVoted / totalEligible) * 100) : 0;

  // Group by role (strip M/F suffix for grouping)
  const grouped: Record<string, TurnoutRow[]> = {};
  turnout.forEach(row => {
    const group = row.position_title.replace(/ \(Male\)| \(Female\)|Head Boy|Head Girl/g, '').trim() || row.position_title;
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(row);
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Turnout Dashboard</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Live participation monitoring — no candidate totals shown</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastRefresh && <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.5)' }}>Refreshed {lastRefresh.toLocaleTimeString()}</span>}
            <button onClick={() => loadTurnout(activeId)} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 24px' }}>

        {/* Election selector */}
        {elections.length > 1 && (
          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginRight: '10px' }}>Election:</label>
            <select value={activeId} onChange={e => setActiveId(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', backgroundColor: '#fff' }}>
              {elections.map(e => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}
            </select>
          </div>
        )}

        {/* Overall stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '36px' }}>
          {[
            { Icon: Users,       label: 'Total Eligible', value: totalEligible.toLocaleString(), sub: 'registered students' },
            { Icon: CheckCircle, label: 'Votes Cast',     value: totalVoted.toLocaleString(),    sub: 'ballots submitted' },
            { Icon: Clock,       label: 'Overall Turnout',value: `${overallPct}%`,              sub: 'participation rate' },
          ].map(({ Icon, label, value, sub }) => (
            <div key={label} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '20px 22px', border: `1px solid ${C.creamBorder}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={C.greenPrimary} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted }}>{label}</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 800, color: C.greenPrimary, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '20px 24px', border: `1px solid ${C.creamBorder}`, marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.greenPrimary }}>Overall Participation</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.greenPrimary }}>{overallPct}%</span>
          </div>
          <div style={{ height: '12px', borderRadius: '999px', backgroundColor: C.creamCard, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', backgroundColor: C.greenPrimary, width: `${overallPct}%`, transition: 'width 0.6s ease' }}
              role="progressbar" aria-valuenow={overallPct} aria-valuemin={0} aria-valuemax={100}
              aria-label={`Overall turnout: ${overallPct}%`} />
          </div>
          <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '6px' }}>
            Candidate totals are hidden during voting — only participation rates are shown here.
          </p>
        </div>

        {/* Per-position breakdown */}
        {loading ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading turnout data…</p>
        ) : turnout.length === 0 ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>No turnout data yet. Voting may not have started.</p>
        ) : (
          Object.entries(grouped).map(([group, rows]) => (
            <div key={group} style={{ marginBottom: '28px' }}>
              <h2 style={{ fontWeight: 700, fontSize: '14px', color: C.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{group}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rows.map(row => {
                  const pct = Number(row.turnout_pct) || 0;
                  return (
                    <div key={row.position_id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '14px 18px', border: `1px solid ${C.creamBorder}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>{row.position_title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: C.textMuted }}>{row.total_voted} / {row.total_eligible}</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: pct >= 75 ? C.greenPrimary : pct >= 50 ? '#d97706' : '#dc2626' }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: '6px', borderRadius: '999px', backgroundColor: C.creamCard, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '999px', width: `${pct}%`, transition: 'width 0.6s ease',
                          backgroundColor: pct >= 75 ? C.greenPrimary : pct >= 50 ? '#d97706' : '#dc2626',
                        }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
