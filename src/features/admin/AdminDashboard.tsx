import { Link } from 'react-router-dom';
import { Users, Settings, FileText, BarChart2, Upload, UserCheck } from 'lucide-react';

const C = {
  greenPrimary: '#1a4d2e', greenDark: '#0f2d1a', greenLight: '#e8f5ee',
  creamBg: '#fffdf7', creamCard: '#f5f0e8', creamBorder: '#e8e0cc', textMuted: '#5a5a4a',
};

const cards = [
  {
    Icon: Upload, title: 'Import Students',
    desc: 'Upload the student register via CSV. Adds or updates students in bulk with preview and validation.',
    phase: 'Phase 3', link: '/admin/students/import', ready: true,
  },
  {
    Icon: UserCheck, title: 'Candidate Management',
    desc: 'Add candidates, upload photos and manifestos, then approve or reject submissions per position.',
    phase: 'Phase 3', link: '/admin/candidates', ready: true,
  },
  {
    Icon: BarChart2, title: 'Turnout Monitoring',
    desc: 'Track live voter participation rates and real-time turnout across all houses and classes.',
    phase: 'Phase 5', link: null, ready: false,
  },
  {
    Icon: Users, title: 'Student Register',
    desc: 'View, search and manage the full student register. Edit individual student records.',
    phase: 'Phase 3+', link: null, ready: false,
  },
  {
    Icon: Settings, title: 'Election Settings',
    desc: 'Configure election schedules, positions and eligibility rules for each voting cycle.',
    phase: 'Phase 5', link: null, ready: false,
  },
  {
    Icon: FileText, title: 'Audit Logs',
    desc: 'Full tamper-evident audit trail of all system activities, logins and admin actions.',
    phase: 'Phase 5', link: null, ready: false,
  },
];

export default function AdminDashboard() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
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

      {/* Content */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ fontSize: '14px', color: C.textMuted, marginBottom: '32px' }}>
          Select a module to manage the election. Phase 3 features are now active.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {cards.map(({ Icon, title, desc, phase, link, ready }) => {
            const inner = (
              <div
                role="article"
                aria-label={`${title} — ${phase}`}
                style={{
                  backgroundColor: C.creamBg, borderRadius: '16px', padding: '24px',
                  border: `1px solid ${ready ? C.greenMid ?? C.creamBorder : C.creamBorder}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  height: '100%', textDecoration: 'none', color: 'inherit', display: 'block',
                  opacity: ready ? 1 : 0.75,
                }}
                onMouseEnter={e => {
                  if (!ready) return;
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.boxShadow = '0 6px 20px rgba(26,77,46,0.12)';
                  el.style.borderColor = '#2d7a4f';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                  el.style.borderColor = ready ? C.creamBorder : C.creamBorder;
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: ready ? C.greenLight : C.creamCard,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                }} aria-hidden="true">
                  <Icon size={24} color={ready ? C.greenPrimary : C.textMuted} />
                </div>
                <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', marginBottom: '6px' }}>{title}</h2>
                <p style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.6, marginBottom: '16px' }}>{desc}</p>
                <span style={{
                  display: 'inline-block', fontSize: '11px', fontWeight: 700,
                  padding: '4px 10px', borderRadius: '999px',
                  backgroundColor: ready ? C.greenLight : C.creamCard,
                  color: ready ? C.greenPrimary : C.textMuted,
                  border: `1px solid ${C.creamBorder}`,
                }}>
                  {ready ? `✓ Active · ${phase}` : `Coming Soon · ${phase}`}
                </span>
              </div>
            );

            return link ? (
              <Link key={title} to={link} style={{ textDecoration: 'none' }}>
                {inner}
              </Link>
            ) : (
              <div key={title}>{inner}</div>
            );
          })}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 22px', borderRadius: '10px',
            border: `1.5px solid ${C.creamBorder}`, color: C.textMuted,
            fontSize: '13px', fontWeight: 600, textDecoration: 'none',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.greenPrimary; e.currentTarget.style.color = C.greenPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.creamBorder; e.currentTarget.style.color = C.textMuted; }}
          >← Sign Out &amp; Return Home</Link>
        </div>
      </main>
    </div>
  );
}
