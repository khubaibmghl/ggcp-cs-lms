'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataStore } from '@/lib/storage';
import { Assignment, Submission, Section } from '@/types';
import {
  FileText,
  CheckCircle,
  Clock,
  ShieldAlert,
  Users,
  Award,
  Search,
  Eye,
  ArrowLeft,
  AlertTriangle,
  X,
  FileCode,
  Flame,
  Activity,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';

interface TeacherSubmissionsModalProps {
  assignment: Assignment;
  onClose: () => void;
}

export const TeacherSubmissionsModal: React.FC<TeacherSubmissionsModalProps> = ({
  assignment,
  onClose,
}) => {
  const { users } = useAuth();
  const [selectedSection, setSelectedSection] = useState<'All' | Section>('All');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');

  const allSubmissions = dataStore.getSubmissions().filter((s) => s.assignmentId === assignment.id);

  // Filter submissions by target section
  const filteredSubmissions =
    selectedSection === 'All'
      ? allSubmissions
      : allSubmissions.filter((s) => s.studentSection === selectedSection);

  // Filter all students registered for this semester & section
  const sectionStudents = users.filter((u) => {
    if (u.role !== 'student' || u.semester !== assignment.semester) return false;
    if (selectedSection !== 'All' && u.section !== selectedSection) return false;
    return true;
  });

  // Calculate missing roll numbers
  const submittedRolls = new Set(filteredSubmissions.map((s) => s.studentRollNumber));
  const missingStudents = sectionStudents.filter((s) => !submittedRolls.has(s.rollNumber || 0));

  const handleOpenGrading = (sub: Submission) => {
    setSelectedSubmission(sub);
    setGradingScore(sub.score || sub.aiSuggestedScore || 0);
    setGradingFeedback(sub.teacherFeedback || '');
  };

  const handleSaveGrade = () => {
    if (!selectedSubmission) return;
    const updated: Submission = {
      ...selectedSubmission,
      status: 'graded',
      score: Number(gradingScore),
      teacherFeedback: gradingFeedback.trim(),
    };
    dataStore.upsertSubmission(updated);
    setSelectedSubmission(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Top Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200">
                {assignment.subjectCode}
              </span>
              <span className="text-xs text-slate-300">
                Semester {assignment.semester} • Max Marks: {assignment.totalMarks}
              </span>
            </div>
            <h2 className="text-lg font-extrabold truncate max-w-xl">{assignment.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Section Filter & Stats Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-600">Filter Section:</span>
            {(['All', 'A1', 'A2', 'B'] as ('All' | Section)[]).map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  selectedSection === sec
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {sec === 'All' ? 'All Sections' : `Section ${sec}`}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="text-slate-700">
              Submitted: <strong className="text-emerald-700">{filteredSubmissions.length}</strong>
            </span>
            <span className="text-slate-700">
              Missing (Not Submitted):{' '}
              <strong className="text-rose-600">{missingStudents.length}</strong>
            </span>
          </div>
        </div>

        {/* Modal Main Body (2 Columns: Submissions Table & Missing Roster) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Submissions Table (2 cols width) */}
          <div className="lg:col-span-2 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-700" />
              Student Submissions ({filteredSubmissions.length})
            </h3>

            {filteredSubmissions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                No submissions recorded yet for Section {selectedSection}.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((sub) => {
                  const plag = sub.integrityReport?.peerPlagiarismScore || 0;
                  const aiLikelihood = sub.integrityReport?.aiLikelihoodScore || 0;
                  const isBurst = sub.integrityReport?.telemetry?.suspiciousBurstDetected;

                  return (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-xs transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center font-mono">
                            #{sub.studentRollNumber}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{sub.studentName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Sec {sub.studentSection} • Submitted:{' '}
                              {new Date(sub.submittedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Status / Score pill */}
                        {sub.status === 'graded' ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                            Score: {sub.score} / {assignment.totalMarks}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                            Pending Review
                          </span>
                        )}
                      </div>

                      {/* Integrity Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            plag > 50
                              ? 'bg-rose-100 text-rose-800'
                              : plag > 20
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <ShieldAlert className="w-3 h-3" />
                          Plagiarism: {plag}%
                          {sub.integrityReport?.matchedWithRollNumber &&
                            ` (matches Roll #${sub.integrityReport.matchedWithRollNumber})`}
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          AI Likelihood: {aiLikelihood}%
                        </span>

                        {isBurst && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            Copy-Paste Burst Detected!
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                          {sub.textSubmission ? 'Code/Text' : ''}{' '}
                          {sub.files?.length > 0 ? `+ ${sub.files.length} attachment(s)` : ''}
                        </span>

                        <button
                          onClick={() => handleOpenGrading(sub)}
                          className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs"
                        >
                          Grade & Review Submission
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Missing Roll Numbers Roster */}
          <div className="p-6 bg-slate-50/60 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-600" />
                Missing Submissions Roster ({missingStudents.length})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Students registered in this section who have NOT submitted this assignment.
              </p>
            </div>

            {missingStudents.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-emerald-700 font-bold">
                🎉 100% Submission rate! All students in Section {selectedSection} have submitted.
              </div>
            ) : (
              <div className="space-y-2">
                {missingStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 bg-white rounded-xl border border-rose-200/80 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 font-mono font-bold flex items-center justify-center text-xs">
                        #{st.rollNumber}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{st.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Section {st.section} • Semester {st.semester}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase tracking-wide">
                      Missing
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- DETAILED GRADING & INTEGRITY MODAL DRAWER --- */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase">
                    Submission Evaluation & Integrity Audit
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Roll #{selectedSubmission.studentRollNumber} — {selectedSubmission.studentName} (Sec{' '}
                    {selectedSubmission.studentSection})
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Integrity & Telemetry Audit Box */}
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    3-Layer Integrity Analysis
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Plagiarism:{' '}
                      <strong
                        className={
                          selectedSubmission.integrityReport?.peerPlagiarismScore > 50
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }
                      >
                        {selectedSubmission.integrityReport?.peerPlagiarismScore}%
                      </strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      AI Likelihood:{' '}
                      <strong className="text-purple-300">
                        {selectedSubmission.integrityReport?.aiLikelihoodScore}%
                      </strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedSubmission.integrityReport?.aiReasoning}
                </p>

                {/* Telemetry Timeline logs */}
                {selectedSubmission.integrityReport?.telemetry?.timelineLogs && (
                  <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Input Telemetry Audit Trail:
                    </p>
                    <ul className="text-xs text-slate-300 font-mono space-y-1">
                      {selectedSubmission.integrityReport.telemetry.timelineLogs.map((log, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-purple-400">›</span>
                          <span
                            className={
                              log.includes('SUSPICIOUS') ? 'text-rose-400 font-bold' : 'text-slate-300'
                            }
                          >
                            {log}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Student Code / Text Submission Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Submitted Code / Solution:
                </label>
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto max-h-60 border border-slate-800">
                  {selectedSubmission.textSubmission || '(No direct text/code submitted; check attachments below)'}
                </pre>
              </div>

              {/* Student Attached Files & Handwritten Images (Cloudinary 25 GB / Local) */}
              {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Attached Files & Handwritten Pages ({selectedSubmission.files.length}):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedSubmission.files.map((file, idx) => {
                      const fileSrc = file.url || file.dataUrl;
                      const isImage = file.type?.startsWith('image/');
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col gap-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {file.size >= 1024 * 1024
                                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.round(file.size / 1024)} KB`}
                            </span>
                          </div>

                          {/* Image preview */}
                          {isImage && fileSrc && (
                            <a
                              href={fileSrc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative block rounded-xl overflow-hidden border border-slate-100 bg-slate-50 group aspect-video hover:opacity-95 transition"
                            >
                              <img
                                src={fileSrc}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Click to view full-res in new tab
                              </div>
                            </a>
                          )}

                          {fileSrc && (
                            <a
                              href={fileSrc}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={file.name}
                              className="text-center text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Open / Download Full Solution
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grading Input Controls */}
              <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-purple-950 block">
                      Assign Grade (Out of {assignment.totalMarks}):
                    </label>
                    <span className="text-[11px] text-purple-800">
                      AI Suggested Score: {selectedSubmission.aiSuggestedScore || 'N/A'}
                    </span>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={assignment.totalMarks}
                    value={gradingScore}
                    onChange={(e) => setGradingScore(Number(e.target.value))}
                    className="w-24 text-base font-extrabold text-center px-3 py-2 rounded-xl bg-white border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">
                    Instructor Feedback & Remarks for Student:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide constructive evaluation remarks, code style feedback, or penalty notes..."
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2 rounded-xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-700"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGrade}
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20"
                  >
                    Save Grade & Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
