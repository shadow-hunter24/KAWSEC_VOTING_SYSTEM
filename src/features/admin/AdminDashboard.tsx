import { Link } from 'react-router-dom';
import { Users, Settings, FileText, BarChart2, LogIn } from 'lucide-react';

const PRIMARY = '#1a4d2e';
const GOLD = '#d4a017';

const cards = [
  {
    icon: <BarChart2 size={28} />,
    title: 'Turnout Monitoring',
    desc: 'Track live voter participation rates and real-time turnout statistics across all houses and classes.',
    phase: 'Phase 5',
  },
  {
    icon: <Users size={28} />,
    title: 'Candidate Management',
    desc: 'Review, approve, or reject candidate applications. Manage photos and manifestos.',
    phase: 'Phase 3',
  },
  {
    icon: <Settings size={28} />,
    title: 'Election Settings',
    desc: 'Configure election schedules, positions, and eligibility rules for each voting cycle.',
    phase: 'Phase 5',
  },
  {
    icon: <FileText size={28} />,
    title: 'Audit Logs',
    desc: 'Full audit trail of all system activities, logins, and administrative actions.',
    phase: 'Phase 5',
  },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f7f2' }}>
      {/* Header */}
      <header className="py-6 px-6 shadow-md text-white" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm opacity-70 mt-0.5">KAWSEC Elections — Nkawkaw Senior High School</p>
          </div>
          <div
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: GOLD, color: '#1a1a1a' }}
            aria-label="IT Coordinator panel"
          >
            IT Coordinator
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-gray-500 mb-8 text-sm">
          Select a module below. Features will be activated as each phase is implemented.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map(card => (
            <div
              key={card.title}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              role="article"
              aria-label={`${card.title} — ${card.phase}`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                style={{ backgroundColor: PRIMARY }}
                aria-hidden="true"
              >
                {card.icon}
              </div>
              <h2 className="font-bold text-gray-800 mb-1">{card.title}</h2>
              <p className="text-sm text-gray-500 mb-4">{card.desc}</p>
              <span
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: '#f0f7f2', color: PRIMARY }}
              >
                Coming Soon · {card.phase}
              </span>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl border transition-colors hover:bg-white"
            style={{ color: PRIMARY, borderColor: PRIMARY }}
            aria-label="Sign out and return to home"
          >
            <LogIn size={16} aria-hidden="true" />
            Sign Out
          </Link>
        </div>
      </main>
    </div>
  );
}
