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
} from 'lucide-react';
import { StudentSubmissionWizard } from './StudentSubmissionWizard';

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
      return { isExpired: true, text: 'Expired & Locked at Midnight', diffMs: 0 };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let countdown = '';
    if (days > 0) countdown += `${days}d `;
    countdown += `${hours}h ${mins}m left`;

    return { isExpired: false, text: countdown, diffMs };
  };

  // =========================================================================
  // VIEW 1: DEDICATED COURSE ASSIGNMENTS PAGE (MATCHES VU LMS IMAGE REFERENCE)
  // =========================================================================
  if (activeCourseView) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-150">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveCourseView(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3.5 py-2 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Courses</span>
          </button>
          <span className="text-xs text-slate-400 font-mono">
            Semester {currentUser.semester} • Section {currentUser.section}
          </span>
        </div>

        {/* Course Header Banner */}
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

        {/* VU LMS Signature Styled Assignment Container */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Signature Purple Header Bar */}
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

          {/* Table Content */}
          {courseAssignments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Assignments Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                There are currently no active assignments published for {activeCourseView.code} ({activeCourseView.name}). Check back soon or consult your course instructor.
              </p>
              <button
                onClick={() => setActiveCourseView(null)}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-700 text-white font-bold text-xs"
              >
                Return to Course Overview
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">Sr. No.</th>
                    <th className="py-3.5 px-4">Title</th>
                    <th className="py-3.5 px-4">Assignment File</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Total Marks</th>
                    <th className="py-3.5 px-4">Submit</th>
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
                        {/* Sr. No */}
                        <td className="py-4 px-4 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>

                        {/* Title & Description */}
                        <td className="py-4 px-4 max-w-sm">
                          <p className="font-extrabold text-slate-900 text-xs">{asg.title}</p>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {asg.description}
                          </p>
                        </td>

                        {/* Assignment File Link */}
                        <td className="py-4 px-4">
                          {asg.resourceFileName ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 font-mono text-[11px] font-bold border border-purple-200/60">
                              <Code2 className="w-3.5 h-3.5 text-purple-600" />
                              <span>{asg.resourceFileName}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              Instructions in prompt
                            </span>
                          )}
                        </td>

                        {/* Due Date & Midnight Lockout */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 text-xs">{asg.deadlineDate}</p>
                            <span className="text-[10px] text-slate-400 block font-mono">11:59:59 PM (Midnight)</span>
                            {deadline.isExpired ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <Lock className="w-3 h-3" />
                                Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {deadline.text}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Marks */}
                        <td className="py-4 px-4 text-center font-black text-slate-800 text-sm">
                          {asg.totalMarks}
                        </td>

                        {/* Submit Action */}
                        <td className="py-4 px-4">
                          {sub ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Submitted
                              </span>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {new Date(sub.submittedAt).toLocaleDateString()}
                              </p>
                              {!deadline.isExpired && (
                                <button
                                  onClick={() => setActiveAssignmentToSubmit(asg)}
                                  className="text-[11px] font-bold text-purple-700 hover:underline block"
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
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20 transition hover:scale-[1.02]"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit</span>
                            </button>
                          )}
                        </td>

                        {/* Result / Score */}
                        <td className="py-4 px-4">
                          {sub?.status === 'graded' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-amber-500" />
                                <span className="font-black text-xs text-slate-900">
                                  Score: {sub.score} / {asg.totalMarks}
                                </span>
                              </div>
                              {sub.teacherFeedback && (
                                <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 italic max-w-xs">
                                  &quot;{sub.teacherFeedback}&quot;
                                </p>
                              )}
                            </div>
                          ) : sub ? (
                            <span className="text-[11px] text-slate-400 font-semibold">
                              Awaiting Grading
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-300">-</span>
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

        {/* --- 3-STEP SUBMISSION WIZARD MODAL --- */}
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
  // VIEW 2: COURSES OVERVIEW CARDS (LANDING VIEW INSIDE STUDENT ACCOUNT)
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
                {/* Course Header Banner */}
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

                {/* Course Body */}
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

      {/* --- 3-STEP SUBMISSION WIZARD MODAL --- */}
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
