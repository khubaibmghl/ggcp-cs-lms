'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataStore } from '@/lib/storage';
import { Subject, SemesterNumber, User, Section, TeacherCourseAssignment } from '@/types';
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
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  currentTab: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentTab }) => {
  const { users, approveTeacher, rejectTeacher, createTeacherByAdmin, refreshUsers } = useAuth();
  const { showSuccess, showError, showWarning, confirmDialog } = useToast();
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

  // 2-Step Teacher Creation Form State
  const [teacherWizardStep, setTeacherWizardStep] = useState<1 | 2>(1);
  const [tName, setTName] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPassword, setTPassword] = useState('teacher123');
  const [tMatrixSemester, setTMatrixSemester] = useState<SemesterNumber>(1);
  const [assignedCoursesState, setAssignedCoursesState] = useState<TeacherCourseAssignment[]>([]);
  const [teacherFormError, setTeacherFormError] = useState<string | null>(null);

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
    showSuccess('Subject Added', `${subject.code} - ${subject.name} added to the curriculum catalog.`);
    setNewCode('');
    setNewName('');
    setNewDescription('');
  };

  const handleDeleteSubject = (subject: Subject) => {
    confirmDialog({
      title: 'Delete Official Subject?',
      message: `Are you sure you want to remove "${subject.code} - ${subject.name}" from the official curriculum?`,
      confirmText: 'Delete Subject',
      isDanger: true,
      onConfirm: () => {
        dataStore.deleteSubject(subject.id);
        setSubjects(dataStore.getSubjects());
        showSuccess('Subject Removed', `${subject.code} has been deleted from the curriculum.`);
      },
    });
  };

  // --- Step 2 Matrix Helper Functions ---
  const isSectionSelected = (subjectId: string, section: Section): boolean => {
    const found = assignedCoursesState.find((c) => c.subjectId === subjectId);
    return found ? found.sections.includes(section) : false;
  };

  const getAssignedSectionsForSubject = (subjectId: string): Section[] => {
    const found = assignedCoursesState.find((c) => c.subjectId === subjectId);
    return found ? found.sections : [];
  };

  const toggleTeacherSection = (subject: Subject, section: Section) => {
    setAssignedCoursesState((prev) => {
      const existing = prev.find((c) => c.subjectId === subject.id);
      if (!existing) {
        return [
          ...prev,
          {
            subjectId: subject.id,
            subjectCode: subject.code,
            subjectName: subject.name,
            semester: subject.semester,
            sections: [section],
          },
        ];
      }

      const hasSection = existing.sections.includes(section);
      const newSections = hasSection
        ? existing.sections.filter((s) => s !== section)
        : [...existing.sections, section];

      if (newSections.length === 0) {
        return prev.filter((c) => c.subjectId !== subject.id);
      }

      return prev.map((c) =>
        c.subjectId === subject.id ? { ...c, sections: newSections } : c
      );
    });
  };

  const toggleAllSectionsForSubject = (subject: Subject) => {
    setAssignedCoursesState((prev) => {
      const existing = prev.find((c) => c.subjectId === subject.id);
      const allSections: Section[] = ['A1', 'A2', 'B'];
      if (existing && existing.sections.length === 3) {
        // Unselect all 3
        return prev.filter((c) => c.subjectId !== subject.id);
      }
      if (!existing) {
        return [
          ...prev,
          {
            subjectId: subject.id,
            subjectCode: subject.code,
            subjectName: subject.name,
            semester: subject.semester,
            sections: allSections,
          },
        ];
      }
      return prev.map((c) =>
        c.subjectId === subject.id ? { ...c, sections: allSections } : c
      );
    });
  };

  const removeAssignedCourse = (subjectId: string) => {
    setAssignedCoursesState((prev) => prev.filter((c) => c.subjectId !== subjectId));
  };

  const totalAssignedSectionsCount = assignedCoursesState.reduce(
    (sum, c) => sum + c.sections.length,
    0
  );

  const getSemesterAssignedCount = (sem: SemesterNumber): number => {
    return assignedCoursesState
      .filter((c) => c.semester === sem)
      .reduce((sum, c) => sum + c.sections.length, 0);
  };

  // --- Step 1 Validation & Navigation ---
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim() || !tPhone.trim() || !tPassword.trim()) {
      setTeacherFormError('Please enter teacher full name, phone number (used for login), and initial password.');
      return;
    }
    setTeacherFormError(null);
    setTeacherWizardStep(2);
  };

  // --- Step 2 Final Submission ---
  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignedCoursesState.length === 0) {
      setTeacherFormError('Please assign at least one subject and section (A1, A2, or B) to this faculty member.');
      return;
    }

    createTeacherByAdmin({
      name: tName.trim(),
      phone: tPhone.trim(),
      email: tEmail.trim() || `${tPhone.trim()}@college.edu`,
      password: tPassword.trim(),
      assignedCourses: assignedCoursesState,
    });

    const summary = assignedCoursesState
      .map((c) => `${c.subjectCode} (${c.sections.join(', ')})`)
      .join(', ');

    showSuccess(
      'Faculty Account Created',
      `${tName} registered with Phone User ID: ${tPhone}. Allocated: ${summary}`
    );

    setShowAddTeacherModal(false);
    setTeacherWizardStep(1);
    setTeacherFormError(null);
    setTName('');
    setTPhone('');
    setTEmail('');
    setTPassword('teacher123');
    setAssignedCoursesState([]);
  };

  const openTeacherModal = () => {
    setTeacherWizardStep(1);
    setTeacherFormError(null);
    setTName('');
    setTPhone('');
    setTEmail('');
    setTPassword('teacher123');
    setAssignedCoursesState([]);
    setTMatrixSemester(1);
    setShowAddTeacherModal(true);
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
              onClick={openTeacherModal}
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
            onClick={openTeacherModal}
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
                <th className="py-3 px-4">Assigned Courses & Sections</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {approvedTeachers.map((teach) => {
                const assigned = teach.assignedCourses && teach.assignedCourses.length > 0
                  ? teach.assignedCourses
                  : teach.taughtSubjectName
                  ? [
                      {
                        subjectId: teach.taughtSubjectId || '',
                        subjectCode: teach.taughtSubjectName.split(' ')[0] || 'CS',
                        subjectName: teach.taughtSubjectName,
                        semester: teach.taughtSemester || 1,
                        sections: ['A1', 'A2', 'B'] as Section[],
                      },
                    ]
                  : [];

                return (
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
                      <div className="flex flex-wrap gap-1.5">
                        {assigned.length > 0 ? (
                          assigned.map((c, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-semibold"
                            >
                              <span className="font-bold text-purple-700">{c.subjectCode}</span>
                              <span className="text-slate-500 font-normal">Sem {c.semester}:</span>
                              <span className="font-mono text-purple-950 font-bold">[{c.sections.join(', ')}]</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-xs">No courses assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        Active
                      </span>
                    </td>
                  </tr>
                );
              })}
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
                    onClick={() => handleDeleteSubject(subject)}
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

      {/* --- MODAL: 2-STEP TEACHER CREATION WIZARD --- */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header & 2-Step Indicator */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Create Faculty Account
                    </h3>
                    <p className="text-xs text-slate-500">
                      {teacherWizardStep === 1
                        ? 'Step 1 of 2: Enter teacher personal and authentication credentials'
                        : `Step 2 of 2: Assign semester subjects and sections for ${tName || 'Faculty'}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddTeacherModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition"
                >
                  ✕
                </button>
              </div>

              {/* Step Tabs / Progress */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTeacherWizardStep(1)}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition ${
                    teacherWizardStep === 1
                      ? 'bg-white border-purple-600 shadow-xs'
                      : 'bg-white/60 border-slate-200 hover:bg-white text-slate-500'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      teacherWizardStep === 1
                        ? 'bg-purple-600 text-white'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {teacherWizardStep === 2 ? '✓' : '1'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">Step 1: Personal Details</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {tName ? `${tName} (${tPhone || 'No Phone'})` : 'Name, Phone & Password'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!tName.trim() || !tPhone.trim() || !tPassword.trim()) {
                      setTeacherFormError('Please complete Step 1 (Faculty Name, Phone Number, Password) before proceeding to Course Allocation.');
                      return;
                    }
                    setTeacherFormError(null);
                    setTeacherWizardStep(2);
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition ${
                    teacherWizardStep === 2
                      ? 'bg-white border-purple-600 shadow-xs'
                      : 'bg-white/60 border-slate-200 hover:bg-white text-slate-500'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      teacherWizardStep === 2
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">Step 2: Course & Section Matrix</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {totalAssignedSectionsCount > 0
                        ? `${assignedCoursesState.length} Subjects (${totalAssignedSectionsCount} Sections)`
                        : 'Assign Sections A1, A2, B'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Professional Inline Validation Message Box */}
              {teacherFormError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{teacherFormError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTeacherFormError(null)}
                    className="text-rose-400 hover:text-rose-700 font-bold p-1"
                    title="Dismiss message"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* === STEP 1: PERSONAL DETAILS === */}
              {teacherWizardStep === 1 && (
                <form id="teacher-step-1" onSubmit={handleStep1Next} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Faculty Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Muhammad Usman"
                      value={tName}
                      onChange={(e) => {
                        setTName(e.target.value);
                        if (teacherFormError) setTeacherFormError(null);
                      }}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (Used as Faculty Login User ID) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 03001234567"
                        value={tPhone}
                        onChange={(e) => {
                          setTPhone(e.target.value);
                          if (teacherFormError) setTeacherFormError(null);
                        }}
                        className="w-full text-xs font-mono font-bold pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      The teacher will enter this phone number into the "User ID" login field to access their portal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="usman@college.edu (Optional - auto-generated if left blank)"
                      value={tEmail}
                      onChange={(e) => setTEmail(e.target.value)}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        placeholder="e.g. teacher123"
                        value={tPassword}
                        onChange={(e) => {
                          setTPassword(e.target.value);
                          if (teacherFormError) setTeacherFormError(null);
                        }}
                        className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-purple-900">
                      <p className="font-bold">Next Step: Course & Section Allocation Matrix</p>
                      <p className="text-slate-600 mt-0.5">
                        In the next step, you will select which subjects and sections (A1, A2, and/or B) across semesters 1 to 8 this teacher will teach.
                      </p>
                    </div>
                  </div>
                </form>
              )}

              {/* === STEP 2: COURSE & SECTION MATRIX === */}
              {teacherWizardStep === 2 && (
                <div className="space-y-4">
                  {/* Semester Selector Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">
                        Select Semester to Allocate Courses:
                      </span>
                      <span className="text-[11px] font-semibold text-purple-700">
                        Active Semester: {tMatrixSemester}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map((sem) => {
                        const count = getSemesterAssignedCount(sem);
                        return (
                          <button
                            type="button"
                            key={sem}
                            onClick={() => setTMatrixSemester(sem)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                              tMatrixSemester === sem
                                ? 'bg-purple-700 text-white shadow-sm'
                                : count > 0
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <span>Sem {sem}</span>
                            {count > 0 && (
                              <span
                                className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                                  tMatrixSemester === sem
                                    ? 'bg-white text-purple-800'
                                    : 'bg-purple-700 text-white'
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subject List for this Semester */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Semester {tMatrixSemester} Subjects ({subjects.filter((s) => s.semester === tMatrixSemester).length})
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Select sections for {tName || 'this teacher'} (same or different sections)
                      </span>
                    </div>

                    {subjects.filter((s) => s.semester === tMatrixSemester).length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                        No subjects found in Semester {tMatrixSemester}. Add subjects to curriculum first.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {subjects
                          .filter((s) => s.semester === tMatrixSemester)
                          .map((subject) => {
                            const assignedSecs = getAssignedSectionsForSubject(subject.id);
                            const isAllSelected = assignedSecs.length === 3;

                            return (
                              <div
                                key={subject.id}
                                className={`p-3.5 rounded-2xl border transition-all ${
                                  assignedSecs.length > 0
                                    ? 'bg-purple-50/60 border-purple-200 shadow-xs'
                                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  {/* Subject Info */}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-extrabold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                                        {subject.code}
                                      </span>
                                      <span className="text-xs font-extrabold text-slate-900">
                                        {subject.name}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        ({subject.creditHours} Cr. Hrs)
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                      {subject.description}
                                    </p>
                                  </div>

                                  {/* Section Toggles: A1, A2, B & All */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(['A1', 'A2', 'B'] as Section[]).map((sec) => {
                                      const isSelected = assignedSecs.includes(sec);
                                      return (
                                        <button
                                          type="button"
                                          key={sec}
                                          onClick={() => toggleTeacherSection(subject, sec)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                                            isSelected
                                              ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                          }`}
                                        >
                                          {isSelected ? '✓ ' : ''}Sec {sec}
                                        </button>
                                      );
                                    })}

                                    <button
                                      type="button"
                                      onClick={() => toggleAllSectionsForSubject(subject)}
                                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                        isAllSelected
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'bg-slate-200/70 text-slate-700 border-transparent hover:bg-slate-300'
                                      }`}
                                    >
                                      {isAllSelected ? '✓ All Sections' : 'All Sections'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Summary of All Selected Course Assignments */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Assigned Teaching Load Summary ({assignedCoursesState.length} Subjects, {totalAssignedSectionsCount} Sections):
                      </span>
                      {assignedCoursesState.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAssignedCoursesState([])}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {assignedCoursesState.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No courses or sections selected yet. Click the Section buttons (A1, A2, B) above to allocate classes to this instructor.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {assignedCoursesState.map((c) => (
                          <span
                            key={c.subjectId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold"
                          >
                            <span>{c.subjectCode}</span>
                            <span className="text-purple-600 font-medium">(Sem {c.semester})</span>
                            <span className="bg-purple-200/80 px-1.5 py-0.5 rounded text-[11px] font-mono text-purple-950">
                              {c.sections.join(', ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAssignedCourse(c.subjectId)}
                              className="text-purple-400 hover:text-rose-600 ml-1 font-bold"
                              title="Remove course"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
              {teacherWizardStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAddTeacherModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-900/20 transition"
                  >
                    Next: Assign Courses & Sections
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setTeacherWizardStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-300 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Personal Details
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTeacherModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateTeacher}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/20 transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      Save & Create Faculty Account
                    </button>
                  </div>
                </>
              )}
            </div>
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
