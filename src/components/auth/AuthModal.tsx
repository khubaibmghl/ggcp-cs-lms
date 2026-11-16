'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataStore } from '@/lib/storage';
import { SemesterNumber, Section } from '@/types';
import {
  GraduationCap,
  Award,
  ShieldCheck,
  UserCheck,
  X,
  Mail,
  Lock,
  User,
  Hash,
  BookOpen,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, registerStudent, registerTeacher, users } = useAuth();
  const [tab, setTab] = useState<'login' | 'student-signup' | 'teacher-signup'>('student-signup');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');

  // Student Sign up state
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sRoll, setSRoll] = useState<number>(5);
  const [sSemester, setSSemester] = useState<SemesterNumber>(3);
  const [sSection, setSSection] = useState<Section>('A1');

  // Teacher Sign up state
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tSemester, setTSemester] = useState<SemesterNumber>(3);
  const subjects = dataStore.getSubjects();
  const semesterSubjects = subjects.filter((s) => s.semester === tSemester);
  const [tSubjectId, setTSubjectId] = useState<string>(
    semesterSubjects[0]?.id || subjects[0]?.id || ''
  );

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    const success = login(loginEmail.trim());
    if (success) {
      onClose();
    } else {
      alert('Account not found with this email. You can register a new account below.');
    }
  };

  const handleStudentSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim() || !sEmail.trim() || !sRoll) return;

    registerStudent({
      name: sName.trim(),
      email: sEmail.trim(),
      rollNumber: Number(sRoll),
      semester: sSemester,
      section: sSection,
    });

    alert(`Student Account created! Welcome, ${sName} (Roll #${sRoll}, Section ${sSection}).`);
    onClose();
  };

  const handleTeacherSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim() || !tEmail.trim()) return;

    const chosenSubject = subjects.find((s) => s.id === tSubjectId) || semesterSubjects[0];

    registerTeacher({
      name: tName.trim(),
      email: tEmail.trim(),
      taughtSemester: tSemester,
      taughtSubjectId: chosenSubject.id,
      taughtSubjectName: `${chosenSubject.code} - ${chosenSubject.name}`,
    });

    alert(
      `Faculty Account created for ${tName}! Your account is now in 'Pending' status awaiting Admin approval.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Top Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">Apex LMS Portal Access</h2>
              <p className="text-[11px] text-purple-300">Department of Computer Science</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-50">
          <button
            onClick={() => setTab('student-signup')}
            className={`flex-1 py-3 text-center transition ${
              tab === 'student-signup'
                ? 'text-purple-700 border-b-2 border-purple-700 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Student Sign Up
          </button>
          <button
            onClick={() => setTab('teacher-signup')}
            className={`flex-1 py-3 text-center transition ${
              tab === 'teacher-signup'
                ? 'text-purple-700 border-b-2 border-purple-700 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Teacher Sign Up
          </button>
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-3 text-center transition ${
              tab === 'login'
                ? 'text-purple-700 border-b-2 border-purple-700 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {/* --- STUDENT SIGNUP FORM --- */}
          {tab === 'student-signup' && (
            <form onSubmit={handleStudentSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hassan Raza"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Email</label>
                <input
                  type="email"
                  required
                  placeholder="hassan.raza@student.college.edu"
                  value={sEmail}
                  onChange={(e) => setSEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Roll No (1..N)</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={sRoll}
                    onChange={(e) => setSRoll(Number(e.target.value))}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={sSemester}
                    onChange={(e) => setSSemester(Number(e.target.value) as SemesterNumber)}
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
                    value={sSection}
                    onChange={(e) => setSSection(e.target.value as Section)}
                    className="w-full text-xs font-bold px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="A1">Sec A1</option>
                    <option value="A2">Sec A2</option>
                    <option value="B">Sec B</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  defaultValue="student123"
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20 transition"
              >
                Create Student Account & Enter
              </button>
            </form>
          )}

          {/* --- TEACHER SIGNUP FORM --- */}
          {tab === 'teacher-signup' && (
            <form onSubmit={handleTeacherSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Kamran Akram"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  placeholder="kamran.akram@college.edu"
                  value={tEmail}
                  onChange={(e) => setTEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Semester You Teach
                </label>
                <select
                  value={tSemester}
                  onChange={(e) => {
                    const sem = Number(e.target.value) as SemesterNumber;
                    setTSemester(sem);
                    const subList = subjects.filter((s) => s.semester === sem);
                    if (subList.length > 0) setTSubjectId(subList[0].id);
                  }}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      BS CS Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Taught Subject (Configured by Admin)
                </label>
                <select
                  value={tSubjectId}
                  onChange={(e) => setTSubjectId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {semesterSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                Notice: Newly registered teacher accounts require approval by the Head of Department (Admin) before publishing assignments.
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20 transition"
              >
                Register Faculty Account
              </button>
            </form>
          )}

          {/* --- SIGN IN FORM --- */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registered Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@college.edu or sarah.khan@college.edu"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  defaultValue="demo123"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20 transition"
              >
                Sign In to Portal
              </button>

              <div className="pt-2 text-[11px] text-slate-400 text-center">
                Tip: You can also use the top &quot;Role Preview&quot; switcher anytime to switch between Admin, Teacher, and Student profiles instantly.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
