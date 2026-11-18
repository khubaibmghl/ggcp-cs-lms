'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataStore } from '@/lib/storage';
import { Assignment, Submission, Section, UploadedFile } from '@/types';
import { computePeerPlagiarism, PlagiarismScanResult } from '@/lib/plagiarismEngine';
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
  Download,
  Sparkles,
  CheckCheck,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Image as ImageIcon,
  Play,
} from 'lucide-react';
import { TeacherGradingWorkspace } from './TeacherGradingWorkspace';

interface TeacherSubmissionsModalProps {
  assignment: Assignment;
  onClose: () => void;
}

export const TeacherSubmissionsModal: React.FC<TeacherSubmissionsModalProps> = ({
  assignment,
  onClose,
}) => {
  const { users } = useAuth();
  const { showSuccess, showError } = useToast();
  const [selectedSection, setSelectedSection] = useState<'All' | Section>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradingScore, setGradingScore] = useState<number | string>('');
  const [gradingFeedback, setGradingFeedback] = useState<string>('');

  // Plagiarism Scan State
  const [scanningSubId, setScanningSubId] = useState<string | null>(null);
  const [plagiarismReport, setPlagiarismReport] = useState<PlagiarismScanResult | null>(null);
  const [plagiarismTargetSub, setPlagiarismTargetSub] = useState<Submission | null>(null);

  // Automated Correction Evaluation State
  const [evaluatingSubId, setEvaluatingSubId] = useState<string | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<any | null>(null);
  const [evaluatingSub, setEvaluatingSub] = useState<Submission | null>(null);
  const [evalTab, setEvalTab] = useState<'scorecard' | 'modelSolution' | 'grounding'>('scorecard');
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [isServerAiConfigured, setIsServerAiConfigured] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ggcp_gemini_api_key') || '';
    }
    return '';
  });

  useEffect(() => {
    fetch('/api/evaluate-submission')
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.configured === 'boolean') {
          setIsServerAiConfigured(d.configured);
        }
      })
      .catch(() => {});
  }, []);

  const isGeminiActive = isServerAiConfigured || Boolean(geminiApiKey && geminiApiKey.trim().length > 10);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceStartIndex, setWorkspaceStartIndex] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);

  const allSubmissions = dataStore.getSubmissions().filter((s) => s.assignmentId === assignment.id);

  // Filter submissions by target section
  const filteredSubmissions =
    selectedSection === 'All'
      ? allSubmissions
      : allSubmissions.filter((s) => s.studentSection === selectedSection);

  // Filter submissions by live search query (name or roll number)
  const displayedSubmissions = filteredSubmissions.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      sub.studentName.toLowerCase().includes(q) ||
      String(sub.studentRollNumber).includes(q) ||
      sub.studentSection.toLowerCase().includes(q)
    );
  });

  // Filter all students registered for this semester & section
  const sectionStudents = users.filter((u) => {
    if (u.role !== 'student' || u.semester !== assignment.semester) return false;
    if (selectedSection !== 'All' && u.section !== selectedSection) return false;
    return true;
  });

  // Calculate missing roll numbers
  const submittedRolls = new Set(filteredSubmissions.map((s) => s.studentRollNumber));
  const missingStudents = sectionStudents.filter((s) => !submittedRolls.has(s.rollNumber || 0));

  // Export official marks award list CSV formatted for College Examination Gazettes
  const handleExportAwardListCsv = () => {
    const targetStudents = [...sectionStudents].sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));

    if (targetStudents.length === 0) {
      showError('No Students Found', 'No registered students found for this class section.');
      return;
    }

    const headers = [
      'Sr #',
      'Roll Number',
      'Student Name',
      'Father Name',
      'Semester',
      'Section',
      'Total Marks',
      'Marks Obtained',
      'Status',
      'Plagiarism %',
      'Submission Date',
      'Instructor Remarks',
    ];

    const rows = targetStudents.map((stud, idx) => {
      const sub = allSubmissions.find((s) => s.studentId === stud.id);
      const isGraded = sub && sub.status === 'graded';
      const score = isGraded && sub.score !== undefined ? sub.score : sub ? 'Awaiting Grade' : '0';
      const statusText = sub
        ? isGraded
          ? 'Graded'
          : 'Submitted'
        : 'ABSENT / NOT SUBMITTED';
      const plagScore =
        sub?.integrityReport?.peerPlagiarismScore !== undefined
          ? `${sub.integrityReport.peerPlagiarismScore}%`
          : 'N/A';
      const subDate = sub?.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A';
      const remarks = sub?.teacherFeedback ? `"${sub.teacherFeedback.replace(/"/g, '""')}"` : '""';

      return [
        idx + 1,
        stud.rollNumber || 'N/A',
        `"${stud.name.replace(/"/g, '""')}"`,
        `"${(stud.fatherName || '').replace(/"/g, '""')}"`,
        stud.semester || assignment.semester,
        stud.section || selectedSection,
        assignment.totalMarks,
        score,
        statusText,
        plagScore,
        `"${subDate}"`,
        remarks,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanSubject = assignment.subjectCode.replace(/[^a-zA-Z0-9]/g, '');
    const cleanDate = new Date().toISOString().split('T')[0];
    link.download = `GGCP_Award_List_${cleanSubject}_Sem${assignment.semester}_Sec${selectedSection}_${cleanDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess(
      'Award List Exported',
      `Exported official college marks award list for ${targetStudents.length} students.`
    );
  };

  const handleOpenGrading = (sub: Submission) => {
    const idx = filteredSubmissions.findIndex((s) => s.id === sub.id);
    setWorkspaceStartIndex(idx >= 0 ? idx : 0);
    setWorkspaceOpen(true);
  };

  const handleDownloadStudentFile = (file: UploadedFile) => {
    const data = file.dataUrl || file.url;
    if (!data) return;

    if (data.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = data;
      a.download = file.name || 'assignment_solution.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Handle Cloudinary delivery URLs directly
    let downloadUrl = data;
    // For Cloudinary image uploads, adding fl_attachment guarantees direct browser download without 404
    if (downloadUrl.includes('cloudinary.com') && downloadUrl.includes('/image/upload/') && !downloadUrl.includes('/fl_attachment/')) {
      downloadUrl = downloadUrl.replace('/image/upload/', '/image/upload/fl_attachment/');
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = file.name || 'assignment_solution.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveGrade = () => {
    if (!selectedSubmission) return;
    const finalScore = gradingScore === '' ? 0 : Number(gradingScore);
    const updated: Submission = {
      ...selectedSubmission,
      status: 'graded',
      score: finalScore,
      teacherFeedback: gradingFeedback.trim(),
    };
    dataStore.upsertSubmission(updated);
    setSelectedSubmission(null);
  };

  // --- 1. REAL PEER PLAGIARISM CHECKER ---
  const handleScanPlagiarism = async (targetSub: Submission) => {
    setScanningSubId(targetSub.id);
    try {
      // 1. Extract text from target student's submission
      let targetText = targetSub.textSubmission || '';
      if (!targetText && targetSub.files?.[0]) {
        try {
          const res = await fetch('/api/extract-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: targetSub.files[0] }),
          });
          if (res.ok) {
            const d = await res.json();
            if (d.success) targetText = d.text;
          }
        } catch (err) {
          console.warn('Target text extraction error:', err);
        }
      }

      // 2. Extract text from peer submissions in this assignment
      const peers: { rollNumber: number; name: string; text: string }[] = [];
      for (const peer of allSubmissions) {
        if (peer.id === targetSub.id) continue;
        let peerText = peer.textSubmission || '';
        if (!peerText && peer.files?.[0]) {
          try {
            const res = await fetch('/api/extract-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file: peer.files[0] }),
            });
            if (res.ok) {
              const d = await res.json();
              if (d.success) peerText = d.text;
            }
          } catch (err) {
            console.warn('Peer text extraction error:', err);
          }
        }
        if (peerText) {
          peers.push({
            rollNumber: peer.studentRollNumber,
            name: peer.studentName,
            text: peerText,
          });
        }
      }

      // 3. Question paper text
      const questionText = assignment.description || assignment.title;

      // 4. Run real mathematical shingle similarity comparison
      const scanResult = computePeerPlagiarism(targetText, peers, questionText);

      // 5. Update submission integrity report in dataStore
      const updatedSub: Submission = {
        ...targetSub,
        integrityReport: {
          ...targetSub.integrityReport,
          peerPlagiarismScore: scanResult.peerPlagiarismScore,
          matchedWithRollNumber: scanResult.matchedWithRollNumber,
          aiReasoning: scanResult.summary,
        },
      };
      dataStore.upsertSubmission(updatedSub);

      setPlagiarismTargetSub(updatedSub);
      setPlagiarismReport(scanResult);
    } catch (err) {
      console.error('Error scanning peer plagiarism:', err);
      alert('Plagiarism scan encountered an error. Please try again.');
    } finally {
      setScanningSubId(null);
    }
  };

  // --- 2. REAL QUESTION-AWARE AUTOMATED ASSIGNMENT EVALUATION ---
  const handleCheckCorrection = async (sub: Submission) => {
    setEvaluatingSubId(sub.id);
    setEvaluatingSub(sub);
    try {
      const questionFilePayload = assignment.resourceFileContent
        ? {
            name: assignment.resourceFileName || 'Question_Paper.pdf',
            dataUrl: assignment.resourceFileContent,
          }
        : null;

      const solutionFilePayload = sub.files?.[0]
        ? {
            name: sub.files[0].name,
            dataUrl: sub.files[0].dataUrl,
            url: sub.files[0].url,
          }
        : null;

      const res = await fetch('/api/evaluate-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionFile: questionFilePayload,
          solutionFile: solutionFilePayload,
          questionTextOverride: assignment.description,
          solutionTextOverride: sub.textSubmission,
          assignment: {
            title: assignment.title,
            subjectCode: assignment.subjectCode,
            subjectName: assignment.subjectName,
            totalMarks: assignment.totalMarks,
          },
          student: {
            name: sub.studentName,
            rollNumber: sub.studentRollNumber,
            section: sub.studentSection,
          },
          apiKey: geminiApiKey ? geminiApiKey.trim() : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Evaluation service returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.evaluation) {
        setEvaluationReport(data.evaluation);
      } else {
        alert(data.error || 'Evaluation could not be performed on this document.');
      }
    } catch (err: any) {
      console.error('Error in automated evaluation:', err);
      alert(err.message || 'Evaluation encountered an error. Please check server logs.');
    } finally {
      setEvaluatingSubId(null);
    }
  };

  const handleApplyEvaluatedGrade = () => {
    if (!evaluatingSub || !evaluationReport) return;
    const updated: Submission = {
      ...evaluatingSub,
      status: 'graded',
      score: evaluationReport.overallScore,
      teacherFeedback: evaluationReport.instructorFeedbackDraft,
    };
    dataStore.upsertSubmission(updated);
    setEvaluationReport(null);
    setEvaluatingSub(null);
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Section:</span>
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

            {/* Live Search Input */}
            <div className="relative ml-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or roll #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-1 rounded-xl text-xs border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium w-44 sm:w-52"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            <span className="text-slate-700">
              Submitted: <strong className="text-emerald-700">{filteredSubmissions.length}</strong>
            </span>
            <span className="text-slate-700">
              Missing:{' '}
              <strong className="text-rose-600">{missingStudents.length}</strong>
            </span>

            {/* Export Official Award List (CSV) */}
            <button
              type="button"
              onClick={handleExportAwardListCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition shadow-2xs"
              title="Download official College Examination Gazette / Marks Award List (.csv) for all students"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Award List (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAiSettings(!showAiSettings)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition ${
                showAiSettings
                  ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                  : isGeminiActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                  : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              {isGeminiActive ? 'Gemini AI Active' : 'AI Engine'}
            </button>

            <button
              type="button"
              disabled={filteredSubmissions.length === 0}
              onClick={() => {
                setWorkspaceStartIndex(0);
                setWorkspaceOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-black shadow-sm disabled:opacity-40 transition"
              title="Launch classroom map and mark students one by one with live telemetry console"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Sequential Grading Theater
            </button>
          </div>
        </div>

        {/* AI Engine Settings Drawer */}
        {showAiSettings && (
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50/50 border-b border-purple-200 p-4 animate-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Assignment Correction Engine Configuration
                  </h4>
                  {isGeminiActive && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300">
                      Active &amp; Ready
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-purple-900/80 mt-1 leading-relaxed">
                  {isGeminiActive ? (
                    <>
                      Current Mode: <strong className="text-emerald-800 font-bold">Google Gemini AI Engine (Active via Institutional Server)</strong>. Zero-tolerance scoring, canonical rubric discovery, and differential student evaluation are automatically active for all faculty. You do <strong>not</strong> need to enter an API key.
                    </>
                  ) : (
                    <>
                      Current Mode: <strong>Academic Strict Rule Evaluator</strong>. Zero-tolerance scoring prevents false marks for off-topic/administrative files.
                    </>
                  )}
                </p>
              </div>

              {/* Optional Key Override */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    setGeminiApiKey(v);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('ggcp_gemini_api_key', v);
                    }
                  }}
                  placeholder="Custom Key Override (optional)..."
                  className="px-3 py-1.5 text-xs rounded-xl border border-purple-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-purple-600 w-full sm:w-56"
                  title="Leave empty to use institutional server key"
                />
                {geminiApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiApiKey('');
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('ggcp_gemini_api_key');
                      }
                    }}
                    className="text-[11px] text-rose-600 hover:underline font-bold whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Main Body (2 Columns: Submissions Table & Missing Roster) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Submissions Table (2 cols width) */}
          <div className="lg:col-span-2 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-700" />
              Student Submissions ({searchQuery.trim() ? `${displayedSubmissions.length} of ${filteredSubmissions.length}` : filteredSubmissions.length})
            </h3>

            {filteredSubmissions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                No submissions recorded yet for Section {selectedSection}.
              </div>
            ) : displayedSubmissions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                No submissions found matching &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="space-y-3">
                {displayedSubmissions.map((sub) => {
                  const plag = sub.integrityReport?.peerPlagiarismScore || 0;
                  const aiLikelihood = sub.integrityReport?.aiLikelihoodScore || 0;
                  const isBurst = sub.integrityReport?.telemetry?.suspiciousBurstDetected;

                  return (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-xs transition space-y-3"
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
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            plag > 35
                              ? 'bg-rose-100 text-rose-800'
                              : plag > 15
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

                      {/* === ACTION BUTTONS TOOLBAR AGAINST EACH SUBMISSION === */}
                      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* 1. VIEW / DOWNLOAD FILE BUTTON */}
                          {sub.files && sub.files.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleDownloadStudentFile(sub.files[0])}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition"
                              title="Download or open student submission file"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" />
                              View File
                            </button>
                          )}

                          {/* 2. CHECK PLAGIARISM BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleScanPlagiarism(sub)}
                            disabled={scanningSubId === sub.id}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] flex items-center gap-1 transition border border-purple-200 disabled:opacity-50"
                            title="Scan against all peer submissions in this class"
                          >
                            {scanningSubId === sub.id ? (
                              <>
                                <span className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                Scanning Peers...
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                                Check Plagiarism
                              </>
                            )}
                          </button>

                          {/* 3. CHECK ASSIGNMENT CORRECTION BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleCheckCorrection(sub)}
                            disabled={evaluatingSubId === sub.id}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition border border-emerald-200 disabled:opacity-50 shadow-2xs"
                            title="Automated correction against the official assignment question paper"
                          >
                            {evaluatingSubId === sub.id ? (
                              <>
                                <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                Evaluating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                Check Correction
                              </>
                            )}
                          </button>
                        </div>

                        {/* 4. GRADE & REVIEW SUBMISSION BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleOpenGrading(sub)}
                          className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Grade & Review
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

        {/* ========================================================================= */}
        {/* --- MODAL 1: REAL PEER PLAGIARISM AUDIT REPORT MODAL ---                  */}
        {/* ========================================================================= */}
        {plagiarismReport && plagiarismTargetSub && (
          <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                    Peer Plagiarism Investigation Report
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Roll #{plagiarismTargetSub.studentRollNumber} — {plagiarismTargetSub.studentName} (Sec {plagiarismTargetSub.studentSection})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setPlagiarismReport(null);
                    setPlagiarismTargetSub(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Plagiarism Score Summary Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  plagiarismReport.riskLevel === 'critical'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : plagiarismReport.riskLevel === 'moderate'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-black text-xl shadow-sm ${
                      plagiarismReport.riskLevel === 'critical'
                        ? 'bg-rose-600 text-white'
                        : plagiarismReport.riskLevel === 'moderate'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {plagiarismReport.peerPlagiarismScore}%
                  </div>
                  <div>
                    <h4 className="text-sm font-black">
                      {plagiarismReport.riskLevel === 'critical'
                        ? 'Critical Peer Collusion Detected'
                        : plagiarismReport.riskLevel === 'moderate'
                        ? 'Moderate Peer Overlap'
                        : 'Authentic & Original Work'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{plagiarismReport.summary}</p>
                  </div>
                </div>

                {/* Sub-metrics Pills */}
                <div className="flex sm:flex-col gap-2 text-[11px] font-mono font-semibold self-stretch sm:self-auto justify-end">
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200/60 shadow-2xs">
                    Literal Text: <strong>{plagiarismReport.literalScore}%</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200/60 shadow-2xs">
                    MOSS Code Structure: <strong>{plagiarismReport.structuralCodeScore}%</strong>
                  </span>
                </div>
              </div>

              {/* Matched Peer Banner */}
              {plagiarismReport.matchedWithRollNumber && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                      Highest Correlating Peer Submission:
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      Roll #{plagiarismReport.matchedWithRollNumber} — {plagiarismReport.matchedWithName}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800">
                    MOSS AST Tokenizer Verified
                  </span>
                </div>
              )}

              {/* Side-by-Side Colliding Snippets Excerpts */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Verifiable Collision Evidence ({plagiarismReport.matchingSnippets.length} Matches Detected)
                  </h4>
                  <span className="text-[10px] text-slate-500 italic">
                    Comparing Target Student vs Matched Peer
                  </span>
                </div>

                {plagiarismReport.matchingSnippets.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    No verbatim sentence collisions or structural code matches detected against classmates.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {plagiarismReport.matchingSnippets.map((snip, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 text-xs space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-rose-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-rose-200 text-rose-900 flex items-center justify-center font-mono text-[10px]">
                              {idx + 1}
                            </span>
                            {snip.matchType}
                          </span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-rose-200/80 text-rose-900 text-[10px]">
                            {snip.similarity}% Congruence
                          </span>
                        </div>

                        {/* Side-by-side Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                              Target Student (Roll #{plagiarismTargetSub.studentRollNumber}):
                            </span>
                            <pre className="font-mono text-slate-800 whitespace-pre-wrap leading-relaxed text-[10.5px]">
                              {snip.studentSnippet}
                            </pre>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                              Matched Peer (Roll #{snip.peerRollNumber} — {snip.peerStudentName}):
                            </span>
                            <pre className="font-mono text-slate-800 whitespace-pre-wrap leading-relaxed text-[10.5px]">
                              {snip.peerSnippet}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Compared against {plagiarismReport.totalComparisons} classmate submissions
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPlagiarismReport(null);
                    setPlagiarismTargetSub(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-sm"
                >
                  Close Audit Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* --- MODAL 2: AUTOMATED QUESTION-AWARE ASSIGNMENT EVALUATION REPORT ---     */}
        {/* ========================================================================= */}
        {evaluationReport && evaluatingSub && (
          <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                        evaluationReport.overallScore === 0
                          ? 'text-rose-700 bg-rose-50 border-rose-200'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {evaluationReport.overallScore === 0 ? 'Off-Topic / Non-Compliant' : 'Automated Assignment Correction'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      Engine: {evaluationReport.aiEngineUsed}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Roll #{evaluatingSub.studentRollNumber} — {evaluatingSub.studentName} (Sec {evaluatingSub.studentSection})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setEvaluationReport(null);
                    setEvaluatingSub(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Recommended Score Banner */}
              <div
                className={`text-white rounded-2xl p-5 flex items-center justify-between shadow-lg transition ${
                  evaluationReport.overallScore === 0
                    ? 'bg-gradient-to-r from-rose-700 via-rose-800 to-slate-950 border border-rose-500/30'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900'
                }`}
              >
                <div>
                  <span
                    className={`text-xs font-semibold block uppercase tracking-wider ${
                      evaluationReport.overallScore === 0 ? 'text-rose-200' : 'text-emerald-200'
                    }`}
                  >
                    {evaluationReport.overallScore === 0 ? '⚠️ Off-Topic Evaluation (0 Marks)' : 'Recommended Grade'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black">{evaluationReport.overallScore}</span>
                    <span className="text-base opacity-80">/ {assignment.totalMarks} Marks</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 ${
                        evaluationReport.overallScore === 0
                          ? 'bg-rose-950/70 text-rose-200 border border-rose-400/30'
                          : 'bg-white/20'
                      }`}
                    >
                      {evaluationReport.percentage}% • {evaluationReport.status}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyEvaluatedGrade}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition flex items-center gap-1.5 ${
                    evaluationReport.overallScore === 0
                      ? 'bg-rose-100 hover:bg-white text-rose-950'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCheck className={`w-4 h-4 ${evaluationReport.overallScore === 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                  Apply Score & Feedback
                </button>
              </div>

              {/* 3-Tab Segment Control */}
              <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setEvalTab('scorecard')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    evalTab === 'scorecard'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  Scorecard & Critique ({evaluationReport.questionBreakdown?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setEvalTab('modelSolution')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    evalTab === 'modelSolution'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Model Answer Key
                </button>

                <button
                  type="button"
                  onClick={() => setEvalTab('grounding')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    evalTab === 'grounding'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Raw Grounding Extracts
                </button>
              </div>

              {/* TAB 1: SCORECARD & CRITIQUE */}
              {evalTab === 'scorecard' && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      Question-by-Question Analysis ({evaluationReport.questionBreakdown?.length || 0} Questions Evaluated)
                    </h4>

                    <div className="space-y-3">
                      {evaluationReport.questionBreakdown?.map((q: any, i: number) => (
                        <div
                          key={i}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 hover:border-purple-300 transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <span className="font-extrabold text-slate-900">{q.questionNumber}: {q.prompt}</span>
                            <span
                              className={`font-mono font-bold px-2.5 py-0.5 rounded-md text-[11px] self-start sm:self-auto ${
                                q.status === 'Full Marks'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : q.status === 'Partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {q.marksAwarded} / {q.maxMarks} Marks ({q.status})
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed">{q.feedback}</p>

                          {/* Student excerpt quotation */}
                          {q.studentEvidenceSnippet && (
                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Student Submission Excerpt Evaluated:
                              </span>
                              <p className="italic font-mono text-[11px] text-slate-800 bg-slate-50 p-2 rounded-lg line-clamp-3">
                                &ldquo;{q.studentEvidenceSnippet}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Rubric criteria */}
                          {q.evaluationRubricCriteria?.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Rubric Criteria Applied:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {q.evaluationRubricCriteria.map((c: string, idx: number) => (
                                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                      <span className="font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Key Strengths Identified
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                        {evaluationReport.strengths?.map((s: string, idx: number) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Areas for Improvement
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                        {evaluationReport.areasForImprovement?.map((a: string, idx: number) => (
                          <li key={idx}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Draft Remarks Preview */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Draft Instructor Remarks:
                    </label>
                    <div className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 leading-relaxed">
                      {evaluationReport.instructorFeedbackDraft}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MODEL ANSWER KEY (CANONICAL SOLUTIONS) */}
              {evalTab === 'modelSolution' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center gap-2 text-purple-950 font-bold">
                      <Sparkles className="w-4 h-4 text-purple-700" />
                      <h4>Canonical Solution Discovery & Benchmark Answer Key</h4>
                    </div>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      {evaluationReport.canonicalAnswerKeySummary || 'Canonical solution benchmarks and point rubrics discovered for this assignment.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {evaluationReport.questionBreakdown?.map((q: any, idx: number) => (
                      <div key={idx} className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-extrabold text-purple-300">
                            {q.questionNumber}: {q.prompt}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/30">
                            Weight: {q.maxMarks} Marks
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Canonical Reference Solution:
                          </span>
                          <pre className="p-3.5 bg-slate-950 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 leading-relaxed">
                            {q.modelSolutionSnippet || '// Canonical reference implementation'}
                          </pre>
                        </div>

                        {q.evaluationRubricCriteria?.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Marking Scheme & Rubric Weights:
                            </span>
                            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                              {q.evaluationRubricCriteria.map((c: string, rIdx: number) => (
                                <li key={rIdx}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: RAW GROUNDING EXTRACTS */}
              {evalTab === 'grounding' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <strong className="text-slate-900 font-extrabold block text-xs border-b border-slate-200 pb-1">
                        Question Paper Full Extracted Text:
                      </strong>
                      <div className="max-h-60 overflow-y-auto text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                        {evaluationReport.questionPaperSample}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <strong className="text-slate-900 font-extrabold block text-xs border-b border-slate-200 pb-1">
                        Student Submission Full Extracted Text:
                      </strong>
                      <div className="max-h-60 overflow-y-auto text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                        {evaluationReport.solutionSample}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEvaluationReport(null);
                    setEvaluatingSub(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close Without Applying
                </button>

                <button
                  type="button"
                  onClick={handleApplyEvaluatedGrade}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-900/20 flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  Apply Evaluated Score ({evaluationReport.overallScore}/{assignment.totalMarks}) & Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DETAILED MANUAL GRADING & INTEGRITY MODAL DRAWER --- */}
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
                            <button
                              type="button"
                              onClick={() => handleDownloadStudentFile(file)}
                              className="w-full text-center text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 border border-purple-200"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download & View Solution
                            </button>
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
                    <span className="text-[11px] text-purple-800 font-medium">
                      {selectedSubmission.score !== undefined
                        ? `Current Grade: ${selectedSubmission.score} / ${assignment.totalMarks}`
                        : 'Status: Pending Manual Instructor Evaluation'}
                    </span>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={assignment.totalMarks}
                    value={gradingScore}
                    placeholder="Marks"
                    onChange={(e) => setGradingScore(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-28 text-base font-extrabold text-center px-3 py-2 rounded-xl bg-white border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-700"
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
        {/* --- SEQUENTIAL GRADING THEATER WITH TELEMETRY CONSOLE --- */}
        {workspaceOpen && (
          <TeacherGradingWorkspace
            assignment={assignment}
            submissions={filteredSubmissions}
            initialStudentIndex={workspaceStartIndex}
            onClose={() => setWorkspaceOpen(false)}
            onUpdated={() => setDataVersion((v) => v + 1)}
          />
        )}
      </div>
    </div>
  );
};
