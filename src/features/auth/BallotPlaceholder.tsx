import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const PRIMARY = '#1a4d2e';
const GOLD = '#d4a017';

export default function BallotPlaceholder() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #0d2818 100%)` }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-white"
            style={{ backgroundColor: PRIMARY }}
            aria-hidden="true"
          >
            <CheckCircle size={32} />
          </div>

          <h1 className="text-2xl font-bold mb-2" style={{ color: PRIMARY }}>
            Ballot — Coming in Phase 4
          </h1>

          <div
            className="mx-auto mb-5 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#f0f7f2', color: PRIMARY, border: `1px solid ${PRIMARY}22` }}
            role="status"
            aria-live="polite"
          >
            Authenticated successfully.
          </div>

          <p className="text-gray-500 text-sm mb-8">
            Ballot voting flow will be implemented in Phase 4. The full position-by-position
            voting interface is coming soon.
          </p>

          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-8"
            style={{ backgroundColor: GOLD, color: '#1a1a1a' }}
          >
            Phase 4 — Ballot Voting
          </span>

          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: PRIMARY }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
