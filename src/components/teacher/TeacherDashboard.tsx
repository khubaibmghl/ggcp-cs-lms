'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataStore } from '@/lib/storage';
import { Assignment, Submission, Section, SemesterNumber, TestCase, RubricCriterion, GradingMode } from '@/types';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCode2,
  Users2,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Eye,
  Calendar,
  Layers,
  Award,
  BookOpen,
  FileText,
  Download,
  Trash2,
} from 'lucide-react';
import { TeacherSubmissionsModal } from './TeacherSubmissionsModal';

interface TeacherDashboardProps {
  currentTab: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentTab }) => {
  const { currentUser, users } = useAuth();
  const { showSuccess, showError } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [activeAssignmentForReview, setActiveAssignmentForReview] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

  // --- Wizard Form State (4 Steps) ---
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Course & Semester
  const [targetSemester, setTargetSemester] = useState<SemesterNumber>(currentUser?.taughtSemester || 3);
  const [targetSubjectId, setTargetSubjectId] = useState<string>(currentUser?.taughtSubjectId || 'sub-cs301');

  // Step 2: Target Audience & Details
  const [targetSections, setTargetSections] = useState<('All' | Section)[]>(['All']);
  const [title, setTitle] = useState('');
  const [totalMarks, setTotalMarks] = useState(20);
  const [questionFile, setQuestionFile] = useState<{ name: string; size: number; dataUrl: string } | null>(null);

  const handleQuestionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = ['.pdf', '.doc', '.docx'];
    const isDoc = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isDoc) {
      setWizardError('Please upload an assignment file in PDF (.pdf) or Word (.docx, .doc) format.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setWizardError(`File "${file.name}" exceeds the 25 MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setQuestionFile({
        name: file.name,
        size: file.size,
        dataUrl,
      });
      setWizardError(null);
    };
    reader.readAsDataURL(file);
  };

  // Step 3: Grading & Test Cases
  const [gradingMode, setGradingMode] = useState<GradingMode>('hybrid');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: 'tc-1', input: 'Input sample 1', expectedOutput: 'Expected output 1', points: 5 },
    { id: 'tc-2', input: 'Input sample 2', expectedOutput: 'Expected output 2', points: 5 },
  ]);
  const [aiRubric, setAiRubric] = useState<RubricCriterion[]>([
    { id: 'rub-1', title: 'Logic & Algorithmic Correctness', weight: 50, description: 'Correct logic and handling edge cases' },
    { id: 'rub-2', title: 'Code Quality & Complexity', weight: 50, description: 'Efficient time/space complexity and clear structure' },
  ]);

  // Step 4: Deadline (Midnight expiry)
  const defaultFutureDate = new Date();
  defaultFutureDate.setDate(defaultFutureDate.getDate() + 7);
  const [deadlineDate, setDeadlineDate] = useState(defaultFutureDate.toISOString().split('T')[0]);

  const loadData = () => {
    setAssignments(dataStore.getAssignments());
    setSubmissions(dataStore.getSubmissions());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('lms_storage_updated', handleUpdate);
    return () => window.removeEventListener('lms_storage_updated', handleUpdate);
  }, []);

  const subjects = dataStore.getSubjects();
  const currentSubject = subjects.find((s) => s.id === targetSubjectId) || subjects[0];

  // If teacher is pending approval
  if (currentUser?.status === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
          ⏳
        </div>
        <h2 className="text-xl font-extrabold text-amber-900">Faculty Account Pending Verification</h2>
        <p className="text-xs text-amber-800 mt-2 leading-relaxed">
          Welcome, <strong>{currentUser.name}</strong>. Your account has been registered for{' '}
          <strong>{currentUser.taughtSubjectName}</strong> (Semester {currentUser.taughtSemester}).
          The Computer Science Head of Department (Admin) will review and approve your account shortly.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-200/60 text-amber-900 text-xs font-semibold">
          <Clock className="w-4 h-4" />
          Status: Awaiting Admin Approval
        </div>
      </div>
    );
  }

  // Toggle Target Sections
  const handleToggleSection = (sec: 'All' | Section) => {
    if (sec === 'All') {
      setTargetSections(['All']);
    } else {
      let updated: ('All' | Section)[] = targetSections.filter((s) => s !== 'All');
      if (updated.includes(sec)) {
        updated = updated.filter((s) => s !== sec);
      } else {
        updated.push(sec);
      }
      if (updated.length === 0 || updated.length === 3) {
        setTargetSections(['All']);
      } else {
        setTargetSections(updated);
      }
    }
  };

  // Add Test Case in Wizard
  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      {
        id: `tc-${Date.now()}`,
        input: '',
        expectedOutput: '',
        points: 5,
      },
    ]);
  };

  // Complete Wizard & Publish
  const handlePublishAssignment = () => {
    if (!title.trim()) {
      setWizardError('Please provide an assignment title.');
      return;
    }
    if (!questionFile) {
      setWizardError('Please upload the assignment question file in PDF (.pdf) or Word (.docx) format.');
      return;
    }

    const newAssignment: Assignment = {
      id: `asg-${Date.now()}`,
      teacherId: currentUser?.id || 'usr-teach',
      teacherName: currentUser?.name || 'Faculty Member',
      semester: targetSemester,
      subjectId: currentSubject.id,
      subjectCode: currentSubject.code,
      subjectName: currentSubject.name,
      targetSections: targetSections,
      title: title.trim(),
      description: `Question File: ${questionFile.name}`,
      totalMarks: Number(totalMarks),
      deadlineDate: deadlineDate, // Locks at 11:59:59 PM on this date
      gradingMode: 'manual',
      resourceFileName: questionFile.name,
      resourceFileContent: questionFile.dataUrl,
      createdAt: new Date().toISOString(),
    };

    dataStore.addAssignment(newAssignment);
    setAssignments(dataStore.getAssignments());
    setShowWizard(false);
    setWizardStep(1);
    setWizardError(null);
    setTitle('');
    setQuestionFile(null);
    showSuccess(
      'Assignment Published',
      `"${newAssignment.title}" is now immediately live for students in Semester ${targetSemester} (${targetSections.join(', ')}).`
    );
  };

  // Filter assignments created by this teacher or in their taught subject / assigned courses
  const myAssignedSubjectIds = currentUser?.assignedCourses?.map((c) => c.subjectId) || [];
  const myAssignments = assignments.filter(
    (a) =>
      a.teacherId === currentUser?.id ||
      a.subjectId === currentUser?.taughtSubjectId ||
      myAssignedSubjectIds.includes(a.subjectId)
  );

  return (
    <div className="space-y-6">
      {/* Teacher Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-2">
              <Award className="w-4 h-4 text-purple-300" />
              Faculty Portal • {currentUser?.assignedCourses && currentUser.assignedCourses.length > 0
                ? currentUser.assignedCourses.map((c) => `${c.subjectCode} (${c.sections.join(', ')})`).join(' • ')
                : currentUser?.taughtSubjectName || 'BS Computer Science'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Course Assignments & Evaluation Hub
            </h1>
            <p className="text-sm text-purple-200/80 mt-1">
              Create assignments with instant publishing, automated test-case evaluation, peer plagiarism checks, and missing roll tracking.
            </p>
          </div>

          <button
            onClick={() => {
              setWizardStep(1);
              setShowWizard(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-purple-950/40 hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            Create Assignment Wizard
          </button>
        </div>

        {/* Quick Teacher Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-purple-200 font-medium">Published Assignments</span>
            <p className="text-2xl font-black mt-2">{myAssignments.length}</p>
            <span className="text-[11px] text-purple-300/80">Active & Closed</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-purple-200 font-medium">Total Submissions</span>
            <p className="text-2xl font-black mt-2">{submissions.length}</p>
            <span className="text-[11px] text-purple-300/80">Received across sections</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-purple-200 font-medium">Plagiarism Alerts</span>
            <p className="text-2xl font-black mt-2 text-rose-300">
              {submissions.filter((s) => s.integrityReport?.peerPlagiarismScore > 50).length}
            </p>
            <span className="text-[11px] text-rose-200/80">&gt;50% peer match</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-purple-200 font-medium">Midnight Expiry Rules</span>
            <p className="text-2xl font-black mt-2 text-emerald-300">Active</p>
            <span className="text-[11px] text-purple-300/80">Automated lock enabled</span>
          </div>
        </div>
      </div>

      {/* ASSIGNMENTS LIST */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Assignments Portfolio ({myAssignments.length})
            </h2>
            <p className="text-xs text-slate-500">
              Select an assignment to view submissions, evaluate test cases, inspect plagiarism, or track missing roll numbers.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {myAssignments.map((asg) => {
            const asgSubmissions = submissions.filter((s) => s.assignmentId === asg.id);
            const isExpired = new Date(`${asg.deadlineDate}T23:59:59`) < new Date();
            const highPlagiarismCount = asgSubmissions.filter((s) => s.integrityReport?.peerPlagiarismScore > 50).length;

            return (
              <div
                key={asg.id}
                className="bg-slate-50 hover:bg-purple-50/20 border border-slate-200 hover:border-purple-300 rounded-2xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-md">
                      {asg.subjectCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      BS CS Semester {asg.semester}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-semibold">
                      Sections: {asg.targetSections.join(', ')}
                    </span>
                    {isExpired ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expired (Locked at Midnight)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active Submissions Open
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base">{asg.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{asg.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span>
                      Total Marks: <strong className="text-slate-800">{asg.totalMarks}</strong>
                    </span>
                    <span>
                      Deadline: <strong className="text-slate-800">{asg.deadlineDate} (11:59:59 PM)</strong>
                    </span>

                    {asg.resourceFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!asg.resourceFileContent) return;
                          const a = document.createElement('a');
                          a.href = asg.resourceFileContent;
                          a.download = asg.resourceFileName || 'Assignment_Questions.pdf';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-[11px] font-bold transition"
                        title="Download Question Paper"
                      >
                        <FileText className="w-3 h-3 text-purple-600" />
                        <span className="truncate max-w-[140px]">{asg.resourceFileName}</span>
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                    <span>
                      Mode: <strong className="capitalize text-purple-700">{asg.gradingMode}</strong>
                    </span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveAssignmentForReview(asg)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition"
                  >
                    <Eye className="w-4 h-4" />
                    Review Submissions ({asgSubmissions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentToDelete(asg)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 transition"
                    title="Delete Assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {highPlagiarismCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {highPlagiarismCount} Plagiarism Alert
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- 4-STEP ASSIGNMENT CREATION WIZARD MODAL --- */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Wizard Header & Stepper */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  Step {wizardStep} of 3
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {wizardStep === 1 && 'Step 1: Course & Semester Selection'}
                  {wizardStep === 2 && 'Step 2: Details & Question File (PDF / Word)'}
                  {wizardStep === 3 && 'Step 3: Midnight Deadline & Instant Publish'}
                </h3>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all ${
                    step <= wizardStep ? 'bg-purple-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Professional Inline Validation Message Box */}
            {wizardError && (
              <div className="p-3.5 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{wizardError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWizardError(null)}
                  className="text-rose-400 hover:text-rose-700 font-bold p-1"
                  title="Dismiss message"
                >
                  ✕
                </button>
              </div>
            )}

            {/* --- STEP 1: Course & Semester --- */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                {currentUser?.assignedCourses && currentUser.assignedCourses.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Select From Your Assigned Courses:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {currentUser.assignedCourses.map((c) => {
                        const isMatch = targetSubjectId === c.subjectId && targetSemester === c.semester;
                        return (
                          <button
                            type="button"
                            key={c.subjectId}
                            onClick={() => {
                              setTargetSubjectId(c.subjectId);
                              setTargetSemester(c.semester);
                              setTargetSections(c.sections.length === 3 ? ['All'] : c.sections);
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              isMatch
                                ? 'bg-purple-700 text-white border-purple-700 shadow-md'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                  isMatch ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {c.subjectCode}
                              </span>
                              <span
                                className={`text-[10px] font-bold ${
                                  isMatch ? 'text-purple-200' : 'text-slate-500'
                                }`}
                              >
                                Sem {c.semester}
                              </span>
                            </div>
                            <p className="font-bold text-xs mt-1 truncate">{c.subjectName}</p>
                            <p
                              className={`text-[11px] mt-0.5 font-medium ${
                                isMatch ? 'text-purple-200' : 'text-slate-500'
                              }`}
                            >
                              Sections: {c.sections.join(', ')}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select BS Computer Science Semester
                  </label>
                  <select
                    value={targetSemester}
                    onChange={(e) => setTargetSemester(Number(e.target.value) as SemesterNumber)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Subject (From Official Curriculum)
                  </label>
                  <select
                    value={targetSubjectId}
                    onChange={(e) => setTargetSubjectId(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {subjects
                      .filter((s) => s.semester === targetSemester)
                      .map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code} - {sub.name} ({sub.creditHours} Credit Hours)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-xs text-purple-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-purple-700" />
                    Selected Course Overview:
                  </p>
                  <p className="mt-1 text-slate-600">{currentSubject?.description}</p>
                </div>
              </div>
            )}

            {/* --- STEP 2: Details & Target Sections --- */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Target Audience / Sections in Semester {targetSemester}
                    </label>
                    {(() => {
                      const assignedCourseMatch = currentUser?.assignedCourses?.find(
                        (c) => c.subjectId === targetSubjectId
                      );
                      if (assignedCourseMatch) {
                        return (
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                            Your Assigned Sections: [{assignedCourseMatch.sections.join(', ')}]
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['All', 'A1', 'A2', 'B'] as ('All' | Section)[]).map((sec) => (
                      <button
                        type="button"
                        key={sec}
                        onClick={() => handleToggleSection(sec)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                          targetSections.includes(sec)
                            ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sec === 'All' ? 'All Sections (A1, A2, B)' : `Section ${sec}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Most assignments are common to all sections, but you can target individual sections when needed.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Assignment 01: Programming Practice Questions"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Total Marks *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(Number(e.target.value))}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Submission Deadline Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>

                {/* Upload Question File (PDF or Word .docx) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Assignment Question File (PDF or Word .docx) *
                  </label>
                  <div className="border-2 border-dashed border-purple-200 bg-purple-50/50 rounded-2xl p-6 text-center hover:bg-purple-50 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleQuestionFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    {questionFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-extrabold text-purple-900 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          {questionFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {questionFile.size >= 1024 * 1024
                            ? `${(questionFile.size / (1024 * 1024)).toFixed(1)} MB`
                            : `${Math.round(questionFile.size / 1024)} KB`}{' '}
                          • Click or drag to replace file
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-slate-800">
                          Click or drag the official Assignment Question Document
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Only PDF (.pdf) and Microsoft Word (.docx, .doc) files are accepted
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- STEP 3: Midnight Deadline & Instant Publish --- */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="bg-purple-900 text-white p-5 rounded-2xl shadow-inner space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-300" />
                    <span className="font-extrabold text-sm">Midnight Expiry & Lockout Enforcement</span>
                  </div>
                  <p className="text-xs text-purple-200">
                    The assignment portal will accept submissions until <strong>11:59:59 PM (Midnight)</strong> of the selected date. At midnight, submissions automatically lock.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <p className="font-bold text-slate-800">Publishing Summary:</p>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Course: {currentSubject.code} - {currentSubject.name}</li>
                    <li>Semester: BS CS Semester {targetSemester}</li>
                    <li>Target Sections: {targetSections.join(', ')}</li>
                    <li>Total Marks: {totalMarks}</li>
                    <li>Question Document: {questionFile?.name || 'Attached Document'}</li>
                    <li>Deadline: {deadlineDate} at 11:59:59 PM (Midnight)</li>
                  </ul>
                  <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                    ✓ Immediate availability: As soon as you click Publish, this assignment will be live for all matching students.
                  </p>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  wizardStep === 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Back
              </button>

              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep === 2) {
                      if (!title.trim()) {
                        setWizardError('Please enter an assignment title.');
                        return;
                      }
                      if (!questionFile) {
                        setWizardError('Please upload the assignment question file in PDF (.pdf) or Word (.docx) format.');
                        return;
                      }
                    }
                    setWizardError(null);
                    setWizardStep((prev) => (prev + 1) as any);
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublishAssignment}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Publish Assignment Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SUBMISSIONS & INTEGRITY REVIEW MODAL --- */}
      {activeAssignmentForReview && (
        <TeacherSubmissionsModal
          assignment={activeAssignmentForReview}
          onClose={() => {
            setActiveAssignmentForReview(null);
            loadData();
          }}
        />
      )}

      {/* --- PROFESSIONAL DELETE CONFIRMATION DIALOG --- */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Delete Assignment Permanently?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to delete <strong className="text-slate-800">&ldquo;{assignmentToDelete.title}&rdquo;</strong>.
                This will permanently delete the assignment, all student submissions, and recorded grades. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  dataStore.deleteAssignment(assignmentToDelete.id);
                  setAssignments(dataStore.getAssignments());
                  setSubmissions(dataStore.getSubmissions());
                  setAssignmentToDelete(null);
                  showSuccess('Assignment and student submissions deleted successfully.');
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-md shadow-rose-950/20 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
