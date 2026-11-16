'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SemesterNumber, Section } from '@/types';
import {
  GraduationCap,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  Copy,
  ArrowRight,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, registerStudent } = useAuth();

  // Mode: 'login' or 'register' (completely separate clean views)
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register State
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [semester, setSemester] = useState<SemesterNumber>(1);
  const [section, setSection] = useState<Section>('A1');
  const [rollNumber, setRollNumber] = useState<number>(1);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  // Registration Success State
  const [issuedStudentId, setIssuedStudentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!identifier.trim() || !password) {
      setLoginError('Please enter your User ID and password.');
      return;
    }

    const res = login(identifier.trim(), password);
    if (!res.success) {
      setLoginError(res.message || 'Invalid credentials.');
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!name.trim() || !fatherName.trim()) {
      setRegError('Please enter full name and father name.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    const result = registerStudent({
      name: name.trim(),
      fatherName: fatherName.trim(),
      semester,
      section,
      rollNumber: Number(rollNumber),
      password: regPassword,
    });

    setIssuedStudentId(result.generatedLoginId);
  };

  const handleCopyId = () => {
    if (issuedStudentId) {
      navigator.clipboard.writeText(issuedStudentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between relative overflow-hidden">
      {/* Top Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-xl text-white tracking-tight">
              GGC <span className="text-purple-400">Pasrur</span>
            </span>
            <p className="text-[11px] text-slate-400">Department of Computer Science • LMS</p>
          </div>
        </div>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setLoginError(null);
            setRegError(null);
            setIssuedStudentId(null);
          }}
          className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition border border-white/10"
        >
          {mode === 'login' ? 'Student Registration' : 'Back to Sign In'}
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          {/* ============================================================ */}
          {/* VIEW A: CLEAN SIGN IN PAGE                                  */}
          {/* ============================================================ */}
          {mode === 'login' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sign In</h1>
                <p className="text-xs text-slate-500 mt-1">Enter your credentials to access your portal</p>
              </div>

              {loginError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    User ID / Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. BCS3-A1-001, 03001234567, or admin"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full text-xs font-medium pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs font-medium pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md transition"
                >
                  Sign In
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  New student?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setLoginError(null);
                    }}
                    className="font-bold text-purple-700 hover:underline"
                  >
                    Register here
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW B: CLEAN STUDENT SIGN UP PAGE                          */}
          {/* ============================================================ */}
          {mode === 'register' && (
            <div className="space-y-5">
              {issuedStudentId ? (
                /* Registration Success Screen */
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900">Registration Successful</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Please save your assigned Student Login ID</p>
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      Your Student Login ID
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-black font-mono text-purple-950">
                        {issuedStudentId}
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="p-1 rounded-lg bg-white border border-purple-200 hover:bg-purple-100 text-purple-700"
                        title="Copy ID"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copied && (
                      <span className="text-[10px] font-bold text-emerald-600 block">Copied!</span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIdentifier(issuedStudentId);
                      setPassword('');
                      setMode('login');
                      setIssuedStudentId(null);
                    }}
                    className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              ) : (
                /* Registration Form */
                <div className="space-y-4">
                  <div className="text-center">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      Student Registration
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">Create your student portal account</p>
                  </div>

                  {regError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Student Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ahmad Ali"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Father Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Muhammad Ali"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(Number(e.target.value) as SemesterNumber)}
                          className="w-full text-xs font-bold px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <option key={s} value={s}>
                              Sem {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                        <select
                          value={section}
                          onChange={(e) => setSection(e.target.value as Section)}
                          className="w-full text-xs font-bold px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                        >
                          <option value="A1">Sec A1</option>
                          <option value="A2">Sec A2</option>
                          <option value="B">Sec B</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Roll No (1..N)</label>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          required
                          value={rollNumber}
                          onChange={(e) => setRollNumber(Number(e.target.value))}
                          className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="Min 6 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
                        <input
                          type="password"
                          required
                          placeholder="Repeat password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 mt-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md transition"
                    >
                      Register Account
                    </button>
                  </form>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-600">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setRegError(null);
                        }}
                        className="font-bold text-purple-700 hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-4 py-6 text-center text-xs text-slate-400">
        Govt. Graduate College Pasrur (GGC Pasrur) • BS Computer Science Assignment Portal
      </footer>
    </div>
  );
};
