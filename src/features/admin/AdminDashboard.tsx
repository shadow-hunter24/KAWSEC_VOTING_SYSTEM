import { Link } from 'react-router-dom';
import { Upload, UserCheck, BarChart2, Users, Settings, FileText } from 'lucide-react';

const C = {
  greenPrimary: '#1a4d2e', greenLight: '#e8f5ee',
  creamBg: '#fffdf7', creamCard: '#f5f0e8', creamBorder: '#e8e0cc', textMuted: '#5a5a4a',
};

const cards = [
  { Icon: Upload,    title: 'Import Students',      desc: 'Upload student register via CSV with preview and validation.',          link: '/admin/students/import',  ready: true,  phase: 'Phase 3' },
  { Icon: UserCheck, title: 'Candidate Management', desc: 'Add candidates, upload photos/manifestos, approve or reject.',          link: '/admin/candidates',       ready: true,  phase: 'Phase 3' },
  { Icon: Settings,  title: 'Election Settings',    desc: 'Create elections, set schedules, approve and open/close voting.',       link: '/admin/elections',        ready: true,  phase: 'Phase 5' },
  { Icon: BarChart2, title: 'Turnout Dashboard',    desc: 'Live participation rates per position — no candidate totals shown.',     link: '/admin/turnout',          ready: true,  phase: 'Phase 5' },
  { Icon: Users,     title: 'Tally & Publish',      desc: 'Review vote counts, resolve ties, publish official results.',           link: '/admin/tally',            ready: true,  phase: 'Phase 5' },
  { Icon: FileText,  title: 'Audit Log',            desc: 'Tamper-evident log of all system actions, logins and admin changes.',   link: '/admin/audit',            ready: true,  phase: 'Phase 5' },
];

export default function AdminDashboard() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Admin Dashboard</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>KAWSEC Elections — Nkawkaw Senior High School</p>
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, padding: '6px 14px', borderRadius: '999px', backgroundColor: C.creamCard, color: C.greenPrimary }}>
            IT Coordinator
          </span>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ fontSize: '14px', color: C.textMuted, marginBottom: '32px' }}>
          All Phase 3 and Phase 5 modules are now active. Select a module to manage the election.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {cards.map(({ Icon, title, desc, link, phase }) => (
            <Link key={title} to={link} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                backgroundColor: C.creamBg, borderRadius: '16px', padding: '24px',
                border: `1px solid ${C.creamBorder}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s, border-color 0.2s', height: '100%',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(26,77,46,0.12)'; el.style.borderColor = '#2d7a4f'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; el.style.borderColor = C.creamBorder; }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon size={24} color={C.greenPrimary} />
                </div>
                <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', marginBottom: '6px' }}>{title}</h2>
                <p style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.6, marginBottom: '16px' }}>{desc}</p>
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: C.greenLight, color: C.greenPrimary, border: `1px solid ${C.creamBorder}` }}>
                  ✓ Active · {phase}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, color: C.textMuted, fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.greenPrimary; e.currentTarget.style.color = C.greenPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.creamBorder; e.currentTarget.style.color = C.textMuted; }}
          >← Sign Out &amp; Return Home</Link>
        </div>
      </main>
    </div>
  );
}
