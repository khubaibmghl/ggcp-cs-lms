'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataStore } from '@/lib/storage';
import { Assignment, Submission, Section, SemesterNumber, TestCase, RubricCriterion, GradingMode } from '@/types';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
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
} from 'lucide-react';
import { TeacherSubmissionsModal } from './TeacherSubmissionsModal';

interface TeacherDashboardProps {
  currentTab: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentTab }) => {
  const { currentUser, users } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [activeAssignmentForReview, setActiveAssignmentForReview] = useState<Assignment | null>(null);

  // --- Wizard Form State (4 Steps) ---
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Course & Semester
  const [targetSemester, setTargetSemester] = useState<SemesterNumber>(currentUser?.taughtSemester || 3);
  const [targetSubjectId, setTargetSubjectId] = useState<string>(currentUser?.taughtSubjectId || 'sub-cs301');

  // Step 2: Target Audience & Details
  const [targetSections, setTargetSections] = useState<('All' | Section)[]>(['All']);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalMarks, setTotalMarks] = useState(20);
  const [resourceFileName, setResourceFileName] = useState('');
  const [resourceFileContent, setResourceFileContent] = useState('');

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
    if (!title.trim() || !description.trim()) {
      alert('Please provide a title and assignment description.');
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
      description: description.trim(),
      totalMarks: Number(totalMarks),
      deadlineDate: deadlineDate, // Locks at 11:59:59 PM on this date
      gradingMode: gradingMode,
      testCases: testCases.filter((tc) => tc.input && tc.expectedOutput),
      aiRubric: aiRubric,
      resourceFileName: resourceFileName.trim() || undefined,
      resourceFileContent: resourceFileContent.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    dataStore.addAssignment(newAssignment);
    setAssignments(dataStore.getAssignments());
    setShowWizard(false);
    setWizardStep(1);
    setTitle('');
    setDescription('');
    alert(`Assignment published! It is now immediately live for all students in Semester ${targetSemester} (${targetSections.join(', ')}).`);
  };

  // Filter assignments created by this teacher or in their taught subject
  const myAssignments = assignments.filter(
    (a) => a.teacherId === currentUser?.id || a.subjectId === currentUser?.taughtSubjectId
  );

  return (
    <div className="space-y-6">
      {/* Teacher Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-2">
              <Award className="w-4 h-4 text-purple-300" />
              Faculty Portal • {currentUser?.taughtSubjectName || 'Data Structures'}
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
                  Step {wizardStep} of 4
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {wizardStep === 1 && 'Step 1: Course & Semester Selection'}
                  {wizardStep === 2 && 'Step 2: Assignment Details & Target Sections'}
                  {wizardStep === 3 && 'Step 3: Automated Grading & Test Cases'}
                  {wizardStep === 4 && 'Step 4: Midnight Deadline & Instant Publish'}
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
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all ${
                    step <= wizardStep ? 'bg-purple-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* --- STEP 1: Course & Semester --- */}
            {wizardStep === 1 && (
              <div className="space-y-4">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Audience / Sections in Semester {targetSemester}
                  </label>
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
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Assignment 02: Binary Search Tree Operations & Balancing"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Total Marks
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
                      Starter Resource File Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. bst_template.cpp"
                      value={resourceFileName}
                      onChange={(e) => setResourceFileName(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Detailed Assignment Prompt / Problem Statement
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe problem requirements, input/output formats, constraints, and instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>
            )}

            {/* --- STEP 3: Automated Grading & Test Cases --- */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grading & Evaluation Strategy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'hybrid', label: 'Hybrid (Test Cases + AI Rubric)' },
                      { id: 'testcases', label: 'Test Cases Only' },
                      { id: 'ai_rubric', label: 'AI Rubric Assistance Only' },
                      { id: 'manual', label: 'Purely Manual Grading' },
                    ].map((mode) => (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => setGradingMode(mode.id as GradingMode)}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition ${
                          gradingMode === mode.id
                            ? 'bg-purple-50 text-purple-900 border-purple-500 ring-2 ring-purple-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Test cases builder */}
                {(gradingMode === 'hybrid' || gradingMode === 'testcases') && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Input / Output Test Cases ({testCases.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddTestCase}
                        className="text-xs text-purple-700 font-bold hover:underline"
                      >
                        + Add Test Case
                      </button>
                    </div>

                    <div className="space-y-2">
                      {testCases.map((tc, idx) => (
                        <div key={tc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold">Input #{idx + 1}</span>
                            <input
                              type="text"
                              placeholder="e.g. 5"
                              value={tc.input}
                              onChange={(e) => {
                                const updated = [...testCases];
                                updated[idx].input = e.target.value;
                                setTestCases(updated);
                              }}
                              className="w-full text-xs font-mono px-2 py-1.5 rounded-lg border border-slate-200"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold">Expected Output</span>
                            <input
                              type="text"
                              placeholder="e.g. 120"
                              value={tc.expectedOutput}
                              onChange={(e) => {
                                const updated = [...testCases];
                                updated[idx].expectedOutput = e.target.value;
                                setTestCases(updated);
                              }}
                              className="w-full text-xs font-mono px-2 py-1.5 rounded-lg border border-slate-200"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold">Marks</span>
                            <input
                              type="number"
                              min={1}
                              value={tc.points}
                              onChange={(e) => {
                                const updated = [...testCases];
                                updated[idx].points = Number(e.target.value);
                                setTestCases(updated);
                              }}
                              className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- STEP 4: Midnight Deadline & Instant Publish --- */}
            {wizardStep === 4 && (
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Lock Time: Automatically locked at 11:59:59 PM (Midnight)
                  </span>
                </div>

                {/* Instant Publishing Summary */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <p className="font-bold text-slate-800">Publishing Summary:</p>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Course: {currentSubject.code} - {currentSubject.name}</li>
                    <li>Semester: BS CS Semester {targetSemester}</li>
                    <li>Target Sections: {targetSections.join(', ')}</li>
                    <li>Evaluation Mode: {gradingMode}</li>
                    <li>Deadline: {deadlineDate} at 11:59:59 PM</li>
                  </ul>
                  <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                    ✓ Immediate availability: As soon as you click Publish, this assignment will be live on all matching student dashboards.
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

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                  className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-900/20"
                >
                  Continue to Step {wizardStep + 1}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublishAssignment}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-900/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Publish Assignment Immediately
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
    </div>
  );
};
