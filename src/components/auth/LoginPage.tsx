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

export interface PasswordStrengthResult {
  score: number;
  label: string;
  color: string;
  isValid: boolean;
  reason?: string;
  hasMinLength: boolean;
  hasLettersAndNumbers: boolean;
  hasNoTrivialPatterns: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: 'Enter password',
      color: 'bg-slate-700',
      isValid: false,
      hasMinLength: false,
      hasLettersAndNumbers: false,
      hasNoTrivialPatterns: true,
    };
  }

  const hasMinLength = password.length >= 8;
  const isAllSameChar = /^(.)\1+$/.test(password);
  const lower = password.toLowerCase();
  const sequentialPatterns = [
    '12345678', '87654321', '123456789', 'abcdefgh', 'password', 'qwertyui',
    '00000000', '11111111', 'admin123', 'pakistan'
  ];
  const hasSequential = sequentialPatterns.some((p) => lower.includes(p));
  const hasNoTrivialPatterns = !isAllSameChar && !hasSequential;

  const hasLetters = /[a-zA-Z]/.test(password);
  const hasDigits = /\d/.test(password);
  const hasLettersAndNumbers = hasLetters && hasDigits;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  let reason: string | undefined;
  if (!hasMinLength) {
    reason = 'Password must be at least 8 characters long.';
  } else if (!hasNoTrivialPatterns) {
    reason = 'Repetitive or sequential patterns like "00000" or "123456" are not allowed.';
  } else if (!hasLettersAndNumbers) {
    reason = 'Password must contain a mix of letters and numbers.';
  }

  const isValid = hasMinLength && hasNoTrivialPatterns && hasLettersAndNumbers;

  let score = 1;
  if (hasMinLength) score++;
  if (hasLettersAndNumbers && hasNoTrivialPatterns) score++;
  if ((hasUpper && hasLower && hasSpecial) || password.length >= 12) score++;

  let label = 'Weak';
  let color = 'bg-rose-500';

  if (!hasMinLength || !hasNoTrivialPatterns || !hasLettersAndNumbers) {
    score = 1;
    label = 'Weak';
    color = 'bg-rose-500';
  } else if (score >= 4) {
    label = 'Strong';
    color = 'bg-emerald-500';
  } else {
    label = 'Intermediate';
    color = 'bg-amber-400';
  }

  return {
    score,
    label,
    color,
    isValid,
    reason,
    hasMinLength,
    hasLettersAndNumbers,
    hasNoTrivialPatterns,
  };
}

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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const handleKeyModifierCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  // Register State
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [semester, setSemester] = useState<SemesterNumber | ''>('');
  const [section, setSection] = useState<Section | ''>('');
  const [rollNumber, setRollNumber] = useState<number | string>('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Real-time password strength evaluation
  const passwordStrength = useMemo(() => evaluatePasswordStrength(regPassword), [regPassword]);

  // Real-time check for duplicate student in the SAME class (Semester + Section)
  const duplicateStudent = useMemo(() => {
    if (!semester || !section) return null;
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

    if (!semester) {
      setRegError('Please select your official semester.');
      return;
    }

    if (!section) {
      setRegError('Please select your official section.');
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

    const strength = evaluatePasswordStrength(regPassword);
    if (!strength.isValid) {
      setRegError(strength.reason || 'Please use an intermediate strength password (at least 8 characters with a mix of letters and numbers, avoiding trivial patterns).');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    const result = registerStudent({
      name: name.trim(),
      fatherName: fatherName.trim(),
      semester: semester as SemesterNumber,
      section: section as Section,
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
            BSCS Portal
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
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'login'
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
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'register'
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
                      User ID / Roll Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. BCS1-A1-001"
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
                      <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold transition"
                      >
                        Help & Support
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyModifierCheck}
                        onKeyUp={handleKeyModifierCheck}
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
                    {isCapsLockOn && (
                      <p className="text-[10px] text-amber-400 font-bold mt-1 flex items-center gap-1 animate-in fade-in">
                        <span>⚠</span> Caps Lock is ON
                      </p>
                    )}
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
                            required
                            value={semester}
                            onChange={(e) => setSemester(e.target.value === '' ? '' : (Number(e.target.value) as SemesterNumber))}
                            className="w-full text-xs font-bold px-2 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                          >
                            <option value="" disabled className="bg-slate-900 text-slate-400">
                              Select Semester
                            </option>
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
                            required
                            value={section}
                            onChange={(e) => setSection(e.target.value as Section)}
                            className="w-full text-xs font-bold px-2 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                          >
                            <option value="" disabled className="bg-slate-900 text-slate-400">
                              Select Section
                            </option>
                            <option value="A1" className="bg-slate-900 text-white">Sec A1</option>
                            <option value="A2" className="bg-slate-900 text-white">Sec A2</option>
                            <option value="B" className="bg-slate-900 text-white">Sec B</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                            Roll No
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={250}
                            required
                            placeholder="e.g. 1"
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value === '' ? '' : Number(e.target.value))}
                            className={`w-full text-xs font-bold px-2.5 py-2.5 rounded-xl bg-slate-950/80 border focus:outline-none transition ${duplicateStudent
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
                              placeholder="Min 8 chars (e.g. Pasrur123)"
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

                      {/* Real-time Password Security Meter */}
                      {regPassword && (
                        <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs animate-in fade-in">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                              Password Security Level:
                            </span>
                            <span
                              className={`font-extrabold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                                passwordStrength.label === 'Strong'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                  : passwordStrength.label === 'Intermediate'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {passwordStrength.label}
                            </span>
                          </div>

                          {/* 4-Segment Strength Bar */}
                          <div className="grid grid-cols-4 gap-1.5 h-1.5">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-full rounded-full transition-all duration-300 ${
                                  passwordStrength.score >= step
                                    ? passwordStrength.color
                                    : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Security Checklist Pills */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] pt-1">
                            <span
                              className={`flex items-center gap-1 ${
                                passwordStrength.hasMinLength ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              <span>{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                              Min 8 characters
                            </span>
                            <span
                              className={`flex items-center gap-1 ${
                                passwordStrength.hasLettersAndNumbers ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              <span>{passwordStrength.hasLettersAndNumbers ? '✓' : '○'}</span>
                              Letters & numbers mix
                            </span>
                            <span
                              className={`flex items-center gap-1 ${
                                passwordStrength.hasNoTrivialPatterns ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              <span>{passwordStrength.hasNoTrivialPatterns ? '✓' : '○'}</span>
                              No simple patterns (00000, 123456)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Submit Registration Button */}
                      <button
                        type="submit"
                        disabled={!!duplicateStudent}
                        className={`w-full py-3.5 mt-2 rounded-xl text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 ${duplicateStudent
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

      {/* --- MODAL: HELP & SUPPORT DIALOG --- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-sm text-white">Login & Account Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-1">
                <span className="font-bold text-purple-300 block">Student Login Format</span>
                <p className="text-[11px] text-purple-200/80">
                  Your Student ID format is <code className="bg-purple-900/60 px-1 py-0.5 rounded text-white font-mono">BCS[Sem]-[Sec]-[Roll]</code>.
                  For example, Semester 1, Section A1, Roll #1 is <strong className="text-white font-mono">BCS1-A1-001</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 space-y-1">
                <span className="font-bold text-indigo-300 block">Teacher Login</span>
                <p className="text-[11px] text-indigo-200/80">
                  Faculty members log in using their registered 11-digit phone number (e.g. <strong className="text-white font-mono">03001234567</strong>).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block">Lost Password or Account Lockout?</span>
                <p className="text-[11px] text-slate-400">
                  Contact Department of Computer Science or HOD (Prof. Dr. Tariq Mahmood) at Govt. Graduate College Pasrur for password reset and roll number verification.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
