import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCollectionStore } from '../stores/collectionStore';
import { useToast } from '../components/ui/Toast';

type Section = 'collections' | 'settings' | 'security';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setShowLoginModal, updateProfile, updatePreferences, changePassword, deleteAccount, logout } = useAuthStore();
  const settings = useSettingsStore();
  const { palettes } = useCollectionStore();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>('collections');

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-text-muted">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <h2 className="text-lg font-medium text-text-primary">请先登录</h2>
        <p className="text-sm text-text-muted">登录后即可管理您的收藏和设置</p>
        <button onClick={() => setShowLoginModal(true)} className="btn-primary text-sm">
          登录 / 注册
        </button>
      </div>
    );
  }

  const handleSaveName = () => {
    if (newName.trim()) {
      updateProfile({ displayName: newName.trim() });
      toast('昵称已更新', 'success');
    }
    setEditingName(false);
  };

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!oldPassword || !newPassword) {
      setPasswordError('请填写所有字段');
      return;
    }
    const result = changePassword(oldPassword, newPassword);
    if (result.success) {
      setPasswordSuccess('密码已更新');
      setOldPassword('');
      setNewPassword('');
    } else {
      setPasswordError(result.error || '修改失败');
    }
  };

  const handleDeleteAccount = () => {
    deleteAccount();
    toast('账户已删除', 'info');
    navigate('/');
  };

  const handleExportAll = () => {
    const data = JSON.stringify(palettes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `control-color-palettes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出所有收藏', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="input-field text-sm"
                autoFocus
                maxLength={20}
              />
              <button onClick={handleSaveName} className="text-xs text-primary">保存</button>
              <button onClick={() => setEditingName(false)} className="text-xs text-text-muted">取消</button>
            </div>
          ) : (
            <h1
              className="text-xl font-bold text-text-primary cursor-pointer hover:text-primary transition-colors"
              onClick={() => { setEditingName(true); setNewName(user.displayName); }}
              title="点击修改昵称"
            >
              {user.displayName}
            </h1>
          )}
          <p className="text-sm text-text-secondary">管理您的收藏和设置</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {([
          { key: 'collections' as const, label: '收藏管理' },
          { key: 'settings' as const, label: '偏好设置' },
          { key: 'security' as const, label: '安全设置' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              activeSection === key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'collections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary">我的收藏</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">{palettes.length} / 200</span>
              {palettes.length > 0 && (
                <button onClick={handleExportAll} className="text-xs text-primary hover:underline">
                  导出全部
                </button>
              )}
            </div>
          </div>

          {palettes.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted mb-4">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-text-secondary mb-2">暂无收藏</p>
              <p className="text-text-muted text-sm">在工作台中点击「收藏」按钮保存配色方案</p>
            </div>
          ) : (
            <div className="space-y-2">
              {palettes.map((palette) => (
                <div key={palette.id} className="card p-3 flex items-center gap-3">
                  <div className="flex gap-0.5 w-32 shrink-0">
                    {palette.colors.slice(0, 6).map((c, i) => (
                      <div key={i} className="flex-1 h-6 first:rounded-l last:rounded-r" style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-primary truncate">{palette.name}</div>
                    <div className="text-[10px] text-text-muted">
                      {palette.colors.length} 色 · {new Date(palette.createdAt).toLocaleDateString('zh-CN')}
                      {palette.tags.length > 0 && ` · ${palette.tags.join(', ')}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="space-y-6">
          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-medium text-text-primary">偏好设置</h3>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">主题</span>
              <select
                value={settings.theme}
                onChange={(e) => settings.setTheme(e.target.value as 'dark' | 'light')}
                className="bg-surface border border-border rounded-md text-sm px-3 py-1.5 text-text-primary"
              >
                <option value="dark">暗色</option>
                <option value="light">亮色</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">语言</span>
              <select
                value={settings.language}
                onChange={(e) => settings.setLanguage(e.target.value as 'zh' | 'en')}
                className="bg-surface border border-border rounded-md text-sm px-3 py-1.5 text-text-primary"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">默认提取数量</span>
              <input
                type="number"
                min={3}
                max={12}
                value={settings.defaultExtractCount}
                onChange={(e) => settings.setDefaultExtractCount(Number(e.target.value))}
                className="bg-surface border border-border rounded-md text-sm px-3 py-1.5 text-text-primary w-20 text-center"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">预设配色数量</span>
              <input
                type="number"
                min={3}
                max={8}
                value={settings.presetColorCount}
                onChange={(e) => settings.setPresetColorCount(Number(e.target.value))}
                className="bg-surface border border-border rounded-md text-sm px-3 py-1.5 text-text-primary w-20 text-center"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">默认迁移算法</span>
              <select
                value={settings.defaultTransferAlgorithm}
                onChange={(e) => settings.setDefaultTransferAlgorithm(e.target.value as 'reinhard' | 'histogram')}
                className="bg-surface border border-border rounded-md text-sm px-3 py-1.5 text-text-primary"
              >
                <option value="reinhard">Reinhard（快速）</option>
                <option value="histogram">直方图匹配（精确）</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">智能推荐</span>
              <button
                onClick={() => settings.setSmartRecommendationEnabled(!settings.smartRecommendationEnabled)}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  settings.smartRecommendationEnabled ? 'bg-primary' : 'bg-border'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.smartRecommendationEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">流星特效</span>
              <button
                onClick={() => settings.setMeteorEffectEnabled(!settings.meteorEffectEnabled)}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  settings.meteorEffectEnabled ? 'bg-primary' : 'bg-border'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.meteorEffectEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'security' && (
        <div className="space-y-6">
          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-medium text-text-primary">修改密码</h3>
            <div className="space-y-2">
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="当前密码"
                className="input-field w-full text-sm"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码（至少8位）"
                className="input-field w-full text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
              />
              {passwordError && <div className="text-xs text-red-400">{passwordError}</div>}
              {passwordSuccess && <div className="text-xs text-green-400">{passwordSuccess}</div>}
              <button onClick={handleChangePassword} className="btn-secondary text-sm">
                更新密码
              </button>
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-medium text-text-primary">账户操作</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-primary">退出登录</div>
                <div className="text-xs text-text-muted">退出当前账户</div>
              </div>
              <button
                onClick={() => { logout(); navigate('/'); toast('已退出登录', 'info'); }}
                className="btn-secondary text-sm"
              >
                退出
              </button>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-red-400">删除账户</div>
                  <div className="text-xs text-text-muted">此操作不可逆，所有数据将被永久删除</div>
                </div>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      className="text-xs text-white bg-red-500 rounded-md px-3 py-1.5 hover:bg-red-600 transition-colors"
                    >
                      确认删除
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-xs text-text-muted"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-sm text-red-400 border border-red-400/30 rounded-md px-3 py-1.5 hover:bg-red-400/10 transition-colors"
                  >
                    删除账户
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
