import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, Menu, X,
  Users, Vote, CheckCircle, BarChart2,
  ShieldCheck, Zap, Trophy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/tokens';

/* ── Shared logo component ─────────────────────────────────── */
function Logo({ size = 40 }: { size?: number }) {
  return (
    <img src="/logo.png" alt="KAWSEC school crest"
      width={size} height={size}
      style={{ display: 'inline-block', flexShrink: 0, objectFit: 'contain' }} />
  );
}

/* ── Static data ───────────────────────────────────────────── */
const STEPS = [
  { num: 1, Icon: Users,       title: 'Enter Student ID',    desc: 'Use the student ID printed on your school ID card.' },
  { num: 2, Icon: CheckCircle, title: 'Get Your Credential', desc: 'A unique one-time voting credential is generated for you.' },
  { num: 3, Icon: Vote,        title: 'Cast Your Vote',      desc: 'Vote position by position — your ballot is private.' },
  { num: 4, Icon: BarChart2,   title: 'Results Published',   desc: 'The IT Coordinator verifies and publishes final results.' },
];

const HIGHLIGHTS = [
  { Icon: ShieldCheck, title: 'Secure & Private',   desc: 'Your vote is never linked to your identity. Full ballot secrecy guaranteed.' },
  { Icon: Zap,         title: 'Fast & Paperless',   desc: 'No queues or ballot boxes. Vote from any school device in minutes.' },
  { Icon: Trophy,      title: 'Verified Results',   desc: 'Results published only after IT Coordinator verification and approval.' },
];

/* ── Types ─────────────────────────────────────────────────── */
interface LiveElection {
  id:     string;
  title:  string;
  status: string;
}

interface LivePosition {
  id:         string;
  title:      string;
  role_group: string;
  gender_scope: string;
  eligibility_scope: string;
}

/* ── Component ─────────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [election,   setElection]   = useState<LiveElection | null>(null);
  const [positions,  setPositions]  = useState<LivePosition[]>([]);
  const [loadingElec, setLoadingElec] = useState(true);

  // Load live election and its positions
  useEffect(() => {
    async function loadLiveData() {
      // Get any active election (open, approved, or published)
      const { data: elections } = await supabase
        .from('elections')
        .select('id, title, status')
        .in('status', ['open', 'approved', 'published'])
        .order('created_at', { ascending: false })
        .limit(1);

      const el = elections?.[0] ?? null;
      setElection(el as LiveElection | null);

      if (el) {
        const { data: posData } = await supabase
          .from('positions')
          .select('id, title, role_group, gender_scope, eligibility_scope')
          .eq('election_id', el.id)
          .order('sort_order');
        setPositions((posData as LivePosition[]) ?? []);
      }

      setLoadingElec(false);
    }
    loadLiveData();
  }, []);

  // Build role groups for the positions section
  const roleGroups = [...new Map(
    positions.map(p => [p.role_group, p])
  ).values()];

  // Status badge config
  const statusBadge = loadingElec
    ? { dot: '#a3d9b0', text: 'Loading…' }
    : election?.status === 'open'
    ? { dot: '#4ade80', text: '🗳 Voting is Open Now' }
    : election?.status === 'approved'
    ? { dot: '#fbbf24', text: 'Election Approved — Voting Opening Soon' }
    : election?.status === 'published'
    ? { dot: '#60a5fa', text: 'Results Published' }
    : { dot: '#a3d9b0', text: 'No Active Election' };

  return (
    <div style={{ backgroundColor: C.creamBg, color: C.textPrimary, fontFamily: "'Inter', ui-sans-serif, sans-serif" }}>

      {/* Skip link */}
      <a href="#main-content" style={{
        position: 'absolute', top: '-60px', left: '16px', zIndex: 9999,
        padding: '10px 18px', background: C.greenPrimary, color: '#fff',
        fontWeight: 700, fontSize: '13px', borderRadius: '0 0 8px 8px',
        textDecoration: 'none', transition: 'top 0.2s',
      }}
        onFocus={e => { e.currentTarget.style.top = '0'; }}
        onBlur={e => { e.currentTarget.style.top = '-60px'; }}
      >Skip to main content</a>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav role="navigation" aria-label="Main navigation" style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: C.greenPrimary,
        boxShadow: '0 2px 12px rgba(15,45,26,0.35)',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          padding: '0 24px', height: '68px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link to="/" aria-label="KAWSEC Home" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <Logo size={42} />
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '17px', letterSpacing: '2.5px' }}>KAWSEC</div>
              <div style={{ color: C.creamCard, fontSize: '10.5px', fontWeight: 500, opacity: 0.85 }}>Nkawkaw Senior High School</div>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            {(['#how-it-works', '#positions'] as const).map((href, i) => (
              <a key={href} href={href} style={{ color: 'rgba(245,240,232,0.8)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.creamCard)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.8)')}
              >{['How It Works', 'Positions'][i]}</a>
            ))}
            <Link to="/results" style={{ color: 'rgba(245,240,232,0.8)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.creamCard)}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.8)')}
            >Results</Link>
            <Link to="/vote" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '8px',
              backgroundColor: C.creamCard, color: C.greenPrimary,
              fontSize: '14px', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(15,45,26,0.2)',
              transition: 'background-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.creamCard)}
            >Cast Your Vote <ChevronRight size={15} /></Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
            className="nav-mobile-btn"
            style={{ display: 'none', background: 'none', border: 'none', color: C.creamCard, padding: '8px', cursor: 'pointer' }}
          >{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div style={{
            backgroundColor: C.greenDark, borderTop: '1px solid rgba(245,240,232,0.1)',
            padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: '18px',
          }}>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} style={{ color: 'rgba(245,240,232,0.85)', fontSize: '15px', textDecoration: 'none' }}>How It Works</a>
            <a href="#positions"    onClick={() => setMenuOpen(false)} style={{ color: 'rgba(245,240,232,0.85)', fontSize: '15px', textDecoration: 'none' }}>Positions</a>
            <Link to="/results"     onClick={() => setMenuOpen(false)} style={{ color: 'rgba(245,240,232,0.85)', fontSize: '15px', textDecoration: 'none' }}>Results</Link>
            <Link to="/vote" onClick={() => setMenuOpen(false)} style={{
              textAlign: 'center', padding: '12px', borderRadius: '8px',
              backgroundColor: C.creamCard, color: C.greenPrimary,
              fontWeight: 700, fontSize: '14px', textDecoration: 'none',
            }}>Cast Your Vote</Link>
          </div>
        )}
      </nav>

      <main id="main-content">

        {/* ── HERO ───────────────────────────────────────────── */}
        <section aria-labelledby="hero-heading" style={{
          background: `linear-gradient(150deg, ${C.greenDark} 0%, ${C.greenPrimary} 55%, #1e5c35 100%)`,
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, opacity: 0.035,
            backgroundImage: 'radial-gradient(circle, #f5f0e8 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />

          <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto', padding: '96px 24px 88px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
              <Logo size={80} />
            </div>

            {/* Live status badge — L-2: role="status" + aria-live */}
            <div
              role="status"
              aria-live="polite"
              aria-label={`Election status: ${statusBadge.text}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 16px', borderRadius: '999px', marginBottom: '28px',
                backgroundColor: 'rgba(245,240,232,0.12)',
                border: '1px solid rgba(245,240,232,0.3)',
                color: C.creamCard, fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px',
              }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: statusBadge.dot, flexShrink: 0 }} aria-hidden="true" />
              {statusBadge.text}
            </div>

            <h1 id="hero-heading" style={{
              fontSize: 'clamp(30px, 5.5vw, 54px)',
              fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: '16px',
            }}>
              {election ? election.title : 'KAWSEC Prefect'}<br />
              <span style={{ color: C.creamCard }}>Elections</span>
            </h1>

            <p style={{ fontSize: '17px', fontWeight: 600, color: C.creamCard, marginBottom: '12px', opacity: 0.95 }}>
              Your Vote. Your Leaders. Your School.
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, maxWidth: '480px', margin: '0 auto 36px' }}>
              A secure, transparent digital election platform for Nkawkaw Senior High School.
              Replace paper ballot boxes with a fast, fair, and verified process.
            </p>

            {/* L-1: Context-sensitive CTA based on election status */}
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {(!election || election.status === 'open' || election.status === 'approved') && (
                <Link to="/vote" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '14px 30px', borderRadius: '10px',
                  backgroundColor: C.creamCard, color: C.greenPrimary,
                  fontSize: '15px', fontWeight: 700, textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(15,45,26,0.4)', transition: 'transform 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.backgroundColor = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = C.creamCard; }}
                >
                  {election?.status === 'approved' ? 'Voting Opening Soon' : 'Cast Your Vote'}
                  <ChevronRight size={17} />
                </Link>
              )}
              {election?.status === 'published' && (
                <Link to="/results" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '14px 30px', borderRadius: '10px',
                  backgroundColor: C.creamCard, color: C.greenPrimary,
                  fontSize: '15px', fontWeight: 700, textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(15,45,26,0.4)', transition: 'transform 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.backgroundColor = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = C.creamCard; }}
                >Results Published — View Results <ChevronRight size={17} /></Link>
              )}
              {!election && !loadingElec && (
                <span style={{ padding: '14px 30px', borderRadius: '10px', backgroundColor: 'rgba(245,240,232,0.15)', color: C.creamCard, fontSize: '15px', fontWeight: 600, border: '2px solid rgba(245,240,232,0.35)' }}>
                  Voting has not started yet
                </span>
              )}

              <Link to="/results" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 30px', borderRadius: '10px',
                border: '2px solid rgba(245,240,232,0.35)', color: C.creamCard,
                fontSize: '15px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >View Results</Link>
            </div>
          </div>
        </section>

        {/* ── HIGHLIGHTS ─────────────────────────────────────── */}
        <section aria-label="Why KAWSEC Voting" style={{ backgroundColor: C.white, padding: '56px 24px' }}>
          <div style={{
            maxWidth: '960px', margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '36px',
          }}>
            {HIGHLIGHTS.map(({ Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  backgroundColor: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }} aria-hidden="true"><Icon size={24} color={C.greenPrimary} /></div>
                <h3 style={{ fontWeight: 700, fontSize: '15px', color: C.textPrimary }}>{title}</h3>
                <p style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────── */}
        <section id="how-it-works" aria-labelledby="how-heading" style={{ backgroundColor: C.creamCard, padding: '72px 24px' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.greenMid, marginBottom: '8px' }}>Simple Process</p>
            <h2 id="how-heading" style={{ textAlign: 'center', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, color: C.greenPrimary, marginBottom: '10px' }}>How It Works</h2>
            <p style={{ textAlign: 'center', fontSize: '14px', color: C.textMuted, maxWidth: '400px', margin: '0 auto 48px', lineHeight: 1.65 }}>
              Vote for your school leaders in four easy steps — no paper, no queues.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {STEPS.map(({ num, Icon, title, desc }) => (
                <div key={num} style={{
                  backgroundColor: C.white, borderRadius: '16px', padding: '28px 20px',
                  border: `1px solid ${C.creamBorder}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                  transition: 'box-shadow 0.2s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(26,77,46,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px', backgroundColor: C.greenPrimary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', flexShrink: 0,
                  }} aria-hidden="true"><Icon size={22} color="#fff" /></div>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.greenMid, marginBottom: '6px' }}>Step {num}</span>
                  <h3 style={{ fontWeight: 700, fontSize: '14px', color: C.textPrimary, marginBottom: '8px' }}>{title}</h3>
                  <p style={{ fontSize: '12px', color: C.textMuted, lineHeight: 1.65 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POSITIONS ──────────────────────────────────────── */}
        <section id="positions" aria-labelledby="positions-heading" style={{ backgroundColor: C.white, padding: '72px 24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.greenMid, marginBottom: '8px' }}>
              {election ? election.title : 'Upcoming Election'}
            </p>
            <h2 id="positions-heading" style={{ textAlign: 'center', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, color: C.greenPrimary, marginBottom: '10px' }}>
              Ballot Positions
            </h2>
            <p style={{ textAlign: 'center', fontSize: '14px', color: C.textMuted, maxWidth: '480px', margin: '0 auto 48px', lineHeight: 1.65 }}>
              {positions.length > 0
                ? `${positions.length} position${positions.length !== 1 ? 's' : ''} across ${roleGroups.length} role${roleGroups.length !== 1 ? 's' : ''} in this election.`
                : 'Positions will be announced when the election is created.'}
            </p>

            {/* L-3: Unified loading state for Positions section */}
            {loadingElec ? (
              <div style={{ textAlign: 'center', padding: '48px', backgroundColor: C.creamCard, borderRadius: '16px', border: `1px solid ${C.creamBorder}` }} aria-busy="true" aria-live="polite">
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} aria-hidden="true" />
                <p style={{ color: C.textMuted, fontSize: '14px' }}>Loading positions…</p>
              </div>
            ) : positions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', backgroundColor: C.creamCard, borderRadius: '16px', border: `1px solid ${C.creamBorder}` }}>
                <p style={{ color: C.textMuted, fontSize: '14px' }}>No positions have been announced yet.</p>
                <p style={{ color: C.textMuted, fontSize: '13px', marginTop: '6px' }}>Check back when the election is set up.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {positions.map(pos => (
                  <div key={pos.id} role="article" aria-label={pos.title}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      backgroundColor: C.creamBg, border: `1px solid ${C.creamBorder}`,
                      borderRadius: '14px', padding: '14px 18px',
                      transition: 'border-color 0.2s, background-color 0.2s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = C.greenMid; el.style.backgroundColor = C.creamCard; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = C.creamBorder; el.style.backgroundColor = C.creamBg; }}
                  >
                    {/* Gender dot */}
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: pos.gender_scope === 'male' ? '#3b82f6' : pos.gender_scope === 'female' ? '#ec4899' : C.greenMid,
                    }} aria-hidden="true" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: C.textPrimary }}>{pos.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted }}>{pos.role_group}</span>
                        <span style={{ fontSize: '11px', color: C.creamBorder }}>·</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '1px 8px', borderRadius: '999px',
                          backgroundColor: pos.gender_scope === 'male' ? '#eff6ff' : pos.gender_scope === 'female' ? '#fdf2f8' : C.greenLight,
                          color: pos.gender_scope === 'male' ? '#1d4ed8' : pos.gender_scope === 'female' ? '#be185d' : C.greenPrimary,
                        }}>
                          {pos.gender_scope === 'male' ? '♂ Male' : pos.gender_scope === 'female' ? '♀ Female' : 'All'}
                        </span>
                        {pos.eligibility_scope === 'house' && (
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', backgroundColor: '#fef9ec', color: '#7a5c00', border: '1px solid #f0d880' }}>
                            House Only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {positions.length > 0 && (
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: C.textMuted }}>
                Total: <strong style={{ color: C.greenPrimary }}>{positions.length} ballot position{positions.length !== 1 ? 's' : ''}</strong> across {roleGroups.length} role{roleGroups.length !== 1 ? 's' : ''}.
              </p>
            )}
            {positions.length > 0 && (
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textMuted }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }} aria-hidden="true" /> ♂ Male only
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textMuted }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ec4899', display: 'inline-block' }} aria-hidden="true" /> ♀ Female only
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textMuted }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: C.greenMid, display: 'inline-block' }} aria-hidden="true" /> All genders
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section aria-label="Call to action" style={{
          background: `linear-gradient(135deg, ${C.greenPrimary} 0%, ${C.greenDark} 100%)`,
          padding: '72px 24px', textAlign: 'center', color: '#fff',
        }}>
          <div style={{ maxWidth: '540px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><Logo size={52} /></div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, marginBottom: '12px' }}>Ready to Cast Your Vote?</h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, marginBottom: '32px' }}>
              Have your student ID ready. The entire process takes less than 2 minutes.
            </p>
            <Link to="/vote" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 32px', borderRadius: '10px',
              backgroundColor: C.creamCard, color: C.greenPrimary,
              fontSize: '15px', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(15,45,26,0.4)',
            }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.creamCard; }}
            >Start Voting Now <ChevronRight size={17} /></Link>
          </div>
        </section>

      </main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer role="contentinfo" style={{ backgroundColor: C.greenDark, color: '#fff', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <Logo size={40} />
          <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '2.5px', marginTop: '10px' }}>KAWSEC</div>
          <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.55)' }}>Nkawkaw Senior High School</div>
          <div style={{ fontSize: '12px', color: C.creamCard, opacity: 0.7 }}>Powered by KAWSEC IT Department</div>
          <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)', marginTop: '8px' }}>© {new Date().getFullYear()} KAWSEC Voting System. All rights reserved.</div>
        </div>
      </footer>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes spin { to { transform: rotate(360deg); } }
        }
        @media (max-width: 767px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
        @media (min-width: 768px) {
          .nav-mobile-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
