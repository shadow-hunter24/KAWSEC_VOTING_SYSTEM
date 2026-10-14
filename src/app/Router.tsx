import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '../features/landing/LandingPage';
import StudentLogin from '../features/auth/StudentLogin';
import BallotPlaceholder from '../features/auth/BallotPlaceholder';
import ITCoordinatorLogin from '../features/admin/ITCoordinatorLogin';
import AdminDashboard from '../features/admin/AdminDashboard';
import ResultsPage from '../features/results/ResultsPage';

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/vote" element={<StudentLogin />} />
        <Route path="/vote/ballot" element={<BallotPlaceholder />} />
        <Route path="/admin" element={<ITCoordinatorLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
