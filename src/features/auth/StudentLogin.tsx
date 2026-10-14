import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, LogIn } from 'lucide-react';

const PRIMARY = '#1a4d2e';
const GOLD = '#d4a017';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'id' | 'credential'>('id');
  const [studentId, setStudentId] = useState('');
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) {
      setError('Please enter your Student ID.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('credential');
    }, 1000);
  }

  function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!credential.trim()) {
      setError('Please enter your voting credential.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/vote/ballot');
    }, 1000);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #0d2818 100%)` }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center" style={{ borderBottom: `3px solid ${GOLD}` }}>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white"
              style={{ backgroundColor: PRIMARY }}
              aria-hidden="true"
            >
              <LogIn size={28} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: PRIMARY }}>KAWSEC Voting System</h1>
            <p className="text-xs text-gray-400 mt-1">Nkawkaw Senior High School</p>
          </div>

          <div className="px-8 py-8">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3 mb-6" aria-label="Authentication steps">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: PRIMARY }}
                aria-current={step === 'id' ? 'step' : undefined}
              >
                1
              </div>
              <div className="h-px w-10 bg-gray-200" aria-hidden="true" />
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: step === 'credential' ? PRIMARY : '#e5e7eb',
                  color: step === 'credential' ? 'white' : '#9ca3af',
                }}
                aria-current={step === 'credential' ? 'step' : undefined}
              >
                2
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
              >
                {error}
              </div>
            )}

            {/* Step 1: Student ID */}
            {step === 'id' && (
              <form onSubmit={handleIdSubmit} noValidate>
                <h2 className="text-lg font-bold mb-1" style={{ color: PRIMARY }}>Enter Your Student ID</h2>
                <p className="text-sm text-gray-500 mb-5">Identify yourself to proceed to voting.</p>

                <div className="mb-5">
                  <label
                    htmlFor="student-id-input"
                    className="block text-sm font-semibold mb-1"
                    style={{ color: PRIMARY }}
                  >
                    Student ID
                  </label>
                  <input
                    id="student-id-input"
                    type="text"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="e.g. KAWSEC/2024/001"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 transition"
                    style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                    aria-describedby="student-id-hint"
                    autoFocus
                    autoComplete="off"
                    disabled={loading}
                  />
                  <p id="student-id-hint" className="text-xs text-gray-400 mt-1.5">
                    Your Student ID is printed on your school ID card.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {loading ? 'Verifying...' : (<>Continue <ChevronRight size={18} /></>)}
                </button>
              </form>
            )}

            {/* Step 2: Credential */}
            {step === 'credential' && (
              <form onSubmit={handleCredentialSubmit} noValidate>
                <h2 className="text-lg font-bold mb-1" style={{ color: PRIMARY }}>Enter Your Voting Credential</h2>
                <div
                  className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#f0f7f2', color: PRIMARY }}
                  aria-live="polite"
                >
                  <span className="text-xs font-medium">Voting as:</span>
                  <span className="font-bold">{studentId}</span>
                </div>

                <div className="mb-5">
                  <label
                    htmlFor="credential-input"
                    className="block text-sm font-semibold mb-1"
                    style={{ color: PRIMARY }}
                  >
                    Voting Credential
                  </label>
                  <input
                    id="credential-input"
                    type="password"
                    value={credential}
                    onChange={e => setCredential(e.target.value)}
                    placeholder="Enter your credential"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 transition"
                    style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
                    aria-describedby="credential-hint"
                    autoFocus
                    disabled={loading}
                  />
                  <p id="credential-hint" className="text-xs text-gray-400 mt-1.5">
                    Your credential was issued by your class teacher.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {loading ? 'Authenticating...' : (<>Access Ballot <ChevronRight size={18} /></>)}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('id'); setError(''); setCredential(''); }}
                  className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Back to Student ID
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center text-white text-sm mt-6 opacity-70">
          <Link to="/" className="hover:opacity-100 transition-opacity">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
