'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();

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
                  GGC <span className="text-purple-700">Pasrur</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider">
                  BS CS LMS
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Department of Computer Science • Fall 2026</p>
            </div>
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
