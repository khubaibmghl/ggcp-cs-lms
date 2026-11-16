'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  Bell,
  ChevronDown,
  LogOut,
  Sparkles,
  User,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, users, switchUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & College Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Apex<span className="text-purple-700">LMS</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider">
                  BS CS Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Department of Computer Science • Fall 2026</p>
            </div>
          </div>

          {/* Center: Live Role Quick Switcher (Demo / Testing helper) */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Role Switcher:
            </span>
            <select
              value={currentUser?.id || ''}
              onChange={(e) => switchUser(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
            >
              <optgroup label="System Administrator">
                {users
                  .filter((u) => u.role === 'admin')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      🛡️ {u.name} (Admin / HOD)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Faculty / Teachers">
                {users
                  .filter((u) => u.role === 'teacher')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      👨‍🏫 {u.name} (Phone: {u.phone})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Students (Roll 1..N)">
                {users
                  .filter((u) => u.role === 'student')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      🎓 {u.name} ({u.loginId} • Roll #{u.rollNumber})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Right Profile & Logout Controls */}
          <div className="flex items-center space-x-3">
            {/* User Profile Pill */}
            <div className="flex items-center space-x-3 p-1.5 pr-2 rounded-xl bg-slate-50 border border-slate-200">
              <img
                src={
                  currentUser.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`
                }
                alt={currentUser.name}
                className="w-8 h-8 rounded-lg object-cover bg-purple-100 border border-purple-200"
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[10px] font-semibold text-purple-700 capitalize">
                  {currentUser.role === 'student'
                    ? `ID: ${currentUser.loginId} • Sec ${currentUser.section}`
                    : currentUser.role === 'teacher'
                    ? `Faculty (${currentUser.phone})`
                    : 'Administrator'}
                </p>
              </div>

              {/* Direct Logout Button */}
              <button
                onClick={logout}
                title="Logout from Account"
                className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
