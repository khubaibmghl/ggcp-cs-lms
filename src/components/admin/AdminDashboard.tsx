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
  ShieldAlert,
  AlertTriangle,
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
  Filter,
  Download,
  Upload,
  Edit3,
  FileSpreadsheet,
} from 'lucide-react';

interface AdminDashboardProps {
  currentTab: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentTab }) => {
  const { users, approveTeacher, rejectTeacher, createTeacherByAdmin, deleteStudent } = useAuth();
  const { showSuccess, showError, showWarning, confirmDialog } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>(dataStore.getSubjects());
  const [selectedSemester, setSelectedSemester] = useState<SemesterNumber>(1);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);

  // Edit Subject Modal State
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editSemester, setEditSemester] = useState<SemesterNumber>(1);
  const [editCreditHours, setEditCreditHours] = useState(3);
  const [editDescription, setEditDescription] = useState('');

  // Custom Delete Student Confirmation Modal State
  const [studentToDelete, setStudentToDelete] = useState<User | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Bulk Import Students Modal State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkTargetSemester, setBulkTargetSemester] = useState<SemesterNumber>(1);
  const [bulkTargetSection, setBulkTargetSection] = useState<Section>('A1');
  const [bulkParsedStudents, setBulkParsedStudents] = useState<
    Array<{
      rollNumber: number;
      name: string;
      fatherName: string;
      semester: SemesterNumber;
      section: Section;
      password?: string;
      status: 'valid' | 'duplicate' | 'invalid';
      error?: string;
    }>
  >([]);

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

  // Roster Tab Filtering State
  const [rosterSemesterFilter, setRosterSemesterFilter] = useState<'All' | SemesterNumber>('All');
  const [rosterSectionFilter, setRosterSectionFilter] = useState<'All' | Section>('All');
  const [rosterSearchTerm, setRosterSearchTerm] = useState('');

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
    showSuccess('Subject Added', `${subject.code} - ${subject.name} added to curriculum.`);
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
        showSuccess('Subject Removed', `${subject.code} has been deleted from curriculum.`);
      },
    });
  };

  const handleOpenEditSubject = (subj: Subject) => {
    setEditingSubject(subj);
    setEditCode(subj.code);
    setEditName(subj.name);
    setEditSemester(subj.semester);
    setEditCreditHours(subj.creditHours);
    setEditDescription(subj.description || '');
  };

  const handleSaveEditSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editCode.trim() || !editName.trim()) return;

    dataStore.updateSubject(editingSubject.id, {
      code: editCode.toUpperCase().trim(),
      name: editName.trim(),
      semester: editSemester,
      creditHours: Number(editCreditHours),
      description: editDescription.trim() || 'Core Computer Science curriculum course.',
    });

    setSubjects(dataStore.getSubjects());
    setEditingSubject(null);
    showSuccess('Subject Updated', `Updated course details for ${editCode.toUpperCase()}.`);
  };

  const handleDeleteStudent = (stud: User) => {
    setStudentToDelete(stud);
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeletingStudent(true);
    try {
      await deleteStudent(studentToDelete.id, {
        loginId: studentToDelete.loginId,
        semester: studentToDelete.semester,
        section: studentToDelete.section,
        rollNumber: studentToDelete.rollNumber,
      });
      showSuccess(
        'Student Removed',
        `${studentToDelete.name} (Roll #${studentToDelete.rollNumber}) has been permanently deleted from the college registry.`
      );
      setStudentToDelete(null);
    } catch {
      showError('Deletion Failed', 'Failed to remove student record. Please try again.');
    } finally {
      setIsDeletingStudent(false);
    }
  };

  const handleExportRosterCsv = () => {
    if (filteredStudents.length === 0) {
      showWarning('No Students', 'No student records to export for the current filters.');
      return;
    }

    const headers = [
      'Sr #',
      'Roll Number',
      'Student Full Name',
      'Father Name',
      'Semester',
      'Section',
      'College Login ID',
      'Registration Date',
    ];

    const sortedStudents = [...filteredStudents].sort(
      (a, b) => (a.rollNumber || 0) - (b.rollNumber || 0)
    );

    const rows = sortedStudents.map((stud, idx) =>
      [
        idx + 1,
        stud.rollNumber || 'N/A',
        `"${stud.name.replace(/"/g, '""')}"`,
        `"${(stud.fatherName || '').replace(/"/g, '""')}"`,
        stud.semester,
        stud.section,
        stud.loginId || 'N/A',
        `"${new Date(stud.createdAt).toLocaleDateString()}"`,
      ].join(',')
    );

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GGCP_BSCS_Student_Roster_Sem${rosterSemesterFilter}_Sec${rosterSectionFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess('Roster Exported', `Exported ${sortedStudents.length} student records to CSV.`);
  };

  const handleDownloadCsvTemplate = () => {
    const headers = 'Roll Number,Full Name,Father Name,Semester,Section,Password';
    const sampleRows = [
      '1,Muhammad Ali,Tariq Mahmood,1,A1,student123',
      '2,Usman Ahmad,Bashir Ahmad,1,A1,student123',
      '3,Zainab Fatima,Abdul Rehman,1,A1,student123',
      '4,Hamza Khalid,Khalid Javed,1,A1,student123',
    ];
    const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'GGCP_Student_Bulk_Import_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseBulkCsv = (rawText: string) => {
    setBulkCsvText(rawText);
    if (!rawText.trim()) {
      setBulkParsedStudents([]);
      return;
    }

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setBulkParsedStudents([]);
      return;
    }

    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes('roll') ||
      firstLineLower.includes('name') ||
      firstLineLower.includes('semester')
    ) {
      startIndex = 1;
    }

    const existingUsers = dataStore.getUsers();
    const parsed: Array<{
      rollNumber: number;
      name: string;
      fatherName: string;
      semester: SemesterNumber;
      section: Section;
      password?: string;
      status: 'valid' | 'duplicate' | 'invalid';
      error?: string;
    }> = [];

    const currentBatchRolls = new Set<string>();

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) =>
        p.trim().replace(/^"|"$/g, '')
      );

      if (parts.length < 2) continue;

      const rollRaw = parseInt(parts[0], 10);
      const nameRaw = parts[1];
      const fatherNameRaw = parts[2] || '';
      const semRaw = parts[3] ? parseInt(parts[3], 10) : bulkTargetSemester;
      const secRaw = parts[4] ? parts[4].toUpperCase() : bulkTargetSection;
      const passRaw = parts[5] || 'student123';

      if (isNaN(rollRaw) || rollRaw <= 0) {
        parsed.push({
          rollNumber: 0,
          name: nameRaw || `Row ${i + 1}`,
          fatherName: fatherNameRaw,
          semester: 1,
          section: 'A1',
          status: 'invalid',
          error: 'Invalid Roll Number',
        });
        continue;
      }

      if (!nameRaw) {
        parsed.push({
          rollNumber: rollRaw,
          name: 'Missing Name',
          fatherName: fatherNameRaw,
          semester: 1,
          section: 'A1',
          status: 'invalid',
          error: 'Student Name is required',
        });
        continue;
      }

      const validatedSem = (
        semRaw >= 1 && semRaw <= 8 ? semRaw : bulkTargetSemester
      ) as SemesterNumber;
      const validatedSec = (
        ['A1', 'A2', 'B'].includes(secRaw) ? secRaw : bulkTargetSection
      ) as Section;

      const batchKey = `${validatedSem}-${validatedSec}-${rollRaw}`;
      if (currentBatchRolls.has(batchKey)) {
        parsed.push({
          rollNumber: rollRaw,
          name: nameRaw,
          fatherName: fatherNameRaw,
          semester: validatedSem,
          section: validatedSec,
          password: passRaw,
          status: 'duplicate',
          error: `Duplicate in this file (Roll #${rollRaw})`,
        });
        continue;
      }
      currentBatchRolls.add(batchKey);

      const alreadyExists = existingUsers.some(
        (u) =>
          u.role === 'student' &&
          u.semester === validatedSem &&
          u.section === validatedSec &&
          u.rollNumber === rollRaw
      );

      if (alreadyExists) {
        parsed.push({
          rollNumber: rollRaw,
          name: nameRaw,
          fatherName: fatherNameRaw,
          semester: validatedSem,
          section: validatedSec,
          password: passRaw,
          status: 'duplicate',
          error: `Already registered in Sem ${validatedSem} ${validatedSec}`,
        });
      } else {
        parsed.push({
          rollNumber: rollRaw,
          name: nameRaw,
          fatherName: fatherNameRaw,
          semester: validatedSem,
          section: validatedSec,
          password: passRaw,
          status: 'valid',
        });
      }
    }

    setBulkParsedStudents(parsed);
  };

  const handleCommitBulkImport = () => {
    const validStudents = bulkParsedStudents.filter((s) => s.status === 'valid');
    if (validStudents.length === 0) {
      showError('No Valid Records', 'No valid student records found to import.');
      return;
    }

    let addedCount = 0;
    for (const stud of validStudents) {
      const loginId = dataStore.generateStudentLoginId(
        stud.semester,
        stud.section,
        stud.rollNumber
      );
      const newUser: User = {
        id: `student-${stud.semester}-${stud.section}-${stud.rollNumber}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        name: stud.name,
        fatherName: stud.fatherName,
        email: `${loginId.toLowerCase()}@student.college.edu`,
        rollNumber: stud.rollNumber,
        semester: stud.semester,
        section: stud.section,
        loginId,
        password: stud.password || 'student123',
        role: 'student',
        status: 'approved',
        createdAt: new Date().toISOString(),
      };
      dataStore.addUser(newUser);
      addedCount++;
    }

    showSuccess(
      'Bulk Import Complete',
      `Successfully enrolled ${addedCount} students into the college registry.`
    );

    setShowBulkImportModal(false);
    setBulkCsvText('');
    setBulkParsedStudents([]);
  };

  // Step 2 Matrix Helpers
  const isSectionSelected = (subjectId: string, section: Section): boolean => {
    const found = assignedCoursesState.find((c) => c.subjectId === subjectId);
    return found ? found.sections.includes(section) : false;
  };

  const toggleCourseSection = (subject: Subject, section: Section) => {
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

      const hasSec = existing.sections.includes(section);
      let updatedSections: Section[] = [];
      if (hasSec) {
        updatedSections = existing.sections.filter((s) => s !== section);
      } else {
        updatedSections = [...existing.sections, section];
      }

      if (updatedSections.length === 0) {
        return prev.filter((c) => c.subjectId !== subject.id);
      }

      return prev.map((c) => (c.subjectId === subject.id ? { ...c, sections: updatedSections } : c));
    });
  };

  const removeAssignedCourse = (subjectId: string) => {
    setAssignedCoursesState((prev) => prev.filter((c) => c.subjectId !== subjectId));
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherFormError(null);

    if (!tName.trim()) {
      setTeacherFormError('Please enter the full faculty member name.');
      return;
    }
    if (!tPhone.trim()) {
      setTeacherFormError('Please enter a valid phone number (used for teacher login).');
      return;
    }
    if (!tPassword.trim() || tPassword.length < 6) {
      setTeacherFormError('Please enter an initial password of at least 6 characters.');
      return;
    }

    const cleanPhone = tPhone.replace(/[-\s]/g, '');
    const phoneExists = users.some(
      (u) => u.phone && u.phone.replace(/[-\s]/g, '') === cleanPhone
    );
    if (phoneExists) {
      setTeacherFormError(`A user with phone number "${tPhone}" already exists.`);
      return;
    }

    setTeacherWizardStep(2);
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherFormError(null);

    if (assignedCoursesState.length === 0) {
      setTeacherFormError('Please allocate at least one course and section in Step 2.');
      return;
    }

    const firstCourse = assignedCoursesState[0];
    const emailToUse = tEmail.trim() || `${tName.toLowerCase().replace(/[^a-z0-9]/g, '')}@college.edu`;

    try {
      createTeacherByAdmin({
        name: tName.trim(),
        phone: tPhone.trim(),
        email: emailToUse,
        password: tPassword.trim(),
        assignedCourses: assignedCoursesState,
        taughtSemester: firstCourse.semester,
        taughtSubjectId: firstCourse.subjectId,
        taughtSubjectName: `${firstCourse.subjectCode} - ${firstCourse.subjectName}`,
      });

      showSuccess(
        'Teacher Account Created',
        `Prof. ${tName} created. They can log in using phone number "${tPhone}".`
      );

      setShowAddTeacherModal(false);
      setTeacherWizardStep(1);
      setTName('');
      setTPhone('');
      setTEmail('');
      setTPassword('teacher123');
      setAssignedCoursesState([]);
      setTeacherFormError(null);
    } catch {
      setTeacherFormError('Failed to create faculty account. Please try again.');
    }
  };

  const openTeacherModal = () => {
    setTeacherWizardStep(1);
    setTName('');
    setTPhone('');
    setTEmail('');
    setTPassword('teacher123');
    setAssignedCoursesState([]);
    setTeacherFormError(null);
    setTMatrixSemester(1);
    setShowAddTeacherModal(true);
  };

  // Filter students for Roster Tab
  const filteredStudents = allStudents.filter((stud) => {
    if (rosterSemesterFilter !== 'All' && stud.semester !== rosterSemesterFilter) return false;
    if (rosterSectionFilter !== 'All' && stud.section !== rosterSectionFilter) return false;
    if (rosterSearchTerm.trim()) {
      const term = rosterSearchTerm.toLowerCase().trim();
      const matchName = stud.name.toLowerCase().includes(term);
      const matchRoll = String(stud.rollNumber).includes(term);
      const matchId = stud.loginId?.toLowerCase().includes(term);
      if (!matchName && !matchRoll && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Administrative Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-300" />
              Administrative Command Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currentTab === 'curriculum'
                ? 'Curriculum & Subjects Catalog'
                : currentTab === 'teacher-approvals'
                ? 'Faculty Governance & Workload Matrix'
                : currentTab === 'roster'
                ? 'All Students & Class Rosters'
                : 'Curriculum & Faculty Governance'}
            </h1>
            <p className="text-sm text-purple-200/80 mt-1">
              Admin: Prof. Dr. Tariq Mahmood • Department of Computer Science • GGC Pasrur
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

      {/* ===================================================================== */}
      {/* TAB: 'teacher-approvals' OR 'dashboard' -> FACULTY DIRECTORY & APPROVALS */}
      {/* ===================================================================== */}
      {(currentTab === 'teacher-approvals' || currentTab === 'dashboard') && (
        <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in">
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
                  const assigned =
                    teach.assignedCourses && teach.assignedCourses.length > 0
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
      )}

      {/* ===================================================================== */}
      {/* TAB: 'curriculum' OR 'dashboard' -> CURRICULUM CATALOG */}
      {/* ===================================================================== */}
      {(currentTab === 'curriculum' || currentTab === 'dashboard') && (
        <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Official BS Computer Science Curriculum Catalog
              </h2>
              <p className="text-xs text-slate-500">
                Curriculum courses across all 8 semesters. Faculty course mapping links directly to this catalog.
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
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {subject.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      Semester {subject.semester}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSubject(subject)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition"
                        title="Edit Subject"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(subject)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB: 'roster' -> ALL STUDENTS & CLASS ROSTERS */}
      {/* ===================================================================== */}
      {(currentTab === 'roster' || currentTab === 'dashboard') && (
        <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                All Students Directory & Class Rosters ({filteredStudents.length})
              </h2>
              <p className="text-xs text-slate-500">
                View enrolled student profiles, verified roll numbers, and system-issued login IDs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition shadow-2xs"
                title="Bulk import students via CSV file"
              >
                <Upload className="w-3.5 h-3.5 text-purple-700" />
                <span>Bulk Import (CSV)</span>
              </button>

              <button
                type="button"
                onClick={handleExportRosterCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition shadow-2xs"
                title="Download student roster as CSV file"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export Roster (CSV)</span>
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, roll # or ID..."
                  value={rosterSearchTerm}
                  onChange={(e) => setRosterSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 w-48 sm:w-56 font-medium"
                />
              </div>

              <select
                value={rosterSemesterFilter}
                onChange={(e) =>
                  setRosterSemesterFilter(
                    e.target.value === 'All' ? 'All' : (Number(e.target.value) as SemesterNumber)
                  )
                }
                className="px-2.5 py-1.5 rounded-xl text-xs border border-slate-200 font-semibold"
              >
                <option value="All">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>

              <select
                value={rosterSectionFilter}
                onChange={(e) => setRosterSectionFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl text-xs border border-slate-200 font-semibold"
              >
                <option value="All">All Sections</option>
                {['A1', 'A2', 'B'].map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Showing <strong>{filteredStudents.length}</strong> of <strong>{allStudents.length}</strong> students
            </span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No student records match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-center">Roll #</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Father Name</th>
                    <th className="py-3 px-4 text-center">Semester</th>
                    <th className="py-3 px-4 text-center">Section</th>
                    <th className="py-3 px-4">System Login ID</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStudents.map((stud) => (
                    <tr key={stud.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-900">
                        {stud.rollNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {stud.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {stud.fatherName || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          Sem {stud.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 font-bold text-[11px]">
                          {stud.section}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {stud.loginId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(stud.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(stud)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Remove student record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* --- MODAL: 2-STEP TEACHER CREATION WIZARD --- */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden">
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
                      setTeacherFormError('Please complete Step 1 (Faculty Name, Phone Number, Password) before proceeding.');
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
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">Step 2: Course Allocation</p>
                    <p className="text-[11px] text-slate-500">
                      {assignedCoursesState.length > 0
                        ? `${assignedCoursesState.length} course(s) mapped`
                        : 'Assign subjects & sections'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {teacherFormError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{teacherFormError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTeacherFormError(null)}
                    className="text-rose-400 hover:text-rose-700 font-bold p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {teacherWizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Faculty Member Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Prof. Dr. Muhammad Ahmad"
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number (Login ID)
                      </label>
                      <input
                        type="tel"
                        placeholder="03001234567"
                        value={tPhone}
                        onChange={(e) => setTPhone(e.target.value)}
                        className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Initial Password
                      </label>
                      <input
                        type="text"
                        placeholder="teacher123"
                        value={tPassword}
                        onChange={(e) => setTPassword(e.target.value)}
                        className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official College Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="teacher@college.edu"
                      value={tEmail}
                      onChange={(e) => setTEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>
              )}

              {teacherWizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                    {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map((sem) => (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setTMatrixSemester(sem)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                          tMatrixSemester === sem
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Sem {sem}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">
                      Select subjects and assign sections for Semester {tMatrixSemester}:
                    </p>

                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {subjects
                        .filter((s) => s.semester === tMatrixSemester)
                        .map((sub) => (
                          <div
                            key={sub.id}
                            className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-purple-700">{sub.code}</span>
                              <span className="font-bold text-slate-900 ml-1.5">{sub.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {(['A1', 'A2', 'B'] as Section[]).map((sec) => {
                                const selected = isSectionSelected(sub.id, sec);
                                return (
                                  <button
                                    key={sec}
                                    type="button"
                                    onClick={() => toggleCourseSection(sub, sec)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition border ${
                                      selected
                                        ? 'bg-purple-600 text-white border-purple-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50'
                                    }`}
                                  >
                                    Sec {sec}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {assignedCoursesState.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs space-y-1">
                      <span className="font-bold text-purple-900 block">Total Mapped Courses:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedCoursesState.map((c) => (
                          <span
                            key={c.subjectId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-purple-900 border border-purple-200 text-[11px] font-semibold"
                          >
                            <span>{c.subjectCode}</span>
                            <span className="text-slate-400 font-mono">[{c.sections.join(', ')}]</span>
                            <button
                              type="button"
                              onClick={() => removeAssignedCourse(c.subjectId)}
                              className="text-rose-500 hover:text-rose-700 font-bold ml-1"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
              {teacherWizardStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAddTeacherModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-900/20 transition"
                  >
                    Next: Assign Courses
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setTeacherWizardStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTeacherModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
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

      {/* --- MODAL: EDIT SUBJECT --- */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-700" />
                Edit Curriculum Subject
              </h3>
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSubject} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CS303"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={editSemester}
                    onChange={(e) => setEditSemester(Number(e.target.value) as SemesterNumber)}
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editCreditHours}
                  onChange={(e) => setEditCreditHours(Number(e.target.value))}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Course Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Core syllabus and topics covered..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-900/20"
                >
                  Update Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: BULK CSV STUDENT IMPORT --- */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Bulk Import Students (CSV)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Enroll an entire class batch at once with auto-generated college login IDs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition shadow-2xs"
                    title="Download preformatted CSV template"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkImportModal(false);
                      setBulkCsvText('');
                      setBulkParsedStudents([]);
                    }}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Target Defaults */}
              <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-slate-200/60 text-xs font-semibold text-slate-700">
                <span>Default Target:</span>
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-slate-500">Semester:</label>
                  <select
                    value={bulkTargetSemester}
                    onChange={(e) => {
                      const sem = Number(e.target.value) as SemesterNumber;
                      setBulkTargetSemester(sem);
                      if (bulkCsvText) parseBulkCsv(bulkCsvText);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-slate-500">Section:</label>
                  <select
                    value={bulkTargetSection}
                    onChange={(e) => {
                      const sec = e.target.value as Section;
                      setBulkTargetSection(sec);
                      if (bulkCsvText) parseBulkCsv(bulkCsvText);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white font-bold"
                  >
                    {['A1', 'A2', 'B'].map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[11px] text-slate-400 italic">
                  (Used if Semester or Section is not specified in the CSV)
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* File Upload / Paste Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Paste CSV Data or Upload .csv File
                  </label>
                  <label className="text-xs font-bold text-purple-700 hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .csv File</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const text = event.target?.result;
                            if (typeof text === 'string') {
                              parseBulkCsv(text);
                            }
                          };
                          reader.readAsText(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <textarea
                  rows={4}
                  placeholder={`Roll Number, Full Name, Father Name, Semester, Section\n1, Muhammad Ali, Tariq Mahmood, 1, A1\n2, Usman Ahmad, Bashir Ahmad, 1, A1\n3, Zainab Fatima, Abdul Rehman, 1, A1`}
                  value={bulkCsvText}
                  onChange={(e) => parseBulkCsv(e.target.value)}
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none shadow-2xs"
                />
              </div>

              {/* Parsed Pre-Flight Verification */}
              {bulkParsedStudents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>Pre-Flight Verification</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                        {bulkParsedStudents.length} rows parsed
                      </span>
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✓ {bulkParsedStudents.filter((s) => s.status === 'valid').length} Ready to Enroll
                      </span>
                      {bulkParsedStudents.filter((s) => s.status === 'duplicate').length > 0 && (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          ⚠ {bulkParsedStudents.filter((s) => s.status === 'duplicate').length} Duplicates (Skipped)
                        </span>
                      )}
                      {bulkParsedStudents.filter((s) => s.status === 'invalid').length > 0 && (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          ✕ {bulkParsedStudents.filter((s) => s.status === 'invalid').length} Errors (Skipped)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 text-center">Roll #</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Father Name</th>
                          <th className="py-2.5 px-3 text-center">Class</th>
                          <th className="py-2.5 px-3">System Login ID</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                        {bulkParsedStudents.map((stud, idx) => {
                          const genId = dataStore.generateStudentLoginId(
                            stud.semester,
                            stud.section,
                            stud.rollNumber
                          );
                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                stud.status === 'valid'
                                  ? 'bg-white'
                                  : stud.status === 'duplicate'
                                  ? 'bg-amber-50/40 text-amber-900'
                                  : 'bg-rose-50/40 text-rose-900'
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-mono font-bold">
                                {stud.rollNumber || '—'}
                              </td>
                              <td className="py-2 px-3 font-bold truncate max-w-[140px]">
                                {stud.name}
                              </td>
                              <td className="py-2 px-3 truncate max-w-[140px]">
                                {stud.fatherName || '—'}
                              </td>
                              <td className="py-2 px-3 text-center font-semibold">
                                Sem {stud.semester} {stud.section}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                {genId}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {stud.status === 'valid' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    Valid
                                  </span>
                                ) : stud.status === 'duplicate' ? (
                                  <span
                                    className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]"
                                    title={stud.error}
                                  >
                                    Duplicate
                                  </span>
                                ) : (
                                  <span
                                    className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]"
                                    title={stud.error}
                                  >
                                    Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-slate-500">
                Default student password:{' '}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold text-slate-800">
                  student123
                </code>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkImportModal(false);
                    setBulkCsvText('');
                    setBulkParsedStudents([]);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={bulkParsedStudents.filter((s) => s.status === 'valid').length === 0}
                  onClick={handleCommitBulkImport}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Enroll {bulkParsedStudents.filter((s) => s.status === 'valid').length} Students
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* CUSTOM-DESIGNED STUDENT DELETION CONFIRMATION ALERT MODAL                */}
      {/* ========================================================================= */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-rose-200 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 p-6 text-white flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center flex-shrink-0 text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300 block">
                    Administrative Action Required
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Confirm Student Deletion
                  </h3>
                </div>
              </div>

              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={() => setStudentToDelete(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center font-bold text-xs transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Student Identity Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 font-mono font-black text-sm flex items-center justify-center border border-purple-200">
                      #{studentToDelete.rollNumber}
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{studentToDelete.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Father: {studentToDelete.fatherName || 'Not recorded'}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200">
                    Sem {studentToDelete.semester} ({studentToDelete.section})
                  </span>
                </div>

                <div className="pt-2.5 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">System Login ID:</span>
                    <strong className="font-mono text-slate-800">{studentToDelete.loginId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Registered Date:</span>
                    <span className="text-slate-700 font-medium">
                      {new Date(studentToDelete.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* High-visibility Warning Notice */}
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Permanent Database &amp; Cloud Purge</span>
                </div>
                <p className="text-[11px] text-rose-800/85 leading-relaxed">
                  Removing <strong>{studentToDelete.name}</strong> will completely wipe their profile, assignment submissions, marks, and evaluations from the college database and cloud storage.
                </p>
                <p className="text-[11px] text-rose-900 font-bold pt-1">
                  💡 Roll #{studentToDelete.rollNumber} in Semester {studentToDelete.semester} (Section {studentToDelete.section}) will be freed immediately for new student registration.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition"
              >
                Cancel &amp; Keep Student
              </button>

              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={handleConfirmDeleteStudent}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
              >
                {isDeletingStudent ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Purging Student...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Permanently Delete Student</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
