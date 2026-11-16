'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StudentRegisterModal } from './StudentRegisterModal';
import {
  GraduationCap,
  Lock,
  User,
  Phone,
  ShieldCheck,
  Award,
  BookOpen,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  KeyRound,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showDemoAccordion, setShowDemoAccordion] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please enter your Login ID / Phone and password.');
      return;
    }

    const res = login(identifier.trim(), password);
    if (!res.success) {
      setError(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const fillDemo = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/50">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-xl text-white tracking-tight">
              Apex<span className="text-purple-400">LMS</span>
            </span>
            <p className="text-[11px] text-slate-400">Department of Computer Science • Fall 2026</p>
          </div>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="text-xs font-bold text-purple-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition"
        >
          New Student? Register Account
        </button>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
          {/* Card Title */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portal Authentication</h1>
            <p className="text-xs text-slate-500">
              Single intelligent login for Students, Faculty & Administrators
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Unified Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Student ID / Teacher Phone / Admin Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. BCS26-001 or 03001234567 or admin"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900 shadow-2xs font-mono"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                • Students enter issued ID (e.g. <strong>BCS26-001</strong>)<br />
                • Teachers enter registered Phone (e.g. <strong>03001234567</strong>)<br />
                • Admin enters <strong>admin</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900 shadow-2xs"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-lg shadow-purple-900/30 transition hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* New Student Register Callout */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Are you a new student?{' '}
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="font-bold text-purple-700 hover:underline"
              >
                Register your Roll Number
              </button>
            </p>
          </div>

          {/* Quick Demo Credentials Accordion */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowDemoAccordion(!showDemoAccordion)}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-700 transition"
            >
              <span className="flex items-center gap-1.5 text-purple-800">
                <KeyRound className="w-3.5 h-3.5" />
                Quick Demo Credentials (1-Click Fill)
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showDemoAccordion ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showDemoAccordion && (
              <div className="p-3 bg-white divide-y divide-slate-100 space-y-2">
                <div className="pt-1 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Admin (HOD):</span>
                    <p className="text-[11px] text-slate-500 font-mono">admin / admin123</p>
                  </div>
                  <button
                    onClick={() => fillDemo('admin', 'admin123')}
                    className="text-[10px] font-bold px-2 py-1 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200"
                  >
                    Use Admin
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Faculty (Dr. Sarah Khan):</span>
                    <p className="text-[11px] text-slate-500 font-mono">03001234567 / teacher123</p>
                  </div>
                  <button
                    onClick={() => fillDemo('03001234567', 'teacher123')}
                    className="text-[10px] font-bold px-2 py-1 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200"
                  >
                    Use Teacher
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Student (Ahmad Ali):</span>
                    <p className="text-[11px] text-slate-500 font-mono">BCS26-001 / student123</p>
                  </div>
                  <button
                    onClick={() => fillDemo('BCS26-001', 'student123')}
                    className="text-[10px] font-bold px-2 py-1 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200"
                  >
                    Use Student
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-4 py-6 text-center text-xs text-slate-400">
        Apex Learning Management System • BS Computer Science Assignment Portal • 100% Free Hosting Architecture
      </footer>

      {/* Registration Modal */}
      <StudentRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccessLogin={(newId) => {
          setIdentifier(newId);
          setPassword('');
          setError(null);
        }}
      />
    </div>
  );
};
