import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import RegistrationPage from './components/RegistrationPage';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import PlayerDashboard from './components/PlayerDashboard';
import CoachDashboard from './components/CoachDashboard';
import PlayersCreateModal from './components/PlayersCreateModal';
import SidebarLayout from './components/SidebarLayout';
import PlayersListPage from './components/PlayersListPage';
import CoachesListPage from './components/CoachesListPage';
import TrainingPlansPage from './components/TrainingPlansPage';
import EventsPage from './components/EventsPage';
import SessionsPage from './components/SessionsPage';
import SessionManagementPage from './components/SessionManagementPage';
import TrainingSchedulePage from './components/TrainingSchedulePage';
import SettingsPage from './components/SettingsPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/player-dashboard" element={<PlayerDashboard />} />
          <Route path="/coach-dashboard" element={<CoachDashboard />} />
          <Route element={<SidebarLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/players" element={<PlayersListPage />} />
            <Route path="/coaches" element={<CoachesListPage />} />
            <Route path="/training-plans" element={<TrainingPlansPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:sessionId/manage" element={<SessionManagementPage />} />
            <Route path="/sessions/:sessionId/schedule" element={<TrainingSchedulePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;