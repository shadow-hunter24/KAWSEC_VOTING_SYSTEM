import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const PRIMARY = '#1a4d2e';
const GOLD = '#d4a017';

export default function ITCoordinatorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/admin/dashboard');
    }, 1000);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #0f1d14 0%, #1a2e1e 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Dark header */}
          <div className="px-8 py-7 text-white text-center" style={{ backgroundColor: '#0f1d14' }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: PRIMARY, border: `2px solid ${GOLD}` }}
              aria-hidden="true"
            >
              <ShieldCheck size={26} />
            </div>
            <h1 className="font-bold text-lg">IT Coordinator Access</h1>
            <p className="text-xs mt-1 opacity-60">KAWSEC Election Management System</p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div
                role="alert"
                className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="email-input"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: PRIMARY }}
                >
                  Email Address
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="coordinator@kawsec.edu.gh"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 transition"
                  aria-label="Email address"
                  autoFocus
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="password-input"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: PRIMARY }}
                >
                  Password
                </label>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 transition"
                  aria-label="Password"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: PRIMARY }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link
                to="/"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
