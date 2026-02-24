import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import { createUser, listUsers } from './services/api';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import SessionPage from './pages/SessionPage';
import ViewerPage from './pages/ViewerPage';
import WebcamPage from './pages/WebcamPage';

export default function App() {
  const setUserId = useAppStore((s) => s.setUserId);

  // Ensure a stub user exists on first load
  useEffect(() => {
    async function initUser() {
      try {
        const users = await listUsers();
        if (users.length > 0) {
          setUserId(users[0].id);
        } else {
          const user = await createUser('demo@kinstretch.app', 'Demo User');
          setUserId(user.id);
        }
      } catch {
        // Backend might not be running yet
        console.warn('Could not connect to backend');
      }
    }
    initUser();
  }, [setUserId]);

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/viewer/:videoId" element={<ViewerPage />} />
        <Route path="/webcam" element={<WebcamPage />} />
      </Routes>
    </AppShell>
  );
}
