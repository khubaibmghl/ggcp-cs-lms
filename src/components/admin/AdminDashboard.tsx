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
} from 'lucide-react';

interface AdminDashboardProps {
  currentTab: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentTab }) => {
  const { users, approveTeacher, rejectTeacher, refreshUsers } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>(dataStore.getSubjects());
  const [selectedSemester, setSelectedSemester] = useState<SemesterNumber>(1);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);

  // New Subject form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSemester, setNewSemester] = useState<SemesterNumber>(1);
  const [newCreditHours, setNewCreditHours] = useState(3);
  const [newDescription, setNewDescription] = useState('');

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
              Department of Computer Science • Manage official course catalogues, approve instructors, and audit student rosters.
            </p>
          </div>

          <button
            onClick={() => setShowAddSubjectModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-purple-950/40"
          >
            <PlusCircle className="w-4 h-4" />
            Add New Subject to Curriculum
          </button>
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
              <span className="text-xs text-purple-200 font-medium">Pending Approvals</span>
              <AlertCircle className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-2xl font-black mt-2 text-amber-300">{pendingTeachers.length}</p>
            <span className="text-[11px] text-purple-300/80">Requires verification</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-200 font-medium">Active Faculty</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            </div>
            <p className="text-2xl font-black mt-2">{approvedTeachers.length}</p>
            <span className="text-[11px] text-purple-300/80">Approved instructors</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-200 font-medium">Enrolled Students</span>
              <GraduationCap className="w-4 h-4 text-purple-300" />
            </div>
            <p className="text-2xl font-black mt-2">{allStudents.length}</p>
            <span className="text-[11px] text-purple-300/80">Sections A1, A2 & B</span>
          </div>
        </div>
      </div>

      {/* PENDING TEACHER APPROVALS SECTION */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              !
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pending Faculty Signups ({pendingTeachers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Teachers who registered and selected their taught subject, awaiting your confirmation.
              </p>
            </div>
          </div>
        </div>

        {pendingTeachers.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">All registered teachers are reviewed</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No pending teacher approvals at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Instructor Name</th>
                  <th className="py-3 px-4">Official Email</th>
                  <th className="py-3 px-4">Taught Semester</th>
                  <th className="py-3 px-4">Selected Subject</th>
                  <th className="py-3 px-4">Registered On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {pendingTeachers.map((teach) => (
                  <tr key={teach.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                        {teach.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900">{teach.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{teach.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px]">
                        Semester {teach.taughtSemester}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-900 font-semibold">
                      {teach.taughtSubjectName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(teach.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => approveTeacher(teach.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectTeacher(teach.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CURRICULUM & SUBJECT CATALOG MANAGER */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Official BS Computer Science Curriculum Catalog
            </h2>
            <p className="text-xs text-slate-500">
              Subjects stored in the database. When teachers register, they select from this list.
            </p>
          </div>

          {/* Semester Selector Buttons */}
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

        {/* Subjects List for Selected Semester */}
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

      {/* ADD NEW SUBJECT MODAL */}
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
                  <p className="text-[11px] text-slate-500">
                    Instructors will be able to select this subject when signing up.
                  </p>
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
                    Course Code (e.g. CS303)
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
                    Semester (1 to 8)
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
                  placeholder="Computer Architecture & Assembly Language"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brief Course Overview
                </label>
                <textarea
                  rows={2}
                  placeholder="Key concepts covered in this course..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
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
                  Save Subject to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
