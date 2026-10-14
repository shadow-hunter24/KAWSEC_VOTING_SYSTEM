import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage          from '../features/landing/LandingPage';
import StudentLogin         from '../features/auth/StudentLogin';
import BallotFlow           from '../features/voting/BallotFlow';
import BallotReview         from '../features/voting/BallotReview';
import BallotComplete       from '../features/voting/BallotComplete';
import ResultsPage          from '../features/results/ResultsPage';
import ITCoordinatorLogin   from '../features/admin/ITCoordinatorLogin';
import AdminDashboard       from '../features/admin/AdminDashboard';
import AuditLog             from '../features/admin/AuditLog';
import StudentImport        from '../features/students/StudentImport';
import CandidateManagement  from '../features/candidates/CandidateManagement';
import ElectionSettings     from '../features/elections/ElectionSettings';
import TurnoutDashboard     from '../features/elections/TurnoutDashboard';
import TallyAndPublish      from '../features/elections/TallyAndPublish';

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ───────────────────────────────────────── */}
        <Route path="/"               element={<LandingPage />} />
        <Route path="/results"        element={<ResultsPage />} />

        {/* ── Student voting flow ───────────────────────────── */}
        <Route path="/vote"           element={<StudentLogin />} />
        <Route path="/vote/ballot"    element={<BallotFlow />} />
        <Route path="/vote/review"    element={<BallotReview />} />
        <Route path="/vote/complete"  element={<BallotComplete />} />

        {/* ── Admin ─────────────────────────────────────────── */}
        <Route path="/admin"                       element={<ITCoordinatorLogin />} />
        <Route path="/admin/dashboard"             element={<AdminDashboard />} />
        <Route path="/admin/students/import"       element={<StudentImport />} />
        <Route path="/admin/candidates"            element={<CandidateManagement />} />
        <Route path="/admin/elections"             element={<ElectionSettings />} />
        <Route path="/admin/turnout"               element={<TurnoutDashboard />} />
        <Route path="/admin/tally/:electionId"     element={<TallyAndPublish />} />
        <Route path="/admin/audit"                 element={<AuditLog />} />
      </Routes>
    </BrowserRouter>
  );
}
