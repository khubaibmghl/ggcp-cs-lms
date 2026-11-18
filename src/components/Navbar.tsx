'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, LogOut, Menu, X } from 'lucide-react';

interface NavbarProps {
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const { currentUser, logout } = useAuth();

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Hamburger & College Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile Menu Button (< 768px) */}
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="md:hidden p-2 -ml-1 rounded-xl text-slate-700 hover:text-purple-700 hover:bg-purple-50 transition"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-purple-700" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            )}

            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 flex-shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
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
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-2 sm:space-x-3 p-1.5 pr-2 rounded-xl bg-slate-50 border border-slate-200">
              <img
                src={
                  currentUser.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`
                }
                alt={currentUser.name}
                className="w-8 h-8 rounded-lg object-cover bg-purple-100 border border-purple-200 flex-shrink-0"
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
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
                className="ml-1 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition"
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
