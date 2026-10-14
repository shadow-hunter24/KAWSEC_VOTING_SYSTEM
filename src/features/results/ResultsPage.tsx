import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

const PRIMARY = '#1a4d2e';
const GOLD = '#d4a017';

interface MockCandidate {
  name: string;
  votes: number;
}

interface MockResult {
  position: string;
  candidates: [MockCandidate, MockCandidate];
}

const mockResults: MockResult[] = [
  {
    position: 'Head Boy (School Prefect — Male)',
    candidates: [
      { name: 'Kwame Asante', votes: 45 },
      { name: 'Kofi Mensah', votes: 32 },
    ],
  },
  {
    position: 'Head Girl (School Prefect — Female)',
    candidates: [
      { name: 'Abena Owusu', votes: 51 },
      { name: 'Ama Boateng', votes: 28 },
    ],
  },
  {
    position: 'Sports Prefect (Male)',
    candidates: [
      { name: 'Yaw Darko', votes: 38 },
      { name: 'Kwabena Frimpong', votes: 35 },
    ],
  },
];

function ResultCard({ result }: { result: MockResult }) {
  const total = result.candidates.reduce((sum, c) => sum + c.votes, 0);
  const winner = result.candidates[0];
  const runner = result.candidates[1];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <h3 className="font-bold text-gray-700 text-sm mb-4">{result.position}</h3>

      {/* Winner */}
      <div
        className="rounded-xl p-4 mb-3"
        style={{ backgroundColor: '#f0f7f2', border: `1px solid ${PRIMARY}22` }}
        aria-label={`Winner: ${winner.name}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy size={16} style={{ color: GOLD }} aria-hidden="true" />
            <span className="font-bold text-sm" style={{ color: PRIMARY }}>{winner.name}</span>
          </div>
          <span className="text-sm font-bold" style={{ color: PRIMARY }}>{winner.votes} votes</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-gray-200">
          <div
            className="h-full rounded-full"
            style={{ width: `${(winner.votes / total) * 100}%`, backgroundColor: PRIMARY }}
            role="progressbar"
            aria-valuenow={winner.votes}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`${winner.name}: ${winner.votes} of ${total} votes`}
          />
        </div>
      </div>

      {/* Runner-up */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#f9fafb' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{runner.name}</span>
          <span className="text-sm text-gray-500">{runner.votes} votes</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-gray-200">
          <div
            className="h-full rounded-full bg-gray-400"
            style={{ width: `${(runner.votes / total) * 100}%` }}
            role="progressbar"
            aria-valuenow={runner.votes}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`${runner.name}: ${runner.votes} of ${total} votes`}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-right">{total} total votes cast</p>
    </div>
  );
}

export default function ResultsPage() {
  const published = false; // Toggle to true when live results exist

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f7f2' }}>
      {/* Header */}
      <header className="py-6 px-6 shadow-md text-white" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Election Results</h1>
            <p className="text-sm opacity-70 mt-0.5">KAWSEC Prefect Elections · Nkawkaw Senior High School</p>
          </div>
          <Link to="/" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {!published ? (
          /* Not yet published */
          <div className="text-center py-16">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-white"
              style={{ backgroundColor: PRIMARY }}
              aria-hidden="true"
            >
              <Trophy size={36} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: PRIMARY }}>
              Results Not Yet Published
            </h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              Results will appear here once the IT Coordinator reviews, verifies, and officially publishes them.
            </p>
          </div>
        ) : null}

        {/* Demo results section */}
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-bold text-lg" style={{ color: PRIMARY }}>Demo Results</h2>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: GOLD, color: '#1a1a1a' }}
            >
              Demo Data
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockResults.map(r => (
              <ResultCard key={r.position} result={r} />
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-6 text-center italic">
            Demo data — replace with live results when the IT Coordinator publishes them.
          </p>
        </div>
      </main>
    </div>
  );
}
