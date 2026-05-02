import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, UserPreferences } from '../types';

const defaultPreferences: UserPreferences = {
  defaultExtractCount: 6,
  defaultTransferAlgorithm: 'reinhard',
  smartRecommendationEnabled: true,
  theme: 'dark',
  language: 'zh',
  meteorEffectEnabled: true,
  presetColorCount: 5,
};

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: number;
}

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil: number;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showLoginModal: boolean;
  pendingAction: string | null;
  loginAttempts: LoginAttempt;
  users: StoredUser[];

  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (email: string, password: string, displayName: string) => { success: boolean; error?: string };
  socialLogin: (provider: 'google' | 'github') => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; error?: string };
  resetPassword: (email: string) => { success: boolean; error?: string };
  deleteAccount: () => void;
  setShowLoginModal: (show: boolean) => void;
  setPendingAction: (action: string | null) => void;
  consumePendingAction: () => string | null;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `pw_${Math.abs(hash).toString(36)}_${password.length}`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      showLoginModal: false,
      pendingAction: null,
      loginAttempts: { count: 0, lastAttempt: 0, lockedUntil: 0 },
      users: [],

      login: (email, password) => {
        const { loginAttempts, users } = get();
        const now = Date.now();

        if (loginAttempts.lockedUntil > now) {
          const remaining = Math.ceil((loginAttempts.lockedUntil - now) / 60000);
          return { success: false, error: `登录已被锁定，请 ${remaining} 分钟后再试` };
        }

        const user = users.find(u => u.email === email);
        if (!user) {
          set({
            loginAttempts: {
              count: loginAttempts.count + 1,
              lastAttempt: now,
              lockedUntil: loginAttempts.count + 1 >= 5 ? now + 15 * 60 * 1000 : 0,
            },
          });
          return { success: false, error: '邮箱或密码错误' };
        }

        const passwordHash = hashPassword(password);
        if (user.passwordHash !== passwordHash) {
          const newCount = loginAttempts.count + 1;
          set({
            loginAttempts: {
              count: newCount,
              lastAttempt: now,
              lockedUntil: newCount >= 5 ? now + 15 * 60 * 1000 : 0,
            },
          });
          return { success: false, error: newCount >= 5 ? '连续失败过多，账户已锁定15分钟' : '邮箱或密码错误' };
        }

        set({
          user: {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            preferences: user.preferences,
          },
          isAuthenticated: true,
          loginAttempts: { count: 0, lastAttempt: 0, lockedUntil: 0 },
          showLoginModal: false,
        });
        return { success: true };
      },

      register: (email, password, displayName) => {
        const { users } = get();

        if (password.length < 8) {
          return { success: false, error: '密码至少需要 8 个字符' };
        }

        if (users.some(u => u.email === email)) {
          return { success: false, error: '该邮箱已注册' };
        }

        const newUser: StoredUser = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          email,
          passwordHash: hashPassword(password),
          displayName,
          preferences: { ...defaultPreferences },
          createdAt: Date.now(),
        };

        set({
          users: [...users, newUser],
          user: {
            id: newUser.id,
            displayName: newUser.displayName,
            preferences: newUser.preferences,
          },
          isAuthenticated: true,
          showLoginModal: false,
        });
        return { success: true };
      },

      socialLogin: (provider) => {
        const mockUser: UserProfile = {
          id: `social-${provider}-${Date.now()}`,
          displayName: provider === 'google' ? 'Google 用户' : 'GitHub 用户',
          avatarUrl: undefined,
          preferences: { ...defaultPreferences },
        };
        set({
          user: mockUser,
          isAuthenticated: true,
          showLoginModal: false,
        });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates) => {
        const { user, users } = get();
        if (!user) return;
        const updated = { ...user, ...updates };
        set({
          user: updated,
          users: users.map(u => u.id === user.id ? { ...u, ...updates } : u),
        });
      },

      updatePreferences: (prefs) => {
        const { user, users } = get();
        if (!user) return;
        const updatedPrefs = { ...user.preferences, ...prefs };
        const updated = { ...user, preferences: updatedPrefs };
        set({
          user: updated,
          users: users.map(u => u.id === user.id ? { ...u, preferences: updatedPrefs } : u),
        });
      },

      changePassword: (oldPassword, newPassword) => {
        const { user, users } = get();
        if (!user) return { success: false, error: '未登录' };

        if (newPassword.length < 8) {
          return { success: false, error: '新密码至少需要 8 个字符' };
        }

        const storedUser = users.find(u => u.id === user.id);
        if (!storedUser) return { success: false, error: '用户不存在' };

        if (storedUser.passwordHash !== hashPassword(oldPassword)) {
          return { success: false, error: '当前密码错误' };
        }

        set({
          users: users.map(u =>
            u.id === user.id ? { ...u, passwordHash: hashPassword(newPassword) } : u
          ),
        });
        return { success: true };
      },

      resetPassword: (email) => {
        const { users } = get();
        if (!users.some(u => u.email === email)) {
          return { success: false, error: '该邮箱未注册' };
        }
        return { success: true };
      },

      deleteAccount: () => {
        const { user, users } = get();
        if (!user) return;
        set({
          users: users.filter(u => u.id !== user.id),
          user: null,
          isAuthenticated: false,
        });
      },

      setShowLoginModal: (show) => set({ showLoginModal: show }),
      setPendingAction: (action) => set({ pendingAction: action }),
      consumePendingAction: () => {
        const action = get().pendingAction;
        set({ pendingAction: null });
        return action;
      },
    }),
    {
      name: 'cc-auth',
      version: 1,
      partialize: (state) => ({
        users: state.users,
        loginAttempts: state.loginAttempts,
      }),
    },
  ),
);
