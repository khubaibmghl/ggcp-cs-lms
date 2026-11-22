'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataStore } from '@/lib/storage';
import { Assignment, Submission, Subject } from '@/types';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  FileText,
  UploadCloud,
  ChevronRight,
  ArrowLeft,
  Award,
  Sparkles,
  Lock,
  Send,
  MessageSquare,
  Download,
  Code2,
  FileCheck2,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { StudentSubmissionWizard } from './StudentSubmissionWizard';
import { formatDateDDMMMYYYY, formatDateTimeDDMMMYYYY } from '@/lib/dateUtils';

interface StudentDashboardProps {
  currentTab: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentTab }) => {
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeAssignmentToSubmit, setActiveAssignmentToSubmit] = useState<Assignment | null>(null);

  // Dedicated Course Page Navigation state
  const [activeCourseView, setActiveCourseView] = useState<Subject | null>(null);

  const loadData = () => {
    setAssignments(dataStore.getAssignments());
    setSubmissions(dataStore.getSubmissions());
    setSubjects(dataStore.getSubjects());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('lms_storage_updated', handleUpdate);
    return () => window.removeEventListener('lms_storage_updated', handleUpdate);
  }, []);

  if (!currentUser) return null;

  // Filter courses for student's semester
  const mySubjects = subjects.filter((s) => s.semester === currentUser.semester);

  // Filter assignments relevant to this student's semester and section
  const relevantAssignments = assignments.filter((asg) => {
    if (asg.semester !== currentUser.semester) return false;
    const targets = asg.targetSections;
    if (targets.includes('All')) return true;
    if (currentUser.section && targets.includes(currentUser.section)) return true;
    return false;
  });

  // Assignments for the specifically opened course
  const courseAssignments = activeCourseView
    ? relevantAssignments.filter((a) => a.subjectId === activeCourseView.id)
    : [];

  // Helper to check deadline status
  const getDeadlineStatus = (deadlineDateStr: string) => {
    const deadline = new Date(`${deadlineDateStr}T23:59:59`);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { isExpired: true, text: 'Expired', compactText: 'Locked', diffMs: 0 };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const compactText = days > 0 ? `${days}d left` : `${hours}h ${mins}m left`;
    const text = days > 0 ? `${days}d ${hours}h left` : `${hours}h ${mins}m left`;

    return { isExpired: false, text, compactText, diffMs };
  };

  // Student's submissions
  const mySubmissions = submissions.filter((s) => s.studentId === currentUser.id);
  const gradedSubmissions = mySubmissions.filter((s) => s.status === 'graded');
  const avgScore =
    gradedSubmissions.length > 0
      ? (
          gradedSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0) /
          gradedSubmissions.length
        ).toFixed(1)
      : 'N/A';

  // Helper to download resource question paper
  const handleDownloadPaper = (asg: Assignment) => {
    if (!asg.resourceFileContent) return;
    const link = document.createElement('a');
    link.href = asg.resourceFileContent;
    link.download = asg.resourceFileName || `${asg.subjectCode}_Assignment.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // VIEW 1: DEDICATED COURSE ASSIGNMENTS PAGE (WHEN A SPECIFIC COURSE IS OPENED)
  // =========================================================================
  if (activeCourseView) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-150">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveCourseView(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3.5 py-2 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Courses</span>
          </button>
          <span className="text-xs text-slate-400 font-mono">
            Semester {currentUser.semester} • Section {currentUser.section}
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-black bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-lg">
                {activeCourseView.code}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {activeCourseView.creditHours} Credit Hours
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeCourseView.code} - {activeCourseView.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{activeCourseView.description}</p>
          </div>

          <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 text-right flex-shrink-0">
            <span className="text-[11px] font-semibold text-slate-400">Total Assignments</span>
            <p className="text-xl font-black text-purple-950 mt-0.5">{courseAssignments.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-purple-300" />
              <h2 className="text-base font-extrabold tracking-wide">Assignment Schedule & Portal</h2>
            </div>
            <button
              onClick={() => setActiveCourseView(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {courseAssignments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Assignments Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your instructor has not posted any assignments for this course yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 text-center">Sr. #</th>
                    <th className="py-3.5 px-4">Assignment Title & Instructions</th>
                    <th className="py-3.5 px-4">Question Paper</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Due Date</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Total Marks</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Obtained Marks</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Submit</th>
                    <th className="py-3.5 px-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {courseAssignments.map((asg, index) => {
                    const sub = submissions.find(
                      (s) => s.assignmentId === asg.id && s.studentId === currentUser.id
                    );
                    const deadline = getDeadlineStatus(asg.deadlineDate);

                    return (
                      <tr key={asg.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-4 px-4 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-4 px-4 max-w-sm">
                          <p className="font-extrabold text-slate-900 text-xs">{asg.title}</p>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {asg.description}
                          </p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {asg.resourceFileName ? (
                            <div className="flex flex-col items-start gap-1">
                              <button
                                type="button"
                                onClick={() => handleDownloadPaper(asg)}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold shadow-sm shadow-purple-900/20 hover:shadow-md transition-all active:scale-95 group cursor-pointer"
                                title={`Download ${asg.resourceFileName}`}
                              >
                                <Download className="w-3.5 h-3.5 text-white transition-transform group-hover:translate-y-0.5" />
                                <span>Download Paper</span>
                              </button>
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px] block" title={asg.resourceFileName}>
                                {asg.resourceFileName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              No paper attached
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-900 text-xs font-mono">
                              {formatDateDDMMMYYYY(asg.deadlineDate)}
                            </span>
                            {deadline.isExpired ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 w-fit">
                                <Lock className="w-3 h-3" />
                                Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono w-fit">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {deadline.compactText || deadline.text}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-black text-slate-800 text-sm whitespace-nowrap">
                          {asg.totalMarks}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {sub?.status === 'graded' && sub?.score !== undefined && sub?.score !== null ? (
                            <span className="inline-flex items-center justify-center font-black text-xs px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 font-mono shadow-xs">
                              {sub.score}
                            </span>
                          ) : (
                            <span className="font-mono text-sm font-bold text-slate-400 select-none">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {sub ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Submitted
                              </span>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {formatDateDDMMMYYYY(sub.submittedAt)}
                              </p>
                              {!deadline.isExpired && (
                                <button
                                  onClick={() => setActiveAssignmentToSubmit(asg)}
                                  className="text-[11px] font-bold text-purple-700 hover:underline block cursor-pointer"
                                >
                                  Edit / Resubmit
                                </button>
                              )}
                            </div>
                          ) : deadline.isExpired ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
                              <Lock className="w-3.5 h-3.5" />
                              Closed
                            </span>
                          ) : (
                            <button
                              onClick={() => setActiveAssignmentToSubmit(asg)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20 transition hover:scale-[1.02] cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit</span>
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {sub?.status === 'graded' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-emerald-600" />
                                <span className="font-extrabold text-xs text-emerald-900">
                                  Graded
                                </span>
                              </div>
                              {sub.teacherFeedback && (
                                <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 italic max-w-xs">
                                  &quot;{sub.teacherFeedback}&quot;
                                </p>
                              )}
                            </div>
                          ) : sub ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200">
                              Under Evaluation
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not Submitted</span>
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

        {activeAssignmentToSubmit && (
          <StudentSubmissionWizard
            assignment={activeAssignmentToSubmit}
            onClose={() => {
              setActiveAssignmentToSubmit(null);
              loadData();
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: TAB === 'assignments' (AGGREGATED ASSIGNMENTS HUB FOR ALL COURSES)
  // =========================================================================
  if (currentTab === 'assignments') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300">
                Academic Calendar & Schedule
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                Assignments Hub (Semester {currentUser.semester})
              </h1>
              <p className="text-xs text-purple-200 mt-1 font-mono">
                Showing all active and past assignments across all your enrolled subjects.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 text-right">
              <span className="text-[11px] text-purple-200 block">Total Assignments</span>
              <span className="text-2xl font-black">{relevantAssignments.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Active Course Assignments & Deadlines
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Roll #{currentUser.rollNumber} • Section {currentUser.section}
            </span>
          </div>

          {relevantAssignments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-purple-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Assignments Found</h3>
              <p className="text-xs text-slate-500">There are currently no assignments scheduled for your semester.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Assignment Title</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Marks</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {relevantAssignments.map((asg) => {
                    const sub = submissions.find(
                      (s) => s.assignmentId === asg.id && s.studentId === currentUser.id
                    );
                    const deadline = getDeadlineStatus(asg.deadlineDate);

                    return (
                      <tr key={asg.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-4 px-4 font-bold text-purple-900">
                          <span className="font-mono bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg">
                            {asg.subjectCode}
                          </span>
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <p className="font-bold text-slate-900 text-xs">{asg.title}</p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{asg.description}</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 font-mono text-xs">{formatDateDDMMMYYYY(asg.deadlineDate)}</span>
                            {deadline.isExpired ? (
                              <span className="block text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 w-fit">
                                Locked
                              </span>
                            ) : (
                              <span className="block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-mono w-fit">
                                {deadline.compactText || deadline.text}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-900">
                          {asg.totalMarks}
                        </td>
                        <td className="py-4 px-4">
                          {sub ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {sub.status === 'graded' ? `Graded (${sub.score}/${asg.totalMarks})` : 'Submitted'}
                            </span>
                          ) : deadline.isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              <Lock className="w-3 h-3" />
                              Missed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {sub ? (
                            !deadline.isExpired ? (
                              <button
                                onClick={() => setActiveAssignmentToSubmit(asg)}
                                className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition"
                              >
                                Edit File
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs font-mono">Locked</span>
                            )
                          ) : !deadline.isExpired ? (
                            <button
                              onClick={() => setActiveAssignmentToSubmit(asg)}
                              className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition"
                            >
                              Submit
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">Closed</span>
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

        {activeAssignmentToSubmit && (
          <StudentSubmissionWizard
            assignment={activeAssignmentToSubmit}
            onClose={() => {
              setActiveAssignmentToSubmit(null);
              loadData();
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: TAB === 'my-submissions' (ACADEMIC SUBMISSIONS & SCORECARD)
  // =========================================================================
  if (currentTab === 'my-submissions') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300">
                Academic Evaluation & Grades
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                My Submissions & Scorecard
              </h1>
              <p className="text-xs text-purple-200 mt-1 font-mono">
                Student: {currentUser.name} • Roll #{currentUser.rollNumber} (Semester {currentUser.semester}, Section {currentUser.section})
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/10 text-center">
                <span className="text-[10px] text-purple-200 uppercase font-bold block">Submitted</span>
                <span className="text-xl font-black">{mySubmissions.length}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/10 text-center">
                <span className="text-[10px] text-purple-200 uppercase font-bold block">Graded</span>
                <span className="text-xl font-black text-emerald-300">{gradedSubmissions.length}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/10 text-center">
                <span className="text-[10px] text-purple-200 uppercase font-bold block">Avg Score</span>
                <span className="text-xl font-black text-amber-300">{avgScore}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Submitted Work & Instructor Feedback
            </h2>
          </div>

          {mySubmissions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Submissions Recorded</h3>
              <p className="text-xs text-slate-500">You have not submitted any assignments yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Assignment</th>
                    <th className="py-3.5 px-4">Attached Solution</th>
                    <th className="py-3.5 px-4">Submitted At</th>
                    <th className="py-3.5 px-4 text-center">Marks</th>
                    <th className="py-3.5 px-4">Teacher Critique</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {mySubmissions.map((sub) => {
                    const asg = assignments.find((a) => a.id === sub.assignmentId);
                    const file = sub.files?.[0];
                    const isLocked = asg ? new Date(`${asg.deadlineDate}T23:59:59`) < new Date() : true;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-purple-900">
                          {asg?.subjectCode || 'N/A'}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900 max-w-xs">
                          {asg?.title || 'Assignment'}
                        </td>
                        <td className="py-4 px-4">
                          {file ? (
                            <button
                              type="button"
                              onClick={() => {
                                const dl = file.dataUrl || file.url;
                                if (!dl) return;
                                const link = document.createElement('a');
                                link.href = dl;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition"
                              title="Download submitted file"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <Download className="w-3 h-3 text-slate-500" />
                            </button>
                          ) : (
                            <span className="text-slate-400 italic">No file</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {formatDateTimeDDMMMYYYY(sub.submittedAt)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {sub.status === 'graded' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                              {sub.score} / {asg?.totalMarks || 20}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px]">
                              Under Evaluation
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          {sub.teacherFeedback ? (
                            <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200 italic">
                              &quot;{sub.teacherFeedback}&quot;
                            </p>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No remarks yet</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {asg && !isLocked ? (
                            <button
                              onClick={() => setActiveAssignmentToSubmit(asg)}
                              className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition"
                            >
                              Update File
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">Finalized</span>
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

        {activeAssignmentToSubmit && (
          <StudentSubmissionWizard
            assignment={activeAssignmentToSubmit}
            onClose={() => {
              setActiveAssignmentToSubmit(null);
              loadData();
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: DEFAULT TAB === 'dashboard' (ENROLLED COURSES CARDS GRID)
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300">
              Department of Computer Science
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-xs text-purple-200 mt-1 font-mono">
              ID: <strong className="text-white">{currentUser.loginId}</strong> • Roll #{currentUser.rollNumber} • Semester {currentUser.semester} • Section {currentUser.section}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 text-right">
            <span className="text-[11px] text-purple-200 block">Enrolled Courses</span>
            <span className="text-2xl font-black">{mySubjects.length}</span>
          </div>
        </div>
      </div>

      {/* MY COURSES SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            My Courses (Semester {currentUser.semester})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mySubjects.map((sub) => {
            const subjectAssignments = relevantAssignments.filter((a) => a.subjectId === sub.id);

            return (
              <div
                key={sub.id}
                onClick={() => setActiveCourseView(sub)}
                className="rounded-3xl border border-slate-200 bg-white hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col justify-between group"
              >
                <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-5 group-hover:from-purple-900 group-hover:to-indigo-900 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-black tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md">
                      {sub.code}
                    </span>
                    <span className="text-[11px] font-semibold text-purple-200">
                      {sub.creditHours} Credit Hours
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base tracking-tight">{sub.name}</h3>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {sub.description}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-800 text-xs font-bold">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                      {subjectAssignments.length} Assignment{subjectAssignments.length === 1 ? '' : 's'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCourseView(sub);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-purple-700 hover:text-purple-900 group-hover:translate-x-1 transition-transform"
                    >
                      <span>View Assignments</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {activeAssignmentToSubmit && (
        <StudentSubmissionWizard
          assignment={activeAssignmentToSubmit}
          onClose={() => {
            setActiveAssignmentToSubmit(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
