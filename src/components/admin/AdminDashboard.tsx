'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataStore } from '@/lib/storage';
import { Subject, SemesterNumber, User } from '@/types';
import {
  Layers,
  CheckCircle2,
  XCircle,
  PlusCircle,
  BookOpen,
  Users,
  GraduationCap,
  ShieldCheck,
  Search,
  Trash2,
  AlertCircle,
  UserPlus,
  Phone,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  currentTab: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentTab }) => {
  const { users, approveTeacher, rejectTeacher, createTeacherByAdmin, refreshUsers } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>(dataStore.getSubjects());
  const [selectedSemester, setSelectedSemester] = useState<SemesterNumber>(1);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);

  // New Subject form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSemester, setNewSemester] = useState<SemesterNumber>(1);
  const [newCreditHours, setNewCreditHours] = useState(3);
  const [newDescription, setNewDescription] = useState('');

  // New Teacher creation form state (Admin direct creation)
  const [tName, setTName] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPassword, setTPassword] = useState('teacher123');
  const [tSemester, setTSemester] = useState<SemesterNumber>(3);
  const semesterSubjects = subjects.filter((s) => s.semester === tSemester);
  const [tSubjectId, setTSubjectId] = useState<string>(
    semesterSubjects[0]?.id || subjects[0]?.id || ''
  );

  const pendingTeachers = users.filter((u) => u.role === 'teacher' && u.status === 'pending');
  const approvedTeachers = users.filter((u) => u.role === 'teacher' && u.status === 'approved');
  const allStudents = users.filter((u) => u.role === 'student');

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    const subject: Subject = {
      id: `sub-${newCode.toLowerCase().replace(/\s+/g, '')}-${Date.now()}`,
      code: newCode.toUpperCase().trim(),
      name: newName.trim(),
      semester: newSemester,
      creditHours: Number(newCreditHours),
      description: newDescription.trim() || 'Core Computer Science curriculum course.',
    };

    dataStore.addSubject(subject);
    setSubjects(dataStore.getSubjects());
    setShowAddSubjectModal(false);
    setNewCode('');
    setNewName('');
    setNewDescription('');
  };

  const handleDeleteSubject = (id: string) => {
    if (confirm('Are you sure you want to delete this subject from the official curriculum?')) {
      dataStore.deleteSubject(id);
      setSubjects(dataStore.getSubjects());
    }
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim() || !tPhone.trim() || !tPassword.trim()) {
      alert('Please fill in teacher name, phone number, and password.');
      return;
    }

    const chosenSubject = subjects.find((s) => s.id === tSubjectId) || semesterSubjects[0];

    createTeacherByAdmin({
      name: tName.trim(),
      phone: tPhone.trim(),
      email: tEmail.trim() || `${tPhone.trim()}@college.edu`,
      password: tPassword.trim(),
      taughtSemester: tSemester,
      taughtSubjectId: chosenSubject.id,
      taughtSubjectName: `${chosenSubject.code} - ${chosenSubject.name}`,
    });

    alert(
      `Teacher account created successfully! The teacher can now log in using Phone Number: ${tPhone} and Password: ${tPassword}`
    );
    setShowAddTeacherModal(false);
    setTName('');
    setTPhone('');
    setTEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-300" />
              Administrative Command Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Curriculum & Faculty Governance
            </h1>
            <p className="text-sm text-purple-200/80 mt-1">
              Admin: Prof. Dr. Tariq Mahmood • Create faculty accounts, manage official curriculum, and audit rosters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-950/40"
            >
              <UserPlus className="w-4 h-4" />
              Create Teacher Account
            </button>
            <button
              onClick={() => setShowAddSubjectModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-purple-950/40"
            >
              <PlusCircle className="w-4 h-4" />
              Add Subject
            </button>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-200 font-medium">Official Subjects</span>
              <BookOpen className="w-4 h-4 text-purple-300" />
            </div>
            <p className="text-2xl font-black mt-2">{subjects.length}</p>
            <span className="text-[11px] text-purple-300/80">Across 8 Semesters</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-200 font-medium">Active Faculty</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            </div>
            <p className="text-2xl font-black mt-2">{approvedTeachers.length}</p>
            <span className="text-[11px] text-purple-300/80">Login via Phone Number</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-200 font-medium">Pending Approvals</span>
              <AlertCircle className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-2xl font-black mt-2 text-amber-300">{pendingTeachers.length}</p>
            <span className="text-[11px] text-purple-300/80">Awaiting confirmation</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-200 font-medium">Registered Students</span>
              <GraduationCap className="w-4 h-4 text-purple-300" />
            </div>
            <p className="text-2xl font-black mt-2">{allStudents.length}</p>
            <span className="text-[11px] text-purple-300/80">With Student IDs</span>
          </div>
        </div>
      </div>

      {/* FACULTY DIRECTORY & CREATION SECTION */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Approved Faculty Accounts ({approvedTeachers.length})
            </h2>
            <p className="text-xs text-slate-500">
              Instructors log in using their registered Phone Number and password.
            </p>
          </div>
          <button
            onClick={() => setShowAddTeacherModal(true)}
            className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
          >
            + Create New Teacher
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Faculty Name</th>
                <th className="py-3 px-4">Login Phone Number</th>
                <th className="py-3 px-4">Official Email</th>
                <th className="py-3 px-4">Semester & Taught Subject</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {approvedTeachers.map((teach) => (
                <tr key={teach.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                      {teach.name.charAt(0)}
                    </div>
                    {teach.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-900">
                    {teach.phone || 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">{teach.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900">
                      Sem {teach.taughtSemester}: {teach.taughtSubjectName}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CURRICULUM & SUBJECT CATALOG MANAGER */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Official BS Computer Science Curriculum Catalog
            </h2>
            <p className="text-xs text-slate-500">
              Subjects stored in the database. When assigning teachers, they map to these subjects.
            </p>
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                  selectedSemester === sem
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sem {sem}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {subjects
            .filter((s) => s.semester === selectedSemester)
            .map((subject) => (
              <div
                key={subject.id}
                className="bg-slate-50 hover:bg-purple-50/40 rounded-2xl p-4 border border-slate-200 transition-all hover:border-purple-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      {subject.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {subject.creditHours} Credit Hours
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-900">
                    {subject.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {subject.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">BS CS Semester {subject.semester}</span>
                  <button
                    onClick={() => handleDeleteSubject(subject.id)}
                    title="Remove subject"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* --- MODAL: CREATE TEACHER BY ADMIN --- */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Faculty Account</h3>
                  <p className="text-[11px] text-slate-500">Teacher will log in via phone number.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTeacherModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instructor Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Muhammad Usman"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number (Used for Login)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 03001234567"
                  value={tPhone}
                  onChange={(e) => setTPhone(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  placeholder="usman@college.edu"
                  value={tEmail}
                  onChange={(e) => setTEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Taught Semester
                  </label>
                  <select
                    value={tSemester}
                    onChange={(e) => {
                      const sem = Number(e.target.value) as SemesterNumber;
                      setTSemester(sem);
                      const subList = subjects.filter((s) => s.semester === sem);
                      if (subList.length > 0) setTSubjectId(subList[0].id);
                    }}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Taught Subject
                  </label>
                  <select
                    value={tSubjectId}
                    onChange={(e) => setTSubjectId(e.target.value)}
                    className="w-full text-xs font-medium px-2 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {semesterSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. teacher123"
                  value={tPassword}
                  onChange={(e) => setTPassword(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/20"
                >
                  Save & Create Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD NEW SUBJECT --- */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Subject to Curriculum</h3>
                  <p className="text-[11px] text-slate-500">Official course catalog entry.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CS303"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={newSemester}
                    onChange={(e) => setNewSemester(Number(e.target.value) as SemesterNumber)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Computer Architecture"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Credit Hours
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={newCreditHours}
                  onChange={(e) => setNewCreditHours(Number(e.target.value))}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-900/20"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
