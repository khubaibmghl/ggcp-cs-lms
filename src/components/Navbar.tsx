'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  Bell,
  ChevronDown,
  ShieldCheck,
  UserCheck,
  BookOpen,
  LogOut,
  UserPlus,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onOpenAuthModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuthModal }) => {
  const { currentUser, users, switchUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

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

          {/* Center: Live Role Quick Switcher (Demo / Testing feature) */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Role Preview:
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
                      👨‍🏫 {u.name} ({u.status === 'approved' ? 'Approved' : 'Pending'})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Students (Roll 1..N)">
                {users
                  .filter((u) => u.role === 'student')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      🎓 {u.name} (Roll #{u.rollNumber} - Sec {u.section})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Right Profile & Controls */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <button
              title="Notifications"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-purple-600 rounded-full ring-2 ring-white"></span>
            </button>

            {/* User Profile Pill */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-1.5 pr-3 rounded-xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                >
                  <img
                    src={
                      currentUser.avatar ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`
                    }
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-lg object-cover bg-purple-100 border border-purple-200"
                  />
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] font-semibold text-purple-700 capitalize">
                      {currentUser.role === 'student'
                        ? `Roll #${currentUser.rollNumber} • Sec ${currentUser.section}`
                        : currentUser.role === 'teacher'
                        ? `Faculty (${currentUser.status})`
                        : 'Administrator'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          if (onOpenAuthModal) onOpenAuthModal();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors"
                      >
                        <UserPlus className="w-4 h-4 text-purple-600" />
                        <span>Register New Account</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Switch Profile / Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
