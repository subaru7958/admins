import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import SidebarLayout from './components/SidebarLayout.jsx'
import HomePage from './components/HomePage.jsx'
import LoginPage from './components/LoginPage.jsx'
import RegistrationPage from './components/RegistrationPage.jsx'
import DashboardPage from './components/DashboardPage.jsx'
import CoachesListPage from './components/CoachesListPage.jsx'
import PlayersListPage from './components/PlayersListPage.jsx'
import EventsPage from './components/EventsPage.jsx'
import CoachDashboard from './components/CoachDashboard.jsx'
import PlayerDashboard from './components/PlayerDashboard.jsx'
import SessionManagementPage from './components/SessionManagementPage.jsx'
import SessionsPage from './components/SessionsPage.jsx'
import PaymentSchedulePage from './components/PaymentSchedulePage.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import TrainingPlansPage from './components/TrainingPlansPage.jsx'
import TrainingSchedulePage from './components/TrainingSchedulePage.jsx'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={
          <>
            <Header />
            <HomePage />
          </>
        } />
        <Route path="/login" element={
          <>
            <Header />
            <LoginPage />
          </>
        } />
        <Route path="/register" element={
          <>
            <Header />
            <RegistrationPage />
          </>
        } />
        <Route path="/dashboard/*" element={<SidebarLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="coaches" element={<CoachesListPage />} />
          <Route path="players" element={<PlayersListPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/:sessionId/schedule" element={<PaymentSchedulePage />} />
          <Route path="session-management" element={<SessionManagementPage />} />
          <Route path="session-management/:sessionId" element={<SessionManagementPage />} />
          <Route path="training-plans" element={<TrainingPlansPage />} />
          <Route path="training-schedule" element={<TrainingSchedulePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/coach-dashboard" element={<CoachDashboard />} />
        <Route path="/player-dashboard" element={<PlayerDashboard />} />
      </Routes>
    </div>
  )
}

export default App
