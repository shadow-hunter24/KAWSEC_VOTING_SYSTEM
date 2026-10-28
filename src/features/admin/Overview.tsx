import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Vote, ShieldCheck, BarChart2, Trophy,
  Clock, CheckCircle, AlertTriangle, RefreshCw, Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Election } from '../../types';
import { C } from '../../lib/tokens';

const STATUS_META: Record<string, { label: string; colour: string; bg: string; Icon: React.ElementType }> = {
  draft:     { label: 'Draft',     colour: '#374151', bg: '#f3f4f6',  Icon: Clock        },
  approved:  { label: 'Approved',  colour: '#1e40af', bg: '#dbeafe',  Icon: CheckCircle  },
  open:      { label: 'Voting Open', colour: C.greenPrimary, bg: C.greenLight, Icon: Vote },
  closed:    { label: 'Closed',    colour: '#b45309', bg: '#fef3c7',  Icon: Lock         },
  verified:  { label: 'Verified',  colour: '#5b21b6', bg: '#ede9fe',  Icon: ShieldCheck  },
  published: { label: 'Published', colour: '#065f46', bg: '#d1fae5',  Icon: Trophy       },
  cancelled: { label: 'Cancelled', colour: '#991b1b', bg: '#fee2e2',  Icon: AlertTriangle},
};

interface StatCard {
  Icon:    React.ElementType;
  label:   string;
  value:   string | number;
  sub?:    string;
  colour?: string;
  link?:   string;
}

interface PositionResult {
  position_title: string;
  candidate_name: string;
  vote_count:     number;
  rank:           number;
  tie_flag:       boolean;
}

export default function Overview() {
  const [elections,       setElections]       = useState<Election[]>([]);
  const [activeElection,  setActiveElection]  = useState<Election | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [lastRefresh,     setLastRefresh]      = useState<Date>(new Date());

  // Stats
  const [totalStudents,   setTotalStudents]   = useState(0);
  const [activeStudents,  setActiveStudents]  = useState(0);
  const [noHouseStudents, setNoHouseStudents] = useState(0);
  const [totalCredsToday, setTotalCredsToday] = useState(0);
  const [totalVoted,      setTotalVoted]      = useState(0);
  const [totalEligible,   setTotalEligible]   = useState(0);
  const [positions,       setPositions]       = useState<{ title: string; voted: number; eligible: number }[]>([]);
  const [results,         setResults]         = useState<PositionResult[]>([]);

  async function load() {
    setLoading(true);
    try {

    // All elections
    const { data: elecData } = await supabase
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false });

    const elecs = (elecData as Election[]) ?? [];
    setElections(elecs);

    // Pick the most relevant election to display
    const active = elecs.find(e => e.status === 'open')
      ?? elecs.find(e => e.status === 'verified')
      ?? elecs.find(e => e.status === 'closed')
      ?? elecs.find(e => e.status === 'published')
      ?? elecs[0] ?? null;
    setActiveElection(active);

    // Total + active students
    const [{ count: total }, { count: activeCount }] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    setTotalStudents(total ?? 0);
    setActiveStudents(activeCount ?? 0);

    // Students with no house assigned (won't get house captain ballot)
    const { count: noHouseCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('house_id', null);
    setNoHouseStudents(noHouseCount ?? 0);

    // Credentials generated today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: credsToday } = await supabase
      .from('credential_verifiers')
      .select('*', { count: 'exact', head: true })
      .gte('issued_at', todayStart.toISOString());
    setTotalCredsToday(credsToday ?? 0);

    if (active) {
      // Turnout for active election
      const { data: turnoutData } = await supabase.rpc('get_election_turnout', {
        p_election_id: active.id,
      });

      const rows = (turnoutData as { position_title: string; total_voted: number; total_eligible: number }[]) ?? [];
      const voted    = rows.reduce((s, r) => s + Number(r.total_voted), 0);
      const eligible = rows.reduce((s, r) => s + Number(r.total_eligible), 0);
      setTotalVoted(voted);
      setTotalEligible(eligible);
      setPositions(rows.map(r => ({
        title:    r.position_title,
        voted:    Number(r.total_voted),
        eligible: Number(r.total_eligible),
      })));

      // Results — only show after voting closes
      if (['closed', 'verified', 'published'].includes(active.status)) {
        if (active.status === 'published') {
          const { data: pubResults } = await supabase
            .from('published_results')
            .select('position_title, candidate_name, vote_count, rank, tie_flag')
            .eq('election_id', active.id)
            .order('rank');
          setResults((pubResults as PositionResult[]) ?? []);
        } else {
          // Tally (verified/closed but not published yet — IT Coordinator only)
          const { data: tallyData } = await supabase.rpc('tally_election_results', {
            p_election_id: active.id,
          });
          setResults((tallyData as PositionResult[] ?? []).map(r => ({
            ...r,
            tie_flag: false,
          })));
        }
      } else {
        setResults([]); // hidden during voting
      }
    }

    setLastRefresh(new Date());
    } catch (err) {
      console.error('Overview load error:', err);
    } finally {
      setLoading(false); // OV-1: always unblock spinner
    }
  }

  useEffect(() => { load(); }, []);

  const overallPct = totalEligible > 0 ? Math.round((totalVoted / totalEligible) * 100) : 0;
  const statusMeta = activeElection ? STATUS_META[activeElection.status] : null;
  const votingIsOpen = activeElection?.status === 'open';

  // Group results by position (winners only = rank 1)
  const winners = results.filter(r => r.rank === 1);

  const statCards: StatCard[] = [
    { Icon: Users,      label: 'Total Students',     value: totalStudents.toLocaleString(),   sub: `${activeStudents.toLocaleString()} active`,     colour: C.greenPrimary, link: '/admin/students' },
    { Icon: ShieldCheck,label: 'Credentials Today',  value: totalCredsToday.toLocaleString(), sub: 'issued since midnight',                         colour: '#2563eb' },
    { Icon: Vote,       label: 'Votes Cast',         value: totalVoted.toLocaleString(),      sub: `of ${totalEligible.toLocaleString()} eligible`,  colour: C.greenMid,     link: '/admin/turnout' },
    { Icon: BarChart2,  label: 'Overall Turnout',    value: `${overallPct}%`,                 sub: activeElection?.title ?? 'No active election',   colour: overallPct >= 75 ? C.greenPrimary : overallPct >= 50 ? '#d97706' : '#dc2626' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Election Overview</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>
                Live stats · Updated {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={load} disabled={loading} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.7)', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', opacity: loading ? 0.5 : 1 }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
            </button>
            <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: C.textMuted }}>Loading overview…</p>
          </div>
        ) : (
          <>
            {/* Active election badge */}
            {activeElection && statusMeta && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', padding: '14px 20px', borderRadius: '14px', backgroundColor: C.white, border: `1px solid ${C.creamBorder}`, flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 14px', borderRadius: '999px',
                  backgroundColor: statusMeta.bg, flexShrink: 0,
                }}>
                  <statusMeta.Icon size={15} color={statusMeta.colour} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: statusMeta.colour }}>{statusMeta.label}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>{activeElection.title}</p>
                  {activeElection.voting_opens_at && (
                    <p style={{ fontSize: '12px', color: C.textMuted }}>
                      {activeElection.voting_opens_at ? `Opens: ${new Date(activeElection.voting_opens_at).toLocaleString()}` : ''}
                      {activeElection.voting_closes_at ? ` · Closes: ${new Date(activeElection.voting_closes_at).toLocaleString()}` : ''}
                    </p>
                  )}
                </div>
                {elections.length > 1 && (
                  <Link to="/admin/elections" style={{ fontSize: '12px', color: C.greenPrimary, fontWeight: 600, textDecoration: 'none' }}>
                    Switch election →
                  </Link>
                )}
              </div>
            )}

            {/* No-house warning */}
            {noHouseStudents > 0 && (
              <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '20px' }}>
                <AlertTriangle size={16} color="#b45309" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                    {noHouseStudents} active student{noHouseStudents !== 1 ? 's have' : ' has'} no house assigned
                  </p>
                  <p style={{ fontSize: '12px', color: '#92400e', marginTop: '2px', lineHeight: 1.5 }}>
                    These students will <strong>not receive a House Captain ballot</strong> and cannot vote for their house.
                    Fix this in{' '}
                    <Link to="/admin/students" style={{ color: '#92400e', fontWeight: 700 }}>
                      Student Register
                    </Link>
                    {' '}before approving the election.
                  </p>
                </div>
              </div>
            )}

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {statCards.map(({ Icon, label, value, sub, colour, link }) => {
                const inner = (
                  <div style={{
                    backgroundColor: C.white, borderRadius: '14px', padding: '20px 22px',
                    border: `1px solid ${C.creamBorder}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.2s', height: '100%',
                  }}
                    onMouseEnter={e => { if (link) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(26,77,46,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${colour}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} color={colour} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted }}>{label}</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800, color: colour ?? C.greenPrimary, lineHeight: 1 }}>{value}</p>
                    {sub && <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '6px' }}>{sub}</p>}
                  </div>
                );
                return link
                  ? <Link key={label} to={link} style={{ textDecoration: 'none' }}>{inner}</Link>
                  : <div key={label}>{inner}</div>;
              })}
            </div>

            {/* Overall progress bar */}
            {totalEligible > 0 && (
              <div style={{ backgroundColor: C.white, borderRadius: '14px', padding: '20px 24px', border: `1px solid ${C.creamBorder}`, marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: C.greenPrimary }}>School-wide Voting Progress</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: C.greenPrimary }}>
                    {totalVoted.toLocaleString()} / {totalEligible.toLocaleString()} ({overallPct}%)
                  </span>
                </div>
                <div style={{ height: '12px', borderRadius: '999px', backgroundColor: C.creamCard, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '999px', backgroundColor: C.greenPrimary, width: `${overallPct}%`, transition: 'width 0.6s ease' }}
                    role="progressbar" aria-valuenow={overallPct} aria-valuemin={0} aria-valuemax={100} />
                </div>
                {votingIsOpen && (
                  <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '8px' }}>
                    🔒 Candidate totals are hidden while voting is open — only the IT Coordinator can see them after closing.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: positions.length > 0 ? '1fr 1fr' : '1fr', gap: '24px' }}>

              {/* Per-position turnout */}
              {positions.length > 0 && (
                <div style={{ backgroundColor: C.white, borderRadius: '14px', padding: '20px 24px', border: `1px solid ${C.creamBorder}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>Turnout per Position</h2>
                    <Link to="/admin/turnout" style={{ fontSize: '12px', color: C.greenMid, textDecoration: 'none', fontWeight: 600 }}>Full view →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {positions.map(p => {
                      const pct = p.eligible > 0 ? Math.round((p.voted / p.eligible) * 100) : 0;
                      return (
                        <div key={p.title}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a' }}>{p.title}</span>
                            <span style={{ fontSize: '12px', color: C.textMuted }}>{p.voted}/{p.eligible} ({pct}%)</span>
                          </div>
                          <div style={{ height: '5px', borderRadius: '999px', backgroundColor: C.creamCard, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '999px', width: `${pct}%`, backgroundColor: pct >= 75 ? C.greenPrimary : pct >= 50 ? '#d97706' : '#ef4444', transition: 'width 0.5s' }}
                              role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                              aria-label={`${p.title}: ${pct}% turnout`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Results / winners */}
              <div style={{ backgroundColor: C.white, borderRadius: '14px', padding: '20px 24px', border: `1px solid ${C.creamBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>
                    {activeElection?.status === 'published' ? 'Official Winners' : 'Current Leaders'}
                  </h2>
                  {['closed','verified','published'].includes(activeElection?.status ?? '') && (
                    <Link to={`/admin/tally/${activeElection?.id}`} style={{ fontSize: '12px', color: C.greenMid, textDecoration: 'none', fontWeight: 600 }}>
                      Full tally →
                    </Link>
                  )}
                </div>

                {votingIsOpen ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <Lock size={28} color={C.creamBorder} style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 700, fontSize: '13px', color: C.textMuted }}>Results hidden during voting</p>
                    <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '6px', lineHeight: 1.5 }}>
                      Vote counts will appear here once the election is closed.
                    </p>
                  </div>
                ) : winners.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <BarChart2 size={28} color={C.creamBorder} style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: C.textMuted }}>
                      {activeElection?.status === 'draft' || activeElection?.status === 'approved'
                        ? 'Voting has not started yet.'
                        : 'No results yet. Close the election to view the tally.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {winners.slice(0, 12).map(w => (
                      <div key={`${w.position_title}-${w.candidate_name}`} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '10px',
                        backgroundColor: C.creamCard,
                      }}>
                        <Trophy size={15} color={C.greenPrimary} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>
                            {w.position_title}
                          </p>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: C.greenPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {w.candidate_name}
                            {w.tie_flag && <span style={{ fontSize: '11px', fontWeight: 700, marginLeft: '6px', color: '#b45309' }}>TIE</span>}
                          </p>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.textMuted, flexShrink: 0 }}>
                          {w.vote_count} votes
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ marginTop: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              {[
                { label: 'Class Monitor',    link: '/admin/classes',   desc: 'Per-class progress' },
                { label: 'Student Register', link: '/admin/students',  desc: 'View & edit students' },
                { label: 'Candidates',       link: '/admin/candidates',desc: 'Approve candidates' },
                { label: 'Audit Log',        link: '/admin/audit',     desc: 'System activity log' },
              ].map(({ label, link, desc }) => (
                <Link key={link} to={link} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '14px 16px', borderRadius: '12px', backgroundColor: C.white,
                    border: `1px solid ${C.creamBorder}`, transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.greenMid; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.creamBorder; }}
                  >
                    <p style={{ fontWeight: 700, fontSize: '13px', color: C.greenPrimary }}>{label}</p>
                    <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
