import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

const C = {
  greenPrimary: '#1a4d2e',
  greenLight:   '#e8f5ee',
  creamBg:      '#fffdf7',
  creamCard:    '#f5f0e8',
  creamBorder:  '#e8e0cc',
  textMuted:    '#5a5a4a',
};

interface MockCandidate { name: string; votes: number; }
interface MockResult    { position: string; candidates: [MockCandidate, MockCandidate]; }

const mockResults: MockResult[] = [
  { position: 'Head Boy — School Prefect (Male)',   candidates: [{ name: 'Kwame Asante',      votes: 45 }, { name: 'Kofi Mensah',       votes: 32 }] },
  { position: 'Head Girl — School Prefect (Female)',candidates: [{ name: 'Abena Owusu',       votes: 51 }, { name: 'Ama Boateng',       votes: 28 }] },
  { position: 'Sports Prefect (Male)',              candidates: [{ name: 'Yaw Darko',         votes: 38 }, { name: 'Kwabena Frimpong',  votes: 35 }] },
];

function ResultCard({ result }: { result: MockResult }) {
  const total  = result.candidates.reduce((s, c) => s + c.votes, 0);
  const winner = result.candidates[0];
  const runner = result.candidates[1];

  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '16px', padding: '22px',
      border: `1px solid ${C.creamBorder}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <h3 style={{ fontWeight: 700, fontSize: '13px', color: C.textMuted, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {result.position}
      </h3>

      {/* Winner */}
      <div style={{
        borderRadius: '12px', padding: '14px 16px', marginBottom: '10px',
        backgroundColor: C.greenLight, border: `1px solid ${C.greenPrimary}22`,
      }} aria-label={`Winner: ${winner.name}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={15} color={C.greenPrimary} aria-hidden="true" />
            <span style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary }}>{winner.name}</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: '13px', color: C.greenPrimary }}>{winner.votes} votes</span>
        </div>
        <div style={{ height: '6px', borderRadius: '999px', backgroundColor: '#c8e6d0', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '999px', backgroundColor: C.greenPrimary, width: `${(winner.votes / total) * 100}%` }}
            role="progressbar" aria-valuenow={winner.votes} aria-valuemin={0} aria-valuemax={total}
            aria-label={`${winner.name}: ${winner.votes} of ${total} votes`} />
        </div>
      </div>

      {/* Runner-up */}
      <div style={{ borderRadius: '12px', padding: '14px 16px', backgroundColor: C.creamCard }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: C.textMuted }}>{runner.name}</span>
          <span style={{ fontSize: '13px', color: C.textMuted }}>{runner.votes} votes</span>
        </div>
        <div style={{ height: '6px', borderRadius: '999px', backgroundColor: C.creamBorder, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '999px', backgroundColor: '#a3b89c', width: `${(runner.votes / total) * 100}%` }}
            role="progressbar" aria-valuenow={runner.votes} aria-valuemin={0} aria-valuemax={total}
            aria-label={`${runner.name}: ${runner.votes} of ${total} votes`} />
        </div>
      </div>

      <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '10px', textAlign: 'right' }}>{total} votes cast</p>
    </div>
  );
}

export default function ResultsPage() {
  const published = false;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Election Results</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>KAWSEC Prefect Elections · Nkawkaw Senior High School</p>
            </div>
          </div>
          <Link to="/" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,240,232,0.7)'; }}
          >← Back to Home</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px' }}>

        {!published && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', backgroundColor: C.greenLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }} aria-hidden="true"><Trophy size={32} color={C.greenPrimary} /></div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.greenPrimary, marginBottom: '10px' }}>Results Not Yet Published</h2>
            <p style={{ fontSize: '14px', color: C.textMuted, maxWidth: '380px', margin: '0 auto', lineHeight: 1.65 }}>
              Results will appear here once the IT Coordinator reviews, verifies, and officially publishes them.
            </p>
          </div>
        )}

        {/* Demo section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '18px', color: C.greenPrimary }}>Demo Results</h2>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
              backgroundColor: C.creamCard, color: C.textMuted, border: `1px solid ${C.creamBorder}`,
            }}>Demo Data</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {mockResults.map(r => <ResultCard key={r.position} result={r} />)}
          </div>
          <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '24px', textAlign: 'center', fontStyle: 'italic' }}>
            Demo data — replaced with live results when the IT Coordinator publishes them.
          </p>
        </div>
      </main>
    </div>
  );
}
