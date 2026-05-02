import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../ui/Toast';

export default function TopNav() {
  const { theme, setTheme } = useSettingsStore();
  const { user, isAuthenticated, setShowLoginModal, logout } = useAuthStore();
  const { toast } = useToast();

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 text-text-primary hover:opacity-80 transition-opacity">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="10" cy="10" r="7" fill="#FF6B35" opacity="0.9" />
          <circle cx="18" cy="10" r="7" fill="#4ECDC4" opacity="0.8" />
          <circle cx="14" cy="17" r="7" fill="#6366f1" opacity="0.7" />
        </svg>
        <span className="font-semibold text-lg">Control-Color</span>
      </Link>

      <nav className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-ghost p-2"
          aria-label={theme === 'dark' ? '切换亮色主题' : '切换暗色主题'}
        >
          {theme === 'dark' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {isAuthenticated && user ? (
          <>
            <Link to="/profile" className="btn-ghost p-2 flex items-center gap-1.5" aria-label="个人中心">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-text-secondary hidden sm:inline">{user.displayName}</span>
            </Link>
            <button
              onClick={() => { logout(); toast('已退出登录', 'info'); }}
              className="btn-ghost text-xs text-text-muted hover:text-text-primary"
              title="退出登录"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </>
        ) : (
          <button onClick={() => setShowLoginModal(true)} className="btn-ghost text-sm">
            登录
          </button>
        )}
      </nav>
    </header>
  );
}
