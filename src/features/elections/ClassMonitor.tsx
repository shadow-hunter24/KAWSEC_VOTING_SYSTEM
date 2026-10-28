// ============================================================
// Class Monitor — per-class voting progress
// IT Coordinator uses this to track which classes have voted
// and call the next class to the ICT lab.
// ============================================================
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Users, CheckCircle, Clock, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Election } from '../../types';
import { C } from '../../lib/tokens';

interface ClassTurnoutRow {
  election_id:       string;
  election_title:    string;
  department_name:   string;
  department_code:   string;
  class_name:        string;
  year_group:        number;
  total_eligible:    number;
  total_voted:       number;
  turnout_pct:       number;
}

const YEAR_LABELS: Record<number, string> = { 1: 'Form 1', 2: 'Form 2', 3: 'Form 3' };

// Colour-code turnout percentage
function turnoutColor(pct: number) {
  if (pct >= 90) return { bar: C.greenPrimary, badge: '#d1fae5', text: '#065f46' };
  if (pct >= 60) return { bar: '#d97706',      badge: '#fef3c7', text: '#92400e' };
  if (pct >  0 ) return { bar: '#ef4444',      badge: '#fee2e2', text: '#991b1b' };
  return               { bar: C.creamBorder,   badge: C.creamCard, text: C.textMuted };
}

export default function ClassMonitor() {
  const [elections,    setElections]    = useState<Election[]>([]);
  const [activeId,     setActiveId]     = useState('');
  const [rows,         setRows]         = useState<ClassTurnoutRow[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [lastRefresh,  setLastRefresh]  = useState<Date | null>(null);
  const [search,       setSearch]       = useState('');
  const [filterDept,   setFilterDept]   = useState('');
  const [filterYear,   setFilterYear]   = useState('');
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);

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

  async function loadRows(id: string) {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from('class_turnout_view')
      .select('*')
      .eq('election_id', id);
    setRows((data as ClassTurnoutRow[]) ?? []);
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadRows(activeId);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => loadRows(activeId), 20000); // every 20s
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeId]);

  // Summary stats
  const totalEligible = rows.reduce((s, r) => s + Number(r.total_eligible), 0);
  const totalVoted    = rows.reduce((s, r) => s + Number(r.total_voted), 0);
  const overallPct    = totalEligible > 0 ? Math.round((totalVoted / totalEligible) * 100) : 0;

  // Filters
  const departments = [...new Set(rows.map(r => r.department_name))].sort();
  const years       = [...new Set(rows.map(r => r.year_group))].sort();

  const filtered = rows.filter(r => {
    const matchSearch = !search || r.class_name.toLowerCase().includes(search.toLowerCase());
    const matchDept   = !filterDept || r.department_name === filterDept;
    const matchYear   = !filterYear || r.year_group === Number(filterYear);
    return matchSearch && matchDept && matchYear;
  });

  // Group by department
  const grouped: Record<string, ClassTurnoutRow[]> = {};
  filtered.forEach(r => {
    if (!grouped[r.department_name]) grouped[r.department_name] = [];
    grouped[r.department_name].push(r);
  });

  // Classes with 0 votes (not yet started)
  const notStarted = filtered.filter(r => Number(r.total_voted) === 0).length;
  const completed  = filtered.filter(r => Number(r.turnout_pct) >= 90).length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Class Monitor</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Real-time per-class voting progress</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* CLS-4: pulsing Live indicator */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#4ade80', fontWeight: 700 }} aria-label="Live data — auto-refreshes every 20 seconds">
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80', animation: 'pulse-live 1.6s ease-in-out infinite' }} aria-hidden="true" /> Live
            </span>
            {lastRefresh && <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.5)' }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
            <button onClick={() => loadRows(activeId)} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Election selector — CLS-2: associated label */}
        {elections.length > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="class-monitor-election-select" style={{ fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginRight: '10px' }}>Election:</label>
            <select id="class-monitor-election-select" value={activeId} onChange={e => setActiveId(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', backgroundColor: '#fff' }}>
              {elections.map(e => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}
            </select>
          </div>
        )}

        {/* Overall stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          {[
            { Icon: Users,       label: 'Total Eligible', value: totalEligible.toLocaleString() },
            { Icon: CheckCircle, label: 'Votes Cast',     value: totalVoted.toLocaleString() },
            { Icon: Clock,       label: 'Overall Turnout',value: `${overallPct}%` },
            { Icon: CheckCircle, label: '≥90% Classes',   value: `${completed}` },
            { Icon: Users,       label: 'Not Started',    value: `${notStarted}` },
          ].map(({ Icon, label, value }) => (
            <div key={label} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px 18px', border: `1px solid ${C.creamBorder}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={C.greenPrimary} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted }}>{label}</span>
              </div>
              <p style={{ fontSize: '24px', fontWeight: 800, color: C.greenPrimary }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Overall bar */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', border: `1px solid ${C.creamBorder}`, marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.greenPrimary }}>School-wide Participation</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.greenPrimary }}>{totalVoted.toLocaleString()} / {totalEligible.toLocaleString()} ({overallPct}%)</span>
          </div>
          <div style={{ height: '10px', borderRadius: '999px', backgroundColor: C.creamCard, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', backgroundColor: C.greenPrimary, width: `${overallPct}%`, transition: 'width 0.6s ease' }}
              role="progressbar" aria-valuenow={overallPct} aria-valuemin={0} aria-valuemax={100} />
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} color={C.textMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search class…"
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', backgroundColor: '#fff', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', backgroundColor: '#fff' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', backgroundColor: '#fff' }}>
            <option value="">All Year Groups</option>
            {years.map(y => <option key={y} value={y}>{YEAR_LABELS[y] ?? `Form ${y}`}</option>)}
          </select>
        </div>

        {/* Class table grouped by department */}
        {loading ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading class data…</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>No class data found. Entitlements may not be generated yet.</p>
        ) : (
          Object.entries(grouped).map(([dept, deptRows]) => {
            const deptEligible = deptRows.reduce((s, r) => s + Number(r.total_eligible), 0);
            const deptVoted    = deptRows.reduce((s, r) => s + Number(r.total_voted), 0);
            const deptPct      = deptEligible > 0 ? Math.round((deptVoted / deptEligible) * 100) : 0;
            return (
              <div key={dept} style={{ marginBottom: '28px' }}>
                {/* Department header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: `2px solid ${C.creamBorder}` }}>
                  <h2 style={{ fontWeight: 800, fontSize: '15px', color: C.greenPrimary }}>{dept}</h2>
                  <span style={{ fontSize: '12px', color: C.textMuted }}>{deptVoted} / {deptEligible} voted ({deptPct}%)</span>
                </div>

                {/* Classes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {deptRows.sort((a, b) => a.year_group - b.year_group || a.class_name.localeCompare(b.class_name)).map(row => {
                    const pct    = Number(row.turnout_pct) || 0;
                    const colors = turnoutColor(pct);
                    return (
                      <div key={row.class_name} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '14px 16px', border: `1px solid ${C.creamBorder}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{row.class_name}</p>
                            <p style={{ fontSize: '11px', color: C.textMuted }}>{YEAR_LABELS[row.year_group] ?? `Form ${row.year_group}`}</p>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: colors.badge, color: colors.text }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '999px', backgroundColor: C.creamCard, overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ height: '100%', borderRadius: '999px', backgroundColor: colors.bar, width: `${pct}%`, transition: 'width 0.5s ease' }}
                            role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                            aria-label={`${row.class_name}: ${pct}% turnout`} />
                        </div>
                        <p style={{ fontSize: '11px', color: C.textMuted }}>
                          {row.total_voted} of {row.total_eligible} voted
                          {Number(row.total_voted) === 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}> · Not started</span>}
                          {pct >= 90 && <span style={{ color: C.greenPrimary, fontWeight: 600 }}> · ✓ Complete</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        <p style={{ fontSize: '11px', color: C.textMuted, textAlign: 'center', marginTop: '24px' }}>
          Auto-refreshes every 20 seconds · Candidate totals are never shown here
        </p>
      </main>

      <style>{`@keyframes pulse-live { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
    </div>
  );
}
