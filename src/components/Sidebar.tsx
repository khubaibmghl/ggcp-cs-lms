'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  Users2,
  ShieldAlert,
  Layers,
  CheckCircle,
  Clock,
  LogOut,
  GraduationCap,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { currentUser, logout } = useAuth();
  if (!currentUser) return null;

  const role = currentUser.role;

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogoutClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
    logout();
  };

  // Reusable Nav Content
  const renderNavContent = () => (
    <div className="space-y-6">
      {/* Status / Role Card */}
      <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/60 shadow-inner">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            {role === 'admin'
              ? 'Admin Console'
              : role === 'teacher'
              ? `Faculty (${currentUser.status || 'Active'})`
              : `Student Portal`}
          </span>
        </div>
        {role === 'student' && (
          <p className="text-[11px] text-purple-300 mt-1 font-mono">
            ID: {currentUser.loginId} • Roll #{currentUser.rollNumber} (Sec {currentUser.section})
          </p>
        )}
        {role === 'teacher' && (
          <p className="text-[11px] text-purple-300 mt-1 font-medium">
            Phone: {currentUser.phone} • Sem {currentUser.taughtSemester}
          </p>
        )}
        {role === 'admin' && (
          <p className="text-[11px] text-purple-300 mt-1 font-medium">
            Prof. Dr. Tariq Mahmood • HoD
          </p>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="space-y-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Main Menu
        </div>

        <button
          onClick={() => handleTabClick('dashboard')}
          className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'dashboard'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard & Courses</span>
        </button>

        <button
          onClick={() => handleTabClick('assignments')}
          className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'assignments'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Assignments Hub</span>
        </button>

        {/* Teacher Specific Links */}
        {role === 'teacher' && (
          <>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mt-5 mb-2">
              Teacher Controls
            </div>

            <button
              onClick={() => handleTabClick('submissions')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'submissions'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Review & Grading</span>
            </button>

            <button
              onClick={() => handleTabClick('roster')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'roster'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>Missing Roll Numbers</span>
            </button>

            <button
              onClick={() => handleTabClick('integrity')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'integrity'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Plagiarism & AI Suite</span>
            </button>
          </>
        )}

        {/* Admin Specific Links */}
        {role === 'admin' && (
          <>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mt-5 mb-2">
              Administration
            </div>

            <button
              onClick={() => handleTabClick('curriculum')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'curriculum'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Subjects & Curriculum</span>
            </button>

            <button
              onClick={() => handleTabClick('teacher-approvals')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'teacher-approvals'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Faculty Directory</span>
            </button>

            <button
              onClick={() => handleTabClick('roster')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'roster'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>All Students & Sections</span>
            </button>
          </>
        )}

        {/* Student Specific Links */}
        {role === 'student' && (
          <>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mt-5 mb-2">
              My Academics
            </div>

            <button
              onClick={() => handleTabClick('my-submissions')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'my-submissions'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>My Submissions & Marks</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Permanent Sidebar (Screen width >= 768px) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 min-h-[calc(100vh-4rem)] p-4 flex-col justify-between hidden md:flex border-r border-slate-800">
        {renderNavContent()}

        {/* Sign Out Button */}
        <div className="border-t border-slate-800 pt-4">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Responsive Slide-In Drawer with Backdrop Blur (Screen width < 768px) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop Overlay */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 min-h-screen p-5 flex flex-col justify-between z-10 shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Top Header with College Branding and Close Button */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white leading-tight">
                      GGC <span className="text-purple-400">Pasrur</span>
                    </h3>
                    <p className="text-[10px] text-purple-300 font-mono">BS CS LMS Portal</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              {renderNavContent()}
            </div>

            {/* Bottom Sign Out */}
            <div className="border-t border-slate-800 pt-4 mt-6">
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900 hover:text-white transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
