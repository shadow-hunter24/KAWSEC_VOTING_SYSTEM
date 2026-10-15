import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider }         from '../contexts/AuthContext';
import { VotingSessionProvider } from '../contexts/VotingSessionContext';
import ProtectedRoute           from '../components/ProtectedRoute';
import LandingPage              from '../features/landing/LandingPage';
import StudentLogin             from '../features/auth/StudentLogin';
import BallotFlow               from '../features/voting/BallotFlow';
import BallotReview             from '../features/voting/BallotReview';
import BallotComplete           from '../features/voting/BallotComplete';
import ResultsPage              from '../features/results/ResultsPage';
import ITCoordinatorLogin       from '../features/admin/ITCoordinatorLogin';
import AdminDashboard           from '../features/admin/AdminDashboard';
import AuditLog                 from '../features/admin/AuditLog';
import StudentImport            from '../features/students/StudentImport';
import CandidateManagement      from '../features/candidates/CandidateManagement';
import ElectionSettings         from '../features/elections/ElectionSettings';
import TurnoutDashboard         from '../features/elections/TurnoutDashboard';
import TallyAndPublish          from '../features/elections/TallyAndPublish';
import ClassMonitor             from '../features/elections/ClassMonitor';

function Guarded({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function Router() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* VotingSessionProvider needs to be inside BrowserRouter (uses useNavigate) */}
        <VotingSessionProvider>
          <Routes>
            {/* ── Public ───────────────────────────────────── */}
            <Route path="/"              element={<LandingPage />} />
            <Route path="/results"       element={<ResultsPage />} />

            {/* ── Student voting flow ──────────────────────── */}
            <Route path="/vote"          element={<StudentLogin />} />
            <Route path="/vote/ballot"   element={<BallotFlow />} />
            <Route path="/vote/review"   element={<BallotReview />} />
            <Route path="/vote/complete" element={<BallotComplete />} />

            {/* ── Admin login ───────────────────────────────── */}
            <Route path="/admin"         element={<ITCoordinatorLogin />} />
            <Route path="/admin/login"   element={<ITCoordinatorLogin />} />

            {/* ── Protected admin pages ────────────────────── */}
            <Route path="/admin/dashboard"         element={<Guarded><AdminDashboard /></Guarded>} />
            <Route path="/admin/students/import"   element={<Guarded><StudentImport /></Guarded>} />
            <Route path="/admin/candidates"        element={<Guarded><CandidateManagement /></Guarded>} />
            <Route path="/admin/elections"         element={<Guarded><ElectionSettings /></Guarded>} />
            <Route path="/admin/turnout"           element={<Guarded><TurnoutDashboard /></Guarded>} />
            <Route path="/admin/classes"           element={<Guarded><ClassMonitor /></Guarded>} />
            <Route path="/admin/tally/:electionId" element={<Guarded><TallyAndPublish /></Guarded>} />
            <Route path="/admin/audit"             element={<Guarded><AuditLog /></Guarded>} />
          </Routes>
        </VotingSessionProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
