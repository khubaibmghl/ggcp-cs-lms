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
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { currentUser, logout } = useAuth();
  if (!currentUser) return null;

  const role = currentUser.role;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex border-r border-slate-800">
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
              Head of Department
            </p>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>

          <button
            onClick={() => setCurrentTab('dashboard')}
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
            onClick={() => setCurrentTab('assignments')}
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
                onClick={() => setCurrentTab('submissions')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'submissions'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Review & Grading</span>
              </button>

              <button
                onClick={() => setCurrentTab('roster')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'roster'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users2 className="w-4 h-4" />
                <span>Missing Roll Numbers</span>
              </button>

              <button
                onClick={() => setCurrentTab('integrity')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'integrity'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
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
                onClick={() => setCurrentTab('curriculum')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'curriculum'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Subjects & Curriculum</span>
              </button>

              <button
                onClick={() => setCurrentTab('teacher-approvals')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'teacher-approvals'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Faculty Directory</span>
              </button>

              <button
                onClick={() => setCurrentTab('roster')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'roster'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
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
                onClick={() => setCurrentTab('my-submissions')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'my-submissions'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
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

      {/* Footer / Sign Out */}
      <div className="border-t border-slate-800 pt-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900 hover:text-white transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
