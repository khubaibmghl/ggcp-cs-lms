'use client';

import React, { useState, useMemo } from 'react';
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
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Check,
  Building2,
  HelpCircle,
  Sparkle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, registerStudent, users } = useAuth();

  // Mode: 'login' or 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register State
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [semester, setSemester] = useState<SemesterNumber>(1);
  const [section, setSection] = useState<Section>('A1');
  const [rollNumber, setRollNumber] = useState<number | string>(1);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Real-time check for duplicate student in the SAME class (Semester + Section)
  const duplicateStudent = useMemo(() => {
    const num = Number(rollNumber);
    if (!num || isNaN(num) || num < 1) return null;
    return (
      users.find(
        (u) =>
          u.role === 'student' &&
          Number(u.semester) === Number(semester) &&
          u.section === section &&
          Number(u.rollNumber) === num
      ) || null
    );
  }, [users, semester, section, rollNumber]);

  // Registration Success State
  const [issuedStudentId, setIssuedStudentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!identifier.trim() || !password) {
      setLoginError('Please enter your official User ID and password.');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      const res = login(identifier.trim(), password);
      setIsLoggingIn(false);
      if (!res.success) {
        setLoginError(res.message || 'Invalid User ID or password. Please verify credentials.');
      }
    }, 250);
  };

  // Handle Register Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!name.trim() || !fatherName.trim()) {
      setRegError('Please provide your full student name and father name.');
      return;
    }

    const rollNum = Number(rollNumber);
    if (!rollNum || isNaN(rollNum) || rollNum < 1 || !Number.isInteger(rollNum)) {
      setRegError('Please enter a valid positive roll number (e.g., 1, 2, 3...).');
      return;
    }

    if (rollNum > 250) {
      setRegError('Roll number cannot exceed 250 for a section. Please verify your official roll number.');
      return;
    }

    if (duplicateStudent) {
      setRegError(
        `Roll Number ${rollNum} is already registered in Semester ${semester} (Section ${section}) to "${duplicateStudent.name}". Each student in a class must have a unique roll number.`
      );
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    const result = registerStudent({
      name: name.trim(),
      fatherName: fatherName.trim(),
      semester,
      section,
      rollNumber: rollNum,
      password: regPassword,
    });

    if (!result.success) {
      setRegError(result.message || 'Registration failed. Please check your roll number.');
      return;
    }

    setIssuedStudentId(result.generatedLoginId || null);
  };

  const handleCopyId = () => {
    if (issuedStudentId) {
      navigator.clipboard.writeText(issuedStudentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col lg:flex-row overflow-x-hidden selection:bg-purple-600 selection:text-white">
      {/* ========================================================================= */}
      {/* LEFT PANEL: HERO BRANDING & CAMPUS SHOWCASE (Desktop 50%, hidden on mob) */}
      {/* ========================================================================= */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-slate-800/80">
        {/* Background Campus Photograph with Rich Collegiate Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: "url('/campus-hero.jpg')",
          }}
        />
        {/* Deep Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-purple-950/75 backdrop-blur-[1px]" />
        {/* Subtle Decorative Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Top Header Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-400 p-0.5 shadow-xl shadow-purple-950/50 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center backdrop-blur-xs">
                <GraduationCap className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div>
              <span className="font-black text-xl text-white tracking-tight block">
                Govt. Graduate College <span className="text-purple-400">Pasrur</span>
              </span>
              <p className="text-xs text-purple-200/80 font-medium">Department of Computer Science • LMS</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-purple-200">
            <Sparkle className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
            BSCS Portal 2024-2028
          </span>
        </div>

        {/* Center Hero Information */}
        <div className="relative z-10 my-auto py-12 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Official Academic Evaluation System
          </div>

          <h1 className="text-3xl xl:text-5xl font-black text-white leading-tight tracking-tight">
            Academic Excellence Through{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-300">
              Modern Technology
            </span>
          </h1>

          <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
            Welcome to the centralized student assignment submission, document evaluation, and academic integrity management portal for Govt. Graduate College Pasrur.
          </p>
        </div>

        {/* Bottom Collegiate Accreditation Badge */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Govt. Graduate College Pasrur • District Sialkot</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">Affiliated with HED Punjab</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: INTERACTIVE AUTH & REGISTRATION FORM (Full width on mob/tab) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 xl:p-16 relative">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile & Tablet Header (Hidden on Large Desktops) */}
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white tracking-tight">GGC Pasrur</span>
              <p className="text-[10px] text-purple-300">BS Computer Science LMS</p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            HED Punjab
          </span>
        </div>

        {/* Center Card Container */}
        <div className="my-auto w-full max-w-lg mx-auto">
          {/* Main Card */}
          <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-800 relative overflow-hidden">
            {/* Top Accent Gradient Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />

            {/* Segmented Switcher Pill Controls (Sign In vs Student Registration) */}
            <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-8 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLoginError(null);
                  setRegError(null);
                  setIssuedStudentId(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${
                  mode === 'login'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setLoginError(null);
                  setRegError(null);
                  setIssuedStudentId(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${
                  mode === 'register'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Student Registration
              </button>
            </div>

            {/* ================================================================ */}
            {/* VIEW A: SIGN IN FORM                                            */}
            {/* ================================================================ */}
            {mode === 'login' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Welcome Back</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter your official ID and password to access your course portal.
                  </p>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span className="font-medium">{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* User ID / Identifier Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Official User ID / Roll Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. BCS1-A1-001, admin, or faculty"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full text-xs font-semibold pl-10 pr-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                    </div>
                  </div>

                  {/* Password Input with Show/Hide Toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Password
                      </label>
                      <span className="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer transition">
                        Help & Support
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs font-semibold pl-10 pr-10 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition p-0.5"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75"
                  >
                    {isLoggingIn ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        Sign In to Portal
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ================================================================ */}
            {/* VIEW B: STUDENT REGISTRATION FORM                               */}
            {/* ================================================================ */}
            {mode === 'register' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {issuedStudentId ? (
                  /* --- REGISTRATION SUCCESS MODAL VIEW --- */
                  <div className="text-center space-y-5 py-4 animate-in zoom-in-95">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/30">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>

                    <div>
                      <h2 className="text-2xl font-black text-white">Account Created!</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Your official Student Portal Account has been issued.
                      </p>
                    </div>

                    {/* Issued ID Card */}
                    <div className="bg-slate-950/90 border-2 border-purple-500/40 rounded-3xl p-5 text-center space-y-2 shadow-xl">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 block">
                        Your Official Student Login ID
                      </span>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-wider">
                          {issuedStudentId}
                        </span>
                        <button
                          onClick={handleCopyId}
                          className="p-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 hover:border-purple-400 text-purple-200 hover:text-white transition"
                          title="Copy ID to Clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      {copied ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Copied to clipboard!
                        </span>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Please note or copy this ID. You will use it to log in.
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setIdentifier(issuedStudentId);
                        setPassword('');
                        setMode('login');
                        setIssuedStudentId(null);
                      }}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2"
                    >
                      Proceed to Sign In
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* --- REGISTRATION INPUT FORM --- */
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tight">Student Sign Up</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Register with your official roll number to receive your LMS Login ID.
                      </p>
                    </div>

                    {/* Error Banner */}
                    {regError && (
                      <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{regError}</span>
                      </div>
                    )}

                    <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                      {/* Name & Father Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Student Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ahmad Ali"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Father&apos;s Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Muhammad Aslam"
                            value={fatherName}
                            onChange={(e) => setFatherName(e.target.value)}
                            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                      </div>

                      {/* 3-Column Class Selection: Semester, Section, Roll Number */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Semester
                          </label>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(Number(e.target.value) as SemesterNumber)}
                            className="w-full text-xs font-bold px-2 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                          >
                            {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map((s) => (
                              <option key={s} value={s} className="bg-slate-900 text-white">
                                Sem {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Section
                          </label>
                          <select
                            value={section}
                            onChange={(e) => setSection(e.target.value as Section)}
                            className="w-full text-xs font-bold px-2 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                          >
                            <option value="A1" className="bg-slate-900 text-white">Sec A1</option>
                            <option value="A2" className="bg-slate-900 text-white">Sec A2</option>
                            <option value="B" className="bg-slate-900 text-white">Sec B</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Roll No (1..N)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={250}
                            required
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value === '' ? '' : Number(e.target.value))}
                            className={`w-full text-xs font-bold px-2.5 py-2.5 rounded-xl bg-slate-950/80 border focus:outline-none transition ${
                              duplicateStudent
                                ? 'border-rose-500 text-rose-300 focus:ring-2 focus:ring-rose-500/20'
                                : 'border-slate-700 text-white focus:border-purple-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Real-time Inline Duplicate Roll Number Notification */}
                      {duplicateStudent ? (
                        <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Roll #{rollNumber} is already taken in this class!</p>
                            <p className="text-[11px] text-rose-300/80 mt-0.5 leading-snug">
                              Already registered to student <strong>{duplicateStudent.name}</strong> in Semester {semester} ({section}). Each student in this class must use a unique roll number.
                            </p>
                          </div>
                        </div>
                      ) : (
                        rollNumber && Number(rollNumber) > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold px-1">
                            <Check className="w-3.5 h-3.5" />
                            Roll #{rollNumber} is available in Semester {semester} (Section {section})
                          </div>
                        )
                      )}

                      {/* Password & Confirm Password with Visibility Toggle */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showRegPassword ? 'text' : 'password'}
                              required
                              placeholder="Min 6 chars"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                              tabIndex={-1}
                            >
                              {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Confirm Password
                          </label>
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            placeholder="Repeat password"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      {/* Submit Registration Button */}
                      <button
                        type="submit"
                        disabled={!!duplicateStudent}
                        className={`w-full py-3.5 mt-2 rounded-xl text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                          duplicateStudent
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 shadow-purple-950/50 hover:scale-[1.01]'
                        }`}
                      >
                        {duplicateStudent ? (
                          `Roll #${rollNumber} is already registered`
                        ) : (
                          <>
                            Create Student Account
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <p>
              Govt. Graduate College Pasrur • Department of Computer Science
              <br />
              <span className="text-[11px] text-slate-600">
                Official LMS Platform for BSCS Coursework & Submissions
              </span>
            </p>
          </div>
        </div>

        {/* Bottom Status / Security indicator */}
        <div className="w-full flex items-center justify-between text-[11px] text-slate-500 pt-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online & Connected
          </span>
          <span>SSL 256-Bit Encrypted</span>
        </div>
      </div>
    </div>
  );
};
