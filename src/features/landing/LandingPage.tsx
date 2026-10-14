import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Menu, X, Users, Vote, CheckCircle, BarChart2 } from 'lucide-react';

const PRIMARY = '#1a4d2e';
const GOLD = '#d4a017';

const positions = [
  { role: 'School Prefect', icon: '🎓' },
  { role: 'Compound Prefect', icon: '🏫' },
  { role: 'Sports Prefect', icon: '⚽' },
  { role: 'House Captain', icon: '🏠', houseOnly: true },
  { role: 'School Chaplain', icon: '✝️' },
  { role: 'Entertainment Prefect', icon: '🎭' },
  { role: 'Dining Hall Prefect', icon: '🍽️' },
];

const steps = [
  { num: 1, title: 'Enter Student ID', desc: 'Use the student ID printed on your school ID card to identify yourself.', icon: <Users size={28} /> },
  { num: 2, title: 'Get Credential', desc: 'A unique voting credential is automatically generated and verified for you.', icon: <CheckCircle size={28} /> },
  { num: 3, title: 'Cast Your Vote', desc: 'Vote for each position one by one. Your vote is secret and secure.', icon: <Vote size={28} /> },
  { num: 4, title: 'Results Published', desc: 'The IT Coordinator reviews, verifies, and officially publishes results.', icon: <BarChart2 size={28} /> },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8faf9' }}>
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 shadow-md"
        style={{ backgroundColor: PRIMARY }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex flex-col leading-tight" aria-label="KAWSEC Home">
            <span className="text-white font-bold text-xl tracking-wide">KAWSEC</span>
            <span className="text-xs" style={{ color: GOLD }}>Nkawkaw Senior High School</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-white text-sm hover:opacity-80 transition-opacity">How It Works</a>
            <a href="#positions" className="text-white text-sm hover:opacity-80 transition-opacity">Positions</a>
            <Link to="/results" className="text-white text-sm hover:opacity-80 transition-opacity">Results</Link>
            <Link
              to="/vote"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: '#1a1a1a' }}
            >
              Cast Your Vote
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-3" style={{ backgroundColor: PRIMARY }}>
            <a href="#how-it-works" className="text-white text-sm py-1" onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="#positions" className="text-white text-sm py-1" onClick={() => setMenuOpen(false)}>Positions</a>
            <Link to="/results" className="text-white text-sm py-1" onClick={() => setMenuOpen(false)}>Results</Link>
            <Link
              to="/vote"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-center"
              style={{ backgroundColor: GOLD, color: '#1a1a1a' }}
              onClick={() => setMenuOpen(false)}
            >
              Cast Your Vote
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section
        className="text-white py-20 px-4 text-center"
        style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #0d2818 100%)` }}
        aria-labelledby="hero-heading"
      >
        <div className="max-w-3xl mx-auto">
          {/* Status badge */}
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ backgroundColor: GOLD, color: '#1a1a1a' }}
            aria-label="Election status: Demo Mode"
          >
            📢 Demo Mode
          </span>

          <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            KAWSEC Prefect Elections
          </h1>
          <p className="text-lg md:text-xl font-semibold mb-4" style={{ color: GOLD }}>
            Your Vote. Your Leaders. Your School.
          </p>
          <p className="text-base md:text-lg opacity-80 mb-8 max-w-xl mx-auto">
            A secure, transparent, and modern digital election system for Nkawkaw Senior High School.
            Every student's voice matters in shaping school leadership.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/vote"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: '#1a1a1a' }}
            >
              Cast Your Vote <ChevronRight size={18} />
            </Link>
            <Link
              to="/results"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 border-white text-white hover:bg-white transition-colors"
              style={{ '--tw-text-opacity': '1' } as React.CSSProperties}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = PRIMARY;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'white';
              }}
            >
              View Results
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4 bg-white" aria-labelledby="how-heading">
        <div className="max-w-5xl mx-auto">
          <h2 id="how-heading" className="text-2xl md:text-3xl font-bold text-center mb-2" style={{ color: PRIMARY }}>
            How It Works
          </h2>
          <p className="text-center text-gray-500 mb-10">Vote in four simple steps</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(step => (
              <div
                key={step.num}
                className="rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white"
                  style={{ backgroundColor: PRIMARY }}
                  aria-hidden="true"
                >
                  {step.icon}
                </div>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: GOLD }}
                >
                  Step {step.num}
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positions Grid */}
      <section id="positions" className="py-16 px-4" style={{ backgroundColor: '#f0f7f2' }} aria-labelledby="positions-heading">
        <div className="max-w-6xl mx-auto">
          <h2 id="positions-heading" className="text-2xl md:text-3xl font-bold text-center mb-2" style={{ color: PRIMARY }}>
            Prefect Positions
          </h2>
          <p className="text-center text-gray-500 mb-10">
            All positions have both Male and Female roles. House Captains are elected by house members only.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {positions.flatMap(pos => ['Male', 'Female'].map(gender => (
              <div
                key={`${pos.role}-${gender}`}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                role="article"
                aria-label={`${gender} ${pos.role}`}
              >
                <div className="text-2xl mb-3" aria-hidden="true">{pos.icon}</div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">{pos.role}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: gender === 'Male' ? '#dbeafe' : '#fce7f3',
                      color: gender === 'Male' ? '#1d4ed8' : '#be185d',
                    }}
                    aria-label={`Gender: ${gender}`}
                  >
                    {gender === 'Male' ? '♂ Male' : '♀ Female'}
                  </span>
                  {pos.houseOnly && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      House Only
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 italic">Candidates TBA</p>
              </div>
            )))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-10 px-4 text-center text-white"
        style={{ backgroundColor: PRIMARY }}
        role="contentinfo"
      >
        <div className="max-w-2xl mx-auto">
          <div className="font-bold text-lg mb-1">KAWSEC Voting System</div>
          <div className="text-sm opacity-80 mb-1">Nkawkaw Senior High School</div>
          <div className="text-sm mb-4" style={{ color: GOLD }}>Powered by KAWSEC IT Department</div>
          <div className="text-xs opacity-60">© 2026 KAWSEC. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
