import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('密码至少需要 8 个字符');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-text-primary hover:opacity-80 transition-opacity">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <circle cx="10" cy="10" r="7" fill="#FF6B35" opacity="0.9" />
              <circle cx="18" cy="10" r="7" fill="#4ECDC4" opacity="0.8" />
              <circle cx="14" cy="17" r="7" fill="#6366f1" opacity="0.7" />
            </svg>
            <span className="font-semibold text-xl">Control-Color</span>
          </Link>
          <p className="text-text-secondary text-sm mt-2">创建账户以收藏配色方案</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="bg-red-600/10 border border-red-600/30 text-red-400 text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-text-secondary">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-text-secondary">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 8 个字符"
              className="input"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-text-secondary">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className="input"
              required
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? '注册中...' : '注册'}
          </button>

          <div className="text-center text-sm text-text-muted">
            已有账号？{' '}
            <Link to="/auth/login" className="text-primary hover:text-primary-hover">登录</Link>
          </div>
        </form>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-text-muted hover:text-text-secondary">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
