import React, { useState } from 'react';
import { User } from '../../shared/types';
import { Lock, ShieldCheck, ShoppingCart, BarChart3, UserCheck, Sun, Moon } from 'lucide-react';

interface StaffLoginScreenProps {
  users: User[];
  theme: 'light' | 'dark';
  onToggleTheme: (t: 'light' | 'dark') => void;
  onLoginSuccess: (user: User) => void;
}

export const StaffLoginScreen: React.FC<StaffLoginScreenProps> = ({
  users,
  theme,
  onToggleTheme,
  onLoginSuccess
}) => {
  const [selectedUser, setSelectedUser] = useState<User>(
    users.find(u => u.role === 'STAFF') || users[0]
  );
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() !== selectedUser.pin) {
      setError(`Incorrect PIN for ${selectedUser.name}. Demo PIN is ${selectedUser.pin}`);
      return;
    }
    onLoginSuccess(selectedUser);
  };

  const handleQuickDemoLogin = (user: User) => {
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white dark:text-slate-950 font-black text-base shadow-sm">
            OG
          </div>
          <div>
            <div className="font-bold text-base text-slate-900 dark:text-white">
              Ogunleye FMCG Warehouse
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Offline-First Inventory, Sales & Price Fingerprint System
            </div>
          </div>
        </div>

        {/* Theme Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onToggleTheme('light')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleTheme('dark')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              theme === 'dark'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-sky-400" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Center Login Card */}
      <div className="max-w-4xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Choose Staff or CEO Profile (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Select Account to Sign In
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Staff accounts open directly to the <strong>Sales Record</strong> desk. CEO account
              opens the <strong>Executive Dashboard & Price Audit</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {users.map(u => {
              const isSelected = selectedUser.id === u.id;
              const isCeo = u.role === 'CEO';
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setError('');
                    setPin('');
                  }}
                  className={`cursor-pointer rounded-2xl p-4 border transition flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-sm'
                      : 'surface-card hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isCeo
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                            : u.role === 'MANAGER'
                            ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {u.role}
                      </span>
                      <span className="text-xs font-mono text-slate-400">PIN: {u.pin}</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-base mt-2">
                      {u.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{u.title}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {isCeo ? (
                        <>
                          <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                          <span>Executive View</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Sales & Stock Desk</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleQuickDemoLogin(u);
                      }}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      1-Click Enter →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: PIN Entry Box (5 cols) */}
        <div className="lg:col-span-5 surface-card p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Signing in as</div>
              <div className="font-bold text-slate-900 dark:text-white">{selectedUser.name}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {selectedUser.role} • Terminal: {selectedUser.deviceLabel}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Enter 4-Digit Staff PIN</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  Demo PIN: {selectedUser.pin}
                </span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder={`Enter ${selectedUser.pin}`}
                  className="input-clean w-full pl-10 font-mono tracking-widest !text-base"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full !py-3">
              Sign In with PIN
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin(selectedUser)}
              className="btn-secondary w-full !py-2.5"
            >
              Instant Demo Sign In ({selectedUser.name.split(' ')[0]})
            </button>
          </form>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Your session identity stamps all sales records and price modifications for CEO audit.
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-xs text-slate-400">
        Works 100% Offline on Low/Zero Nigerian Network • Auto-Syncs to CEO Cloud
      </div>
    </div>
  );
};
