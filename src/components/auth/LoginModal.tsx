import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../ui/Toast';

type Tab = 'login' | 'register' | 'reset';

export default function LoginModal() {
  const { showLoginModal, setShowLoginModal, login, register, socialLogin, resetPassword, consumePendingAction } = useAuthStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (showLoginModal) {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setError('');
      setSuccess('');
      setTab('login');
    }
  }, [showLoginModal]);

  if (!showLoginModal) return null;

  const handleLogin = () => {
    setError('');
    if (!email.trim() || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    const result = login(email.trim(), password);
    if (result.success) {
      toast('登录成功', 'success');
      const action = consumePendingAction();
      if (action) toast(action, 'info');
    } else {
      setError(result.error || '登录失败');
    }
  };

  const handleRegister = () => {
    setError('');
    if (!email.trim() || !password || !displayName.trim()) {
      setError('请填写所有字段');
      return;
    }
    if (!email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }
    const result = register(email.trim(), password, displayName.trim());
    if (result.success) {
      toast('注册成功', 'success');
      const action = consumePendingAction();
      if (action) toast(action, 'info');
    } else {
      setError(result.error || '注册失败');
    }
  };

  const handleReset = () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('请输入邮箱地址');
      return;
    }
    const result = resetPassword(email.trim());
    if (result.success) {
      setSuccess('重置邮件已发送（演示模式：实际需接入邮件服务）');
    } else {
      setError(result.error || '发送失败');
    }
  };

  const handleSocial = (provider: 'google' | 'github') => {
    socialLogin(provider);
    toast(`${provider === 'google' ? 'Google' : 'GitHub'} 登录成功（演示模式）`, 'success');
  };

  const handleClose = () => {
    setShowLoginModal(false);
    consumePendingAction();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm mx-4 bg-surface rounded-xl border border-border shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-text-muted hover:text-text-primary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-base font-semibold text-text-primary">
            {tab === 'login' ? '登录' : tab === 'register' ? '注册' : '重置密码'}
          </h2>
          <p className="text-[11px] text-text-muted">
            {tab === 'login' ? '登录后可收藏配色方案' : tab === 'register' ? '创建账户开始收藏' : '输入注册邮箱重置密码'}
          </p>
        </div>

        {tab !== 'reset' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleSocial('google')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-surface-hover/50 text-xs text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button
              onClick={() => handleSocial('github')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-surface-hover/50 text-xs text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </button>
          </div>
        )}

        {tab !== 'reset' && (
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <div className="flex-1 h-px bg-border" />
            <span>或使用邮箱</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        <div className="space-y-2.5">
          {tab === 'register' && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="用户名"
              className="input-field w-full text-xs"
              maxLength={20}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱地址"
            className="input-field w-full text-xs"
            onKeyDown={(e) => e.key === 'Enter' && (tab === 'login' ? handleLogin() : tab === 'register' ? handleRegister() : handleReset())}
          />
          {tab !== 'reset' && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少8位）"
              className="input-field w-full text-xs"
              onKeyDown={(e) => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
            />
          )}
        </div>

        {error && (
          <div className="text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-md px-3 py-1.5">
            {error}
          </div>
        )}

        {success && (
          <div className="text-[11px] text-green-400 bg-green-500/5 border border-green-500/20 rounded-md px-3 py-1.5">
            {success}
          </div>
        )}

        {tab === 'login' && (
          <button onClick={handleLogin} className="btn-primary w-full text-xs py-2">
            登录
          </button>
        )}
        {tab === 'register' && (
          <button onClick={handleRegister} className="btn-primary w-full text-xs py-2">
            注册
          </button>
        )}
        {tab === 'reset' && (
          <button onClick={handleReset} className="btn-primary w-full text-xs py-2">
            发送重置邮件
          </button>
        )}

        <div className="flex items-center justify-between text-[11px]">
          {tab === 'login' && (
            <>
              <button onClick={() => { setTab('reset'); setError(''); setSuccess(''); }} className="text-primary hover:underline">
                忘记密码？
              </button>
              <span className="text-text-muted">
                没有账户？{' '}
                <button onClick={() => { setTab('register'); setError(''); }} className="text-primary hover:underline">
                  注册
                </button>
              </span>
            </>
          )}
          {tab === 'register' && (
            <span className="text-text-muted w-full text-center">
              已有账户？{' '}
              <button onClick={() => { setTab('login'); setError(''); }} className="text-primary hover:underline">
                登录
              </button>
            </span>
          )}
          {tab === 'reset' && (
            <button onClick={() => { setTab('login'); setError(''); setSuccess(''); }} className="text-primary hover:underline">
              返回登录
            </button>
          )}
        </div>

        <div className="text-[9px] text-text-muted/50 text-center">
          登录即表示同意服务条款和隐私政策
        </div>
      </div>
    </div>
  );
}
