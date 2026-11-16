'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataStore } from '@/lib/storage';
import { Assignment, Submission, Subject } from '@/types';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  ChevronRight,
  Download,
  Award,
  Sparkles,
  Calendar,
  Lock,
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
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

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

  const filteredAssignments =
    selectedSubjectFilter === 'all'
      ? relevantAssignments
      : relevantAssignments.filter((a) => a.subjectId === selectedSubjectFilter);

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

  return (
    <div className="space-y-8">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-2">
              <Sparkles className="w-4 h-4 text-purple-300" />
              Student Academic Terminal • Fall 2026
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-sm text-purple-200/80 mt-1">
              Roll Number: <strong className="text-white">#{currentUser.rollNumber}</strong> • BS CS Semester{' '}
              <strong className="text-white">{currentUser.semester}</strong> • Section{' '}
              <strong className="text-white">{currentUser.section}</strong>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
            <span className="text-xs text-purple-200">Active Course Load</span>
            <p className="text-2xl font-black mt-1">{mySubjects.length} Courses</p>
            <span className="text-[11px] text-purple-300/80">
              {relevantAssignments.length} Assignment(s) Pending/Completed
            </span>
          </div>
        </div>
      </div>

      {/* MY COURSES SECTION (Inspired by VU LMS Course Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              My Courses — Semester {currentUser.semester}
            </h2>
            <p className="text-xs text-slate-500">
              Click any course to filter assignments, view instructors, or inspect course details.
            </p>
          </div>

          {selectedSubjectFilter !== 'all' && (
            <button
              onClick={() => setSelectedSubjectFilter('all')}
              className="text-xs font-bold text-purple-700 hover:underline"
            >
              Show All Courses
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mySubjects.map((sub) => {
            const courseAssignments = relevantAssignments.filter((a) => a.subjectId === sub.id);
            const isSelected = selectedSubjectFilter === sub.id;

            return (
              <div
                key={sub.id}
                onClick={() =>
                  setSelectedSubjectFilter(isSelected ? 'all' : sub.id)
                }
                className={`rounded-3xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-purple-600 bg-white shadow-lg ring-2 ring-purple-200'
                    : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-md'
                }`}
              >
                {/* Course Header Banner */}
                <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-black tracking-wider bg-white/20 px-2 py-0.5 rounded">
                      {sub.code}
                    </span>
                    <span className="text-[11px] font-semibold text-purple-200">
                      {sub.creditHours} Credit Hours
                    </span>
                  </div>
                  <h3 className="font-bold text-sm tracking-tight">{sub.name}</h3>
                </div>

                {/* Course Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-500 line-clamp-2">{sub.description}</p>

                  {/* VU-Style Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs">
                      <span className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold">
                        <BookOpen className="w-3.5 h-3.5" />
                        Assignments
                        {courseAssignments.length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-purple-700 text-white text-[10px] font-black flex items-center justify-center">
                            {courseAssignments.length}
                          </span>
                        )}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-slate-400 group-hover:text-purple-600 flex items-center">
                      {isSelected ? 'Filtered' : 'View'}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ASSIGNMENTS TABLE (Inspired by VU LMS Assignment Grid) */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Assignments Schedule & Submissions
            </h2>
            <p className="text-xs text-slate-500">
              Assignments lock automatically at 11:59:59 PM (Midnight) of their deadline date. Resubmission is permitted until expiry.
            </p>
          </div>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
            No active assignments found for your semester and section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Sr.</th>
                  <th className="py-3 px-4">Subject & Title</th>
                  <th className="py-3 px-4">Problem / Resource</th>
                  <th className="py-3 px-4">Midnight Due Date</th>
                  <th className="py-3 px-4 text-center">Total Marks</th>
                  <th className="py-3 px-4">Submission Status</th>
                  <th className="py-3 px-4">Result / Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAssignments.map((asg, index) => {
                  const sub = submissions.find(
                    (s) => s.assignmentId === asg.id && s.studentId === currentUser.id
                  );
                  const deadline = getDeadlineStatus(asg.deadlineDate);

                  return (
                    <tr key={asg.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Sr. No */}
                      <td className="py-4 px-4 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Title */}
                      <td className="py-4 px-4 max-w-xs">
                        <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                          {asg.subjectCode}
                        </span>
                        <p className="font-bold text-slate-900 text-xs mt-1">{asg.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{asg.description}</p>
                      </td>

                      {/* Problem file */}
                      <td className="py-4 px-4">
                        {asg.resourceFileName ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px]">
                            <FileText className="w-3.5 h-3.5 text-purple-600" />
                            {asg.resourceFileName}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Prompt Only</span>
                        )}
                      </td>

                      {/* Due Date & Countdown */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{asg.deadlineDate}</p>
                          <p className="text-[10px] text-slate-400 font-mono">11:59:59 PM (Midnight)</p>
                          {deadline.isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3" />
                              Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              {deadline.text}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Marks */}
                      <td className="py-4 px-4 text-center font-extrabold text-slate-800 text-xs">
                        {asg.totalMarks}
                      </td>

                      {/* Submission Column */}
                      <td className="py-4 px-4">
                        {sub ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              Submitted
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {new Date(sub.submittedAt).toLocaleDateString()} at{' '}
                              {new Date(sub.submittedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
                            <Lock className="w-3 h-3" />
                            Missed (Locked)
                          </span>
                        ) : (
                          <button
                            onClick={() => setActiveAssignmentToSubmit(asg)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition"
                          >
                            <UploadCloud className="w-4 h-4" />
                            Submit Assignment
                          </button>
                        )}
                      </td>

                      {/* Result / Marks Column */}
                      <td className="py-4 px-4">
                        {sub?.status === 'graded' ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-amber-500" />
                              <span className="font-extrabold text-xs text-slate-900">
                                {sub.score} / {asg.totalMarks}
                              </span>
                            </div>
                            {sub.teacherFeedback && (
                              <p className="text-[11px] text-slate-500 italic max-w-xs">
                                &quot;{sub.teacherFeedback}&quot;
                              </p>
                            )}
                          </div>
                        ) : sub ? (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Awaiting Evaluation
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
