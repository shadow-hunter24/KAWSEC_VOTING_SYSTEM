// ============================================================
// ProtectedRoute — redirects unauthenticated users to /admin
// ============================================================
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fffdf7',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid #e8e0cc', borderTopColor: '#1a4d2e',
          animation: 'spin 0.8s linear infinite',
        }} aria-label="Loading…" role="status" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
