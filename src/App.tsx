import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { ToastProvider } from './components/ui/Toast';
import { ContextMenuProvider } from './components/ui/ContextMenu';
import WorkspaceGuide from './components/ui/WorkspaceGuide';
import LoginModal from './components/auth/LoginModal';

export default function App() {
  return (
    <ToastProvider>
      <ContextMenuProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/collections" element={<ProfilePage />} />
          <Route path="/profile/settings" element={<ProfilePage />} />
        </Route>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Routes>
      <WorkspaceGuide />
        <LoginModal />
      </ContextMenuProvider>
    </ToastProvider>
  );
}
