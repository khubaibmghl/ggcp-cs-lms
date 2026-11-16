'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { LoginPage } from '@/components/auth/LoginPage';

export default function Home() {
  const { currentUser } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // If user is not authenticated, show the Intelligent Landing Login Page!
  if (!currentUser) {
    return <LoginPage />;
  }

  // When logged in, render the active role's dashboard
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar with Profile & Logout */}
      <Navbar />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentUser.role === 'admin' && (
            <AdminDashboard currentTab={currentTab} />
          )}

          {currentUser.role === 'teacher' && (
            <TeacherDashboard currentTab={currentTab} />
          )}

          {currentUser.role === 'student' && (
            <StudentDashboard currentTab={currentTab} />
          )}
        </main>
      </div>
    </div>
  );
}
