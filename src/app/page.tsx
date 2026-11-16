'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { AuthModal } from '@/components/auth/AuthModal';

export default function Home() {
  const { currentUser } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentUser?.role === 'admin' && (
            <AdminDashboard currentTab={currentTab} />
          )}

          {currentUser?.role === 'teacher' && (
            <TeacherDashboard currentTab={currentTab} />
          )}

          {currentUser?.role === 'student' && (
            <StudentDashboard currentTab={currentTab} />
          )}

          {!currentUser && (
            <div className="text-center py-24 space-y-4">
              <h2 className="text-xl font-bold text-slate-800">
                Welcome to BS Computer Science LMS
              </h2>
              <p className="text-xs text-slate-500">
                Please sign in or select a demo role from the top navigation to continue.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
              >
                Open Sign In / Register
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
