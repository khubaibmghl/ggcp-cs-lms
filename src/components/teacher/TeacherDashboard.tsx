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
  Copy,
  Check,
  Search,
  Filter,
  Loader2,
} from 'lucide-react';
import { TeacherSubmissionsModal } from './TeacherSubmissionsModal';
import { formatDateDDMMMYYYY } from '@/lib/dateUtils';
import { getFileBlob, downloadFileUrl } from '@/lib/fileStorage';
import { supabaseService } from '@/lib/supabaseService';

interface TeacherDashboardProps {
  currentTab: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentTab }) => {
  const { currentUser, users } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  // SWR (Stale-While-Revalidate):
  // Render cached assignments & submissions in 0ms instantly on page load,
  // then seamlessly reconcile with live Supabase cloud data in the background.
  const [assignments, setAssignments] = useState<Assignment[]>(() => dataStore.getAssignments());
  const [submissions, setSubmissions] = useState<Submission[]>(() => dataStore.getSubmissions());
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);  const [wizardError, setWizardError] = useState<string | null>(null);
  const [activeAssignmentForReview, setActiveAssignmentForReview] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);
  const [copiedAsgId, setCopiedAsgId] = useState<string | null>(null);

  // --- Wizard Form State (3 Steps) ---
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

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

  // Step 3: Deadline (Midnight expiry)
  const defaultFutureDate = new Date();
  defaultFutureDate.setDate(defaultFutureDate.getDate() + 7);
  const [deadlineDate, setDeadlineDate] = useState(defaultFutureDate.toISOString().split('T')[0]);

  const loadData = () => {
    setAssignments(dataStore.getAssignments());
    setSubmissions(dataStore.getSubmissions());
  };

  useEffect(() => {
    // SWR pattern: Initial cached data is already displayed in 0ms!
    // Fetch live Supabase updates in the background and silently update state.
    const fetchLatestCloudData = async () => {
      setIsCloudSyncing(true);
      try {
        const subsRes = await fetch('/api/submissions');
        const subsJson = await subsRes.json();
        if (subsJson.success && Array.isArray(subsJson.submissions)) {
          const cleanSubs: Submission[] = subsJson.submissions
            .filter((row: any) => !dataStore.isAssignmentDeleted(row.assignment_id))
            .map((row: any) => ({
              id: row.id,
              assignmentId: row.assignment_id,
              studentId: row.student_id,
              studentName: row.student_name,
              studentRollNumber: Number(row.student_roll_number),
              studentSemester: Number(row.student_semester),
              studentSection: row.student_section,
              textSubmission: row.text_submission || '',
              files: row.files || [],
              submittedAt: row.submitted_at,
              status: row.status || 'submitted',
              score: row.marks != null ? Number(row.marks) : undefined,
              teacherFeedback: row.feedback || undefined,
              integrityReport: row.integrity_report || { peerPlagiarismScore: 0, aiLikelihoodScore: 0 },
            }));
          setSubmissions(cleanSubs);
          dataStore.saveSubmissions(cleanSubs);
        }
        setAssignments(dataStore.getAssignments());
      } catch (err) {
        console.warn('[TeacherDashboard] Background cloud fetch warning:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    };

    fetchLatestCloudData();

    const handleUpdate = () => {
      setAssignments(dataStore.getAssignments());
      setSubmissions(dataStore.getSubmissions());
    };
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

  // Copy missing roll numbers for an assignment
  const handleCopyMissingRolls = (asg: Assignment, missingRolls: number[]) => {
    if (missingRolls.length === 0) return;
    const text = `Missing Assignment Submissions for [${asg.subjectCode}] ${asg.title}:\nRoll Numbers: ${missingRolls.join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopiedAsgId(asg.id);
    showInfo('Copied to Clipboard', `${missingRolls.length} missing roll numbers copied.`);
    setTimeout(() => setCopiedAsgId(null), 2500);
  };

  // =========================================================================
  // VIEW: TAB === 'submissions' (REVIEW & GRADING OVERVIEW)
  // =========================================================================
  const renderSubmissionsTab = () => (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
        <h1 className="text-2xl font-extrabold tracking-tight">Review & Grading Console</h1>
        <p className="text-xs text-purple-200 mt-1">
          Select any course assignment below to inspect student documents, run authentic evaluations, and record grades.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Assignments Awaiting Evaluation</h2>
          <span className="text-xs text-slate-400 font-mono">{myAssignments.length} Assignments</span>
        </div>

        {myAssignments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No assignments created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Assignment</th>
                  <th className="py-3 px-4">Sections</th>
                  <th className="py-3 px-4 text-center">Submissions</th>
                  <th className="py-3 px-4 text-center">Graded</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {myAssignments.map((asg) => {
                  const asgSubs = submissions.filter((s) => s.assignmentId === asg.id);
                  const gradedCount = asgSubs.filter((s) => s.status === 'graded').length;
                  const pendingCount = asgSubs.length - gradedCount;

                  return (
                    <tr key={asg.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-purple-900">
                        {asg.subjectCode}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900">{asg.title}</p>
                        <p className="text-[11px] text-slate-400">Total Marks: {asg.totalMarks}</p>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {asg.targetSections.join(', ')}
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-900">
                        {asgSubs.length}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          {gradedCount}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {pendingCount}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setActiveAssignmentForReview(asg)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Grade Submissions</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // =========================================================================
  // VIEW: TAB === 'roster' (MISSING ROLL NUMBERS TRACKER)
  // =========================================================================
  const renderRosterTab = () => (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
        <h1 className="text-2xl font-extrabold tracking-tight">Missing Submissions & Roster Tracker</h1>
        <p className="text-xs text-purple-200 mt-1">
          Identifies students who have not yet submitted assignments. Copy non-submitting roll numbers with one click.
        </p>
      </div>

      <div className="space-y-4">
        {myAssignments.map((asg) => {
          const asgSubs = submissions.filter((s) => s.assignmentId === asg.id);
          const submittedRolls = new Set(asgSubs.map((s) => s.studentRollNumber));

          const enrolledStudents = users.filter((u) => {
            if (u.role !== 'student' || u.semester !== asg.semester) return false;
            if (asg.targetSections.includes('All')) return true;
            if (u.section && asg.targetSections.includes(u.section)) return true;
            return false;
          });

          const missingStudents = enrolledStudents.filter((s) => !submittedRolls.has(s.rollNumber || 0));
          const missingRolls = missingStudents.map((s) => s.rollNumber || 0).filter((r) => r > 0);

          return (
            <div key={asg.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-md">
                      {asg.subjectCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Sem {asg.semester} ({asg.targetSections.join(', ')})
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">{asg.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    {asgSubs.length} of {enrolledStudents.length} Submitted
                  </span>
                  <button
                    onClick={() => handleCopyMissingRolls(asg, missingRolls)}
                    disabled={missingRolls.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition disabled:opacity-50"
                  >
                    {copiedAsgId === asg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAsgId === asg.id ? 'Copied!' : 'Copy Missing Rolls'}</span>
                  </button>
                </div>
              </div>

              {missingStudents.length === 0 ? (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>100% Submissions Received! Every student in this class has submitted their assignment.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                    Outstanding Students ({missingStudents.length} pending):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {missingStudents.map((stud) => (
                      <span
                        key={stud.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold"
                      >
                        <span className="font-mono font-bold text-rose-700">Roll #{stud.rollNumber}</span>
                        <span>{stud.name}</span>
                        <span className="text-[10px] text-rose-400 font-mono">({stud.section})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // =========================================================================
  // VIEW: TAB === 'integrity' (PLAGIARISM & COLLUSION SUITE)
  // =========================================================================
  const renderIntegrityTab = () => {
    const flaggedSubmissions = submissions.filter(
      (s) =>
        (s.integrityReport?.peerPlagiarismScore && s.integrityReport.peerPlagiarismScore > 30) ||
        (s.integrityReport?.aiLikelihoodScore && s.integrityReport.aiLikelihoodScore > 50)
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
          <h1 className="text-2xl font-extrabold tracking-tight">Plagiarism & Academic Integrity Suite</h1>
          <p className="text-xs text-purple-200 mt-1">
            Detects collusion, variable renaming, and cross-student copying using Stanford MOSS-grade AST tokenization.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Flagged Submissions Across Courses</h2>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              {flaggedSubmissions.length} Flagged
            </span>
          </div>

          {flaggedSubmissions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Clean Submissions</h3>
              <p className="text-xs text-slate-500">No submissions currently exceed the 30% similarity collusion threshold.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Assignment</th>
                    <th className="py-3 px-4 text-center">Plagiarism Score</th>
                    <th className="py-3 px-4">Collusion Match</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {flaggedSubmissions.map((sub) => {
                    const asg = assignments.find((a) => a.id === sub.assignmentId);
                    const report = sub.integrityReport;

                    return (
                      <tr key={sub.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900">
                          <p>{sub.studentName}</p>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Roll #{sub.studentRollNumber} (Sec {sub.studentSection})
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono text-purple-800 font-bold">[{asg?.subjectCode}]</span>{' '}
                          <span>{asg?.title || 'Assignment'}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-black text-xs">
                            {report?.peerPlagiarismScore || 0}% Match
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {report?.matchedStudentName ? (
                            <span>
                              Matched with <strong>{report.matchedStudentName}</strong> (Roll #{report.matchedWithRollNumber})
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Classroom overlap</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {asg && (
                            <button
                              onClick={() => setActiveAssignmentForReview(asg)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
                            >
                              Inspect Collusion
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================================================================
  // VIEW: TAB === 'assignments' (DEDICATED PORTFOLIO MANAGEMENT) OR 'dashboard'
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Route by currentTab */}
      {currentTab === 'submissions' && renderSubmissionsTab()}
      {currentTab === 'roster' && renderRosterTab()}
      {currentTab === 'integrity' && renderIntegrityTab()}

      {(currentTab === 'dashboard' || currentTab === 'assignments') && (
        <>
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
                  {currentTab === 'assignments' ? 'Course Assignments Management' : 'Course Assignments & Evaluation Hub'}
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
                  {submissions.filter((s) => (s.integrityReport?.peerPlagiarismScore || 0) > 50).length}
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
              {myAssignments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No assignments posted yet. Click the button above to create one.</div>
              ) : (
                myAssignments.map((asg) => {
                  const asgSubmissions = submissions.filter((s) => s.assignmentId === asg.id);
                  const isExpired = new Date(`${asg.deadlineDate}T23:59:59`) < new Date();
                  const highPlagiarismCount = asgSubmissions.filter(
                    (s) => (s.integrityReport?.peerPlagiarismScore || 0) > 50
                  ).length;

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
                            Deadline: <strong className="text-slate-800">{formatDateDDMMMYYYY(asg.deadlineDate)} (11:59:59 PM)</strong>
                          </span>

                          {asg.resourceFileName && (
                            <button
                              type="button"
                              onClick={async () => {
                                let src = asg.resourceFileContent;
                                if (!src && asg.resourceFileKey) {
                                  src = (await getFileBlob(asg.resourceFileKey)) || '';
                                }
                                if (!src) return;
                                const fileName = asg.resourceFileName || 'Assignment_Questions.pdf';
                                await downloadFileUrl(src, fileName);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-[11px] font-bold transition"
                              title="Download Question Paper"
                            >
                              <FileText className="w-3 h-3 text-purple-600" />
                              <span className="truncate max-w-[140px]">{asg.resourceFileName}</span>
                              <Download className="w-3 h-3" />
                            </button>
                          )}
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
                })
              )}
            </div>
          </section>
        </>
      )}

      {/* --- 3-STEP ASSIGNMENT CREATION WIZARD MODAL --- */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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
                >
                  ✕
                </button>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Semester
                  </label>
                  <select
                    value={targetSemester}
                    onChange={(e) => {
                      const sem = Number(e.target.value) as SemesterNumber;
                      setTargetSemester(sem);
                      const avail = subjects.filter((s) => s.semester === sem);
                      if (avail.length > 0) setTargetSubjectId(avail[0].id);
                    }}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        BS Computer Science - Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Subject
                  </label>
                  <select
                    value={targetSubjectId}
                    onChange={(e) => setTargetSubjectId(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Sections in Semester {targetSemester}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['All', 'A1', 'A2', 'B'] as const).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleToggleSection(sec)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                          targetSections.includes(sec)
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sec === 'All' ? 'All Sections' : `Section ${sec}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Assignment 1: Binary Search Tree Implementation"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assignment Question Paper File (PDF or Word .docx)
                  </label>
                  <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 text-center hover:bg-purple-50/50 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleQuestionFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      {questionFile ? questionFile.name : 'Upload Question Paper (PDF or Word .docx)'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Max file size: 25 MB • Official question document
                    </p>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Submission Deadline (Midnight Automatic Lock)
                  </label>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Portal automatically locks at 11:59:59 PM (Midnight) on this date.
                  </p>
                </div>

                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 text-xs space-y-2">
                  <span className="font-bold text-purple-900 block">Assignment Summary:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Subject:</span>{' '}
                      <strong>{currentSubject.code} - {currentSubject.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Semester:</span>{' '}
                      <strong>Semester {targetSemester}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Sections:</span>{' '}
                      <strong>{targetSections.join(', ')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Marks:</span>{' '}
                      <strong>{totalMarks}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  wizardStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Back
              </button>

              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep === 2 && (!title.trim() || !questionFile)) {
                      setWizardError('Please provide a title and upload the question paper file.');
                      return;
                    }
                    setWizardError(null);
                    setWizardStep((prev) => (prev + 1) as any);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-purple-900/20"
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
          initialSubmissions={submissions.filter((s) => s.assignmentId === activeAssignmentForReview.id)}
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
                disabled={isDeletingAssignment}
                onClick={async () => {
                  setIsDeletingAssignment(true);
                  try {
                    await dataStore.deleteAssignmentAsync(assignmentToDelete.id);
                    setAssignments(dataStore.getAssignments());
                    setSubmissions(dataStore.getSubmissions());
                    setAssignmentToDelete(null);
                    showSuccess('Assignment and all linked submissions permanently deleted.');
                  } catch (err) {
                    console.error('Delete assignment error:', err);
                    dataStore.deleteAssignment(assignmentToDelete.id);
                    setAssignments(dataStore.getAssignments());
                    setSubmissions(dataStore.getSubmissions());
                    setAssignmentToDelete(null);
                    showSuccess('Assignment deleted locally.');
                  } finally {
                    setIsDeletingAssignment(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-md shadow-rose-950/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAssignment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Assignment</span>
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
