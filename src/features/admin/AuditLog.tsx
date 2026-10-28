import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AuditEvent } from '../../types';
import { C } from '../../lib/tokens';

const ACTION_COLORS: Record<string, string> = {
  'election.approved':     '#1e40af',
  'election.open':         '#065f46',
  'election.closed':       '#92400e',
  'election.verified':     '#5b21b6',
  'election.deleted':      '#991b1b',
  'election.cancelled':    '#b45309',
  'results.published':     '#065f46',
  'results.unpublished':   '#d97706',
  'ballot.cast':           C.greenPrimary,
  'student.authenticated': '#374151',
  'candidate.approved':    '#065f46',
  'candidate.rejected':    '#991b1b',
  'student.imported':      '#1e40af',
};

// AU-1: Structured renderer for known event types
function renderDetails(action: string, details: Record<string, unknown> | null): string {
  if (!details) return '—';
  if (action === 'ballot.cast') return `Election: ${details.election_id ?? '—'} · Votes: ${details.vote_count ?? '—'}`;
  if (action.startsWith('election.')) return `Election: ${details.title ?? details.election_id ?? '—'}`;
  if (action.startsWith('candidate.')) return `${details.candidate_name ?? details.candidate_id ?? '—'}`;
  if (action === 'student.imported') return `${details.count ?? '—'} students`;
  if (action === 'results.unpublished') return `Previous status: ${details.previous_status ?? '—'}`;
  // Generic fallback — only show key names, not raw values that may include IDs
  const keys = Object.keys(details).slice(0, 3);
  return keys.map(k => `${k}: ${String(details[k]).slice(0, 40)}`).join(' · ');
}

export default function AuditLog() {
  const [events,  setEvents]  = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    // AU-2: Reset to page 0 when search changes
    setPage(0);
    setEvents([]);
  }, [search]);

  useEffect(() => {
    supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .then(({ data }) => {
        setEvents(prev => page === 0 ? (data as AuditEvent[] ?? []) : [...prev, ...(data as AuditEvent[] ?? [])]);
        setLoading(false);
      });
  }, [page]);

  const filtered = events.filter(e =>
    !search ||
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    e.actor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Audit Log</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Tamper-evident record of all system actions</p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 24px' }}>
        {/* AU-5: labelled search input */}
        <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '24px' }}>
          <label htmlFor="audit-search" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            Filter audit log by action or actor
          </label>
          <Search size={15} color={C.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input id="audit-search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by action or actor…"
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', backgroundColor: '#fff', outline: 'none', fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading audit log…</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '14px', border: `1px solid ${C.creamBorder}` }}>
            <table aria-label="Audit event log" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: C.creamCard }}>
                  {['Time', 'Action', 'Actor', 'Details'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: C.textMuted, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.creamBorder}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: C.textMuted }}>No audit events found.</td></tr>
                ) : (
                  filtered.map(ev => (
                    <tr key={ev.id} style={{ borderBottom: `1px solid ${C.creamBorder}`, backgroundColor: '#fff' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = C.creamCard; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fff'; }}
                    >
                      <td style={{ padding: '10px 16px', color: C.textMuted, whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                          backgroundColor: `${ACTION_COLORS[ev.action] ?? C.textMuted}18`,
                          color: ACTION_COLORS[ev.action] ?? C.textMuted,
                        }}>{ev.action}</span>
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#1a1a1a' }}>{ev.actor}</td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: C.textMuted, maxWidth: '300px' }}>
                        {/* AU-1: structured renderer */}
                        {renderDetails(ev.action, ev.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {!loading && filtered.length >= PAGE_SIZE && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={() => setPage(p => p + 1)} style={{
              padding: '10px 24px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`,
              background: 'none', fontSize: '13px', fontWeight: 600, color: C.textMuted, cursor: 'pointer',
            }}>Load more</button>
          </div>
        )}
      </main>
    </div>
  );
}
