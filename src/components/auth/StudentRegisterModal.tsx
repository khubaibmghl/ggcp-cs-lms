'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SemesterNumber, Section } from '@/types';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Copy,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (generatedId: string) => void;
}

export const StudentRegisterModal: React.FC<StudentRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
}) => {
  const { registerStudent } = useAuth();

  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [semester, setSemester] = useState<SemesterNumber>(3);
  const [section, setSection] = useState<Section>('A1');
  const [rollNumber, setRollNumber] = useState<number>(5);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Success state with generated ID
  const [issuedId, setIssuedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !fatherName.trim()) {
      setError('Please provide student full name and father name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const result = registerStudent({
      name: name.trim(),
      fatherName: fatherName.trim(),
      semester,
      section,
      rollNumber: Number(rollNumber),
      password,
    });

    setIssuedId(result.generatedLoginId);

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  const handleCopy = () => {
    if (issuedId) {
      navigator.clipboard.writeText(issuedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Top Header */}
        <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/80 border border-purple-400/40 flex items-center justify-center text-white font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Student Self-Registration</h2>
              <p className="text-[11px] text-purple-200">BS Computer Science Assignment Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {issuedId ? (
            /* --- REGISTRATION SUCCESS: ISSUED LOGIN ID CARD --- */
            <div className="text-center space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Registration Complete!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your official student account has been created in the college registry.
                </p>
              </div>

              {/* Highlighted Login ID Card */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-2xl p-4 text-center space-y-1.5 shadow-inner">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                  Your Official Student Login ID
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black font-mono tracking-tight text-purple-950">
                    {issuedId}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 transition"
                    title="Copy Login ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && (
                  <p className="text-[10px] font-bold text-emerald-600">Copied to clipboard!</p>
                )}
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-left text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Important Login Instructions:
                </p>
                <p>
                  You will use your <strong>Student ID ({issuedId})</strong> and your chosen password to log in to submit assignments, view marks, and access semester coursework.
                </p>
              </div>

              <button
                onClick={() => {
                  onSuccessLogin(issuedId);
                  onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20 transition"
              >
                Proceed to Login with this ID
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* --- STUDENT REGISTRATION FORM --- */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hassan Raza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Father Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Raza"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Semester, Section, Roll Number */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value) as SemesterNumber)}
                    className="w-full text-xs font-bold px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
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
                    className="w-full text-xs font-bold px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
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
                    className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                A system-generated Student Login ID (e.g. <strong>BCS26-005</strong>) will be issued upon registration.
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20 transition"
              >
                Register Account & Get Student ID
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
