'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Assignment, Submission, UploadedFile } from '@/types';
import { dataStore } from '@/lib/storage';
import { computePeerPlagiarism, PlagiarismScanResult, tokenizeCode } from '@/lib/plagiarismEngine';
import {
  ChevronLeft,
  ChevronRight,
  Terminal,
  FileText,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Award,
  Download,
  Eye,
  CheckCheck,
  Maximize2,
  Minimize2,
  X,
  Clock,
  BookOpen,
  Layers,
  HelpCircle,
  Activity,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface TeacherGradingWorkspaceProps {
  assignment: Assignment;
  submissions: Submission[];
  initialStudentIndex?: number;
  onClose: () => void;
  onUpdated: () => void;
}

interface TelemetryLog {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'process';
}

interface CachedStudentEntry {
  sub: Submission;
  text: string;
  codeTokens: string[];
  documentKind: 'computerized' | 'handwritten_scan';
  plagiarismReport?: PlagiarismScanResult;
  correctionReport?: any;
  isExtracted: boolean;
  isEvaluated: boolean;
}

export const TeacherGradingWorkspace: React.FC<TeacherGradingWorkspaceProps> = ({
  assignment,
  submissions,
  initialStudentIndex = 0,
  onClose,
  onUpdated,
}) => {
  // Navigation State
  const [currentIndex, setCurrentIndex] = useState(initialStudentIndex);
  const [showConsole, setShowConsole] = useState(true);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);

  // In-Memory Classroom Submission Map
  const [classroomMap, setClassroomMap] = useState<Map<string, CachedStudentEntry>>(new Map());
  const [isIndexingMap, setIsIndexingMap] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);

  // Active Student Grading Form State
  const [currentScore, setCurrentScore] = useState<number | string>('');
  const [currentFeedback, setCurrentFeedback] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Helper to add timestamped terminal logs
  const addLog = (message: string, level: TelemetryLog['level'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const log: TelemetryLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: time,
      message,
      level,
    };
    setTelemetryLogs((prev) => [...prev.slice(-150), log]);
  };

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [telemetryLogs]);

  const activeSub = submissions[currentIndex] || null;
  const activeEntry = activeSub ? classroomMap.get(activeSub.id) : null;

  // Sync grading input state when active student changes
  useEffect(() => {
    if (!activeSub) return;
    if (activeSub.score !== undefined && activeSub.score !== null) {
      setCurrentScore(activeSub.score);
      setCurrentFeedback(activeSub.teacherFeedback || '');
    } else if (activeEntry?.correctionReport) {
      setCurrentScore(activeEntry.correctionReport.overallScore);
      setCurrentFeedback(activeEntry.correctionReport.instructorFeedbackDraft || '');
    } else {
      setCurrentScore('');
      setCurrentFeedback('');
    }
  }, [currentIndex, activeSub, activeEntry?.correctionReport]);

  // =========================================================================
  // INITIALIZE CLASSROOM INGESTION MAP & TRIANGULAR PAIRWISE CROSS-CHECK MATRIX
  // =========================================================================
  useEffect(() => {
    let isCancelled = false;

    const buildClassroomMap = async () => {
      if (submissions.length === 0) return;
      setIsIndexingMap(true);
      setIndexingProgress(0);

      addLog(`⚡ Initializing Classroom Submission Map for [${assignment.subjectCode}] ${assignment.title}...`, 'process');
      addLog(`📋 Total Submissions to index: ${submissions.length} students.`, 'info');

      const tempMap = new Map<string, CachedStudentEntry>();

      // 1. EXTRACT TEXT & CODE TOKENS FOR ALL STUDENTS
      for (let i = 0; i < submissions.length; i++) {
        if (isCancelled) return;
        const sub = submissions[i];
        addLog(`📂 Ingesting [${i + 1}/${submissions.length}] Roll #${sub.studentRollNumber} (${sub.studentName})...`, 'info');

        let text = sub.textSubmission || '';
        const file = sub.files?.[0];

        let isScan = false;
        if (file) {
          const lowerName = file.name.toLowerCase();
          isScan = lowerName.includes('scan') || lowerName.includes('handwritten') || file.type?.startsWith('image/');

          if (!text) {
            try {
              const res = await fetch('/api/extract-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file }),
              });
              if (res.ok) {
                const data = await res.json();
                if (data.success && data.text) {
                  text = data.text;
                  addLog(`  ↳ Extracted ${data.length} characters from "${file.name}".`, 'success');
                }
              }
            } catch (err) {
              addLog(`  ⚠️ Text extraction warning for Roll #${sub.studentRollNumber}: ${err}`, 'warn');
            }
          }
        }

        const tokens = text ? tokenizeCode(text) : [];
        tempMap.set(sub.id, {
          sub,
          text,
          codeTokens: tokens,
          documentKind: isScan ? 'handwritten_scan' : 'computerized',
          isExtracted: true,
          isEvaluated: false,
        });

        setIndexingProgress(Math.round(((i + 1) / (submissions.length * 2)) * 100));
      }

      addLog(`✅ All ${submissions.length} student documents ingested into memory map.`, 'success');

      // 2. RUN COMBINATORIAL TRIANGULAR CROSS-CHECK (N*(N-1)/2 comparisons)
      const totalCombinations = (submissions.length * (submissions.length - 1)) / 2;
      addLog(`📐 Executing Triangular Cross-Check Matrix: N=${submissions.length}, Comparisons=${totalCombinations} pairs.`, 'process');

      const questionPrompt = assignment.description || assignment.title;
      const peerList = Array.from(tempMap.values()).map((e) => ({
        rollNumber: e.sub.studentRollNumber,
        name: e.sub.studentName,
        text: e.text,
      }));

      // For each student, compute plagiarism against class
      for (let i = 0; i < submissions.length; i++) {
        if (isCancelled) return;
        const sub = submissions[i];
        const entry = tempMap.get(sub.id);
        if (!entry) continue;

        const otherPeers = peerList.filter((p) => p.rollNumber !== sub.studentRollNumber);
        const scanResult = computePeerPlagiarism(entry.text, otherPeers, questionPrompt);
        entry.plagiarismReport = scanResult;

        if (scanResult.riskLevel === 'critical') {
          addLog(`  ⚠️ Collusion Alert: Roll #${sub.studentRollNumber} (${sub.studentName}) matches Roll #${scanResult.matchedWithRollNumber} with ${scanResult.peerPlagiarismScore}% MOSS similarity!`, 'warn');
        } else if (scanResult.riskLevel === 'moderate') {
          addLog(`  ℹ️ Moderate overlap: Roll #${sub.studentRollNumber} matches Roll #${scanResult.matchedWithRollNumber} (${scanResult.peerPlagiarismScore}%).`, 'info');
        }

        setIndexingProgress(50 + Math.round(((i + 1) / (submissions.length * 2)) * 50));
      }

      addLog(`🎯 Combinatorial cross-check matrix complete. 100% of students cross-verified.`, 'success');
      setClassroomMap(new Map(tempMap));
      setIsIndexingMap(false);
      setIndexingProgress(100);

      // Pre-evaluate the first student
      if (submissions[0]) {
        evaluateStudentInMap(submissions[0].id, tempMap);
      }
    };

    buildClassroomMap();

    return () => {
      isCancelled = true;
    };
  }, [assignment.id]);

  // Evaluate a student using the 2-stage authentic engine
  const evaluateStudentInMap = async (subId: string, mapToUse?: Map<string, CachedStudentEntry>) => {
    const map = mapToUse || classroomMap;
    const entry = map.get(subId);
    if (!entry || entry.isEvaluated) return;

    addLog(`🤖 Evaluating student Roll #${entry.sub.studentRollNumber} against Canonical Answer Key...`, 'process');

    try {
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('ggcp_gemini_api_key') || undefined : undefined;

      const questionFilePayload = assignment.resourceFileContent
        ? { name: assignment.resourceFileName || 'Question_Paper.pdf', dataUrl: assignment.resourceFileContent }
        : null;

      const solutionFilePayload = entry.sub.files?.[0]
        ? { name: entry.sub.files[0].name, dataUrl: entry.sub.files[0].dataUrl, url: entry.sub.files[0].url }
        : null;

      const res = await fetch('/api/evaluate-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionFile: questionFilePayload,
          solutionFile: solutionFilePayload,
          questionTextOverride: assignment.description,
          solutionTextOverride: entry.text,
          assignment: {
            title: assignment.title,
            subjectCode: assignment.subjectCode,
            subjectName: assignment.subjectName,
            totalMarks: assignment.totalMarks,
          },
          student: {
            name: entry.sub.studentName,
            rollNumber: entry.sub.studentRollNumber,
            section: entry.sub.studentSection,
          },
          apiKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.evaluation) {
          entry.correctionReport = data.evaluation;
          entry.isEvaluated = true;
          setClassroomMap(new Map(map));
          addLog(`  ↳ Evaluation Complete: Roll #${entry.sub.studentRollNumber} recommended ${data.evaluation.overallScore}/${assignment.totalMarks} Marks (${data.evaluation.status}).`, 'success');

          // If current student, populate form
          if (activeSub?.id === subId && (activeSub.score === undefined || activeSub.score === null)) {
            setCurrentScore(data.evaluation.overallScore);
            setCurrentFeedback(data.evaluation.instructorFeedbackDraft || '');
          }
        }
      }
    } catch (err) {
      addLog(`  ❌ Evaluation failed for Roll #${entry.sub.studentRollNumber}: ${err}`, 'error');
    }
  };

  // Evaluate on index change if not evaluated yet
  useEffect(() => {
    if (activeSub && classroomMap.has(activeSub.id)) {
      const entry = classroomMap.get(activeSub.id);
      if (entry && !entry.isEvaluated) {
        evaluateStudentInMap(activeSub.id);
      }
    }
  }, [currentIndex, classroomMap]);

  // Save current student grade and advance
  const handleSaveAndAdvance = async () => {
    if (!activeSub) return;
    setIsApplying(true);

    const scoreNum = Number(currentScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > assignment.totalMarks) {
      alert(`Please enter a valid score between 0 and ${assignment.totalMarks}.`);
      setIsApplying(false);
      return;
    }

    const updated: Submission = {
      ...activeSub,
      status: 'graded',
      score: scoreNum,
      teacherFeedback: currentFeedback.trim(),
    };

    dataStore.upsertSubmission(updated);
    addLog(`💾 Saved Grade for Roll #${activeSub.studentRollNumber}: ${scoreNum}/${assignment.totalMarks} Marks.`, 'success');
    setIsApplying(false);
    onUpdated();

    // Advance to next student
    if (currentIndex < submissions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      addLog(`🎉 Reached the end of the roster! All ${submissions.length} students processed.`, 'success');
    }
  };

  const plagReport = activeEntry?.plagiarismReport;
  const corrReport = activeEntry?.correctionReport;

  return (
    <div className="fixed inset-0 z-80 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in">
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE NAVIGATION STRIP                                         */}
      {/* ========================================================================= */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 text-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {assignment.subjectCode}
          </span>
          <div>
            <h2 className="text-sm font-extrabold truncate max-w-md">{assignment.title}</h2>
            <span className="text-[11px] text-slate-400">
              Semester {assignment.semester} • Max Marks: {assignment.totalMarks}
            </span>
          </div>
        </div>

        {/* Student Navigator */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="p-1.5 rounded-xl hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-white transition"
            title="Previous Student"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center px-3 min-w-[200px]">
            <span className="text-[10px] text-purple-400 uppercase font-mono font-bold block">
              Student {currentIndex + 1} of {submissions.length}
            </span>
            <span className="text-xs font-extrabold text-white">
              Roll #{activeSub?.studentRollNumber} — {activeSub?.studentName} (Sec {activeSub?.studentSection})
            </span>
          </div>

          <button
            type="button"
            disabled={currentIndex >= submissions.length - 1}
            onClick={() => setCurrentIndex((prev) => Math.min(submissions.length - 1, prev + 1))}
            className="p-1.5 rounded-xl hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-white transition"
            title="Next Student"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Console Toggle & Close Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConsole(!showConsole)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              showConsole
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telemetry Console</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold transition"
            title="Exit Workspace"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Indexing Progress Indicator (if background map is building) */}
      {isIndexingMap && (
        <div className="bg-purple-950/80 border-b border-purple-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span>Pre-indexing Classroom Submission Map & Cross-Check Matrix... ({indexingProgress}%)</span>
          </div>
          <span className="font-mono text-[11px] text-purple-300">0ms sequential latency enabled</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN SPLIT THEATER BODY (Left: Submission, Right: Intelligent Audit)   */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 bg-slate-900">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: STUDENT SUBMITTED DOCUMENT VIEWER                          */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex flex-col h-full overflow-hidden bg-slate-950">
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white">
                {activeSub?.files?.[0]?.name || 'Student Submission Text'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                {activeEntry?.documentKind === 'handwritten_scan' ? 'Handwritten Scan' : 'Computerized'}
              </span>
            </div>

            {activeSub?.files?.[0]?.url && (
              <a
                href={activeSub.files[0].url.replace('/image/upload/', '/image/upload/fl_attachment/')}
                download={activeSub.files[0].name}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-bold transition"
              >
                <Download className="w-3 h-3" />
                Download Original
              </a>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* If handwritten image file */}
            {activeSub?.files?.[0] && activeEntry?.documentKind === 'handwritten_scan' && (
              <div className="space-y-3">
                <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Handwritten Document Mode: High-resolution scan and OCR text view.</span>
                </div>
                {activeSub.files[0].url && (
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
                    <img
                      src={activeSub.files[0].url}
                      alt="Student Handwritten Submission"
                      className="w-full h-auto object-contain max-h-[70vh]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Extracted Code & Prose View */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Extracted Document Content & Source Code:
              </span>
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner max-h-[75vh] overflow-y-auto">
                {activeEntry?.text || activeSub?.textSubmission || (
                  <span className="text-slate-500 italic">No text extracted or document is empty.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: SYSTEM'S INTELLIGENT AUDIT & ONE-CLICK GRADING            */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex flex-col h-full overflow-hidden bg-slate-900">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* 1. MOSS PEER PLAGIARISM AUDIT CARD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  Peer Plagiarism & Collusion Audit
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Pre-computed from Classroom Map (N={submissions.length})
                </span>
              </div>

              {plagReport ? (
                <div
                  className={`p-4 rounded-2xl border ${
                    plagReport.riskLevel === 'critical'
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : plagReport.riskLevel === 'moderate'
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                      : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-lg bg-black/40 border border-white/10">
                        {plagReport.peerPlagiarismScore}%
                      </span>
                      <div>
                        <h4 className="text-xs font-black">
                          {plagReport.riskLevel === 'critical'
                            ? 'Critical Collusion Alert'
                            : plagReport.riskLevel === 'moderate'
                            ? 'Moderate Overlap Detected'
                            : 'Authentic & Original Work'}
                        </h4>
                        <p className="text-[11px] opacity-80 leading-snug mt-0.5">{plagReport.summary}</p>
                      </div>
                    </div>
                  </div>

                  {plagReport.matchedWithRollNumber && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] flex items-center justify-between">
                      <span>Highest Overlapping Peer:</span>
                      <strong className="font-mono">
                        Roll #{plagReport.matchedWithRollNumber} ({plagReport.matchedWithName})
                      </strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500 italic">
                  Calculating plagiarism shingle overlap...
                </div>
              )}
            </div>

            {/* 2. AUTOMATED QUESTION-AWARE EVALUATION SCORECARD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  System's Intelligent Correction
                </span>
                {corrReport && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Engine: {corrReport.aiEngineUsed}
                  </span>
                )}
              </div>

              {corrReport ? (
                <div className="space-y-3">
                  {/* Recommended Score Banner */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      corrReport.overallScore === 0
                        ? 'bg-rose-950/60 border-rose-500/50 text-white'
                        : 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border border-emerald-500/30 text-white'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                        {corrReport.overallScore === 0 ? '⚠️ Off-Topic / 0 Marks Detected' : 'Recommended Grade'}
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-black">{corrReport.overallScore}</span>
                        <span className="text-xs opacity-75">/ {assignment.totalMarks} Marks</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold ml-1">
                          {corrReport.percentage}% • {corrReport.status}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentScore(corrReport.overallScore);
                        setCurrentFeedback(corrReport.instructorFeedbackDraft);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs hover:bg-slate-100 transition shadow-xs flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Auto-Fill Form
                    </button>
                  </div>

                  {/* Question Breakdown */}
                  <div className="space-y-2">
                    {corrReport.questionBreakdown?.map((q: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{q.questionNumber}: {q.prompt}</span>
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                              q.status === 'Full Marks'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                                : q.status === 'Partial'
                                ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                                : 'bg-rose-950 text-rose-300 border border-rose-600/40'
                            }`}
                          >
                            {q.marksAwarded} / {q.maxMarks} ({q.status})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{q.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Canonical Model Solution and evaluating student answer...</span>
                </div>
              )}
            </div>

            {/* 3. TEACHER FINAL GRADE & FEEDBACK DRAWER */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/30 space-y-3">
              <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-400" />
                Instructor Grade Award & Next Action
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Award Marks (Max: {assignment.totalMarks}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={assignment.totalMarks}
                    value={currentScore}
                    onChange={(e) => setCurrentScore(e.target.value)}
                    className="w-full text-base font-black px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                    placeholder="0"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Student Feedback Remarks:
                  </label>
                  <textarea
                    rows={2}
                    value={currentFeedback}
                    onChange={(e) => setCurrentFeedback(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    placeholder="Add feedback for the student..."
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveAndAdvance}
                disabled={isApplying}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2"
              >
                {isApplying ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving Grade...
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>
                      {currentIndex < submissions.length - 1
                        ? `Save & Jump to Next Student (Roll #${submissions[currentIndex + 1]?.studentRollNumber}) →`
                        : 'Save Final Student Grade & Finish Session'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LIVE BACKGROUND TELEMETRY TERMINAL CONSOLE STRIP (Collapsible)         */}
      {/* ========================================================================= */}
      {showConsole && (
        <div
          className={`bg-slate-950 border-t border-slate-800 transition-all duration-300 flex flex-col flex-shrink-0 ${
            isConsoleMaximized ? 'h-72' : 'h-36'
          }`}
        >
          {/* Terminal Console Header */}
          <div className="px-4 py-1.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[11px] font-bold text-slate-200">
                GGCP LMS Background Telemetry Stream
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-mono">
                ({telemetryLogs.length} events logged)
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <button
                type="button"
                onClick={() => setIsConsoleMaximized(!isConsoleMaximized)}
                className="p-1 hover:text-white transition text-[11px]"
                title={isConsoleMaximized ? 'Restore console' : 'Maximize console'}
              >
                {isConsoleMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setTelemetryLogs([])}
                className="text-[10px] font-mono hover:text-white transition px-1.5 py-0.5 rounded bg-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowConsole(false)}
                className="p-1 hover:text-white transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Terminal Logs Stream */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1 bg-black/60 select-text">
            {telemetryLogs.length === 0 ? (
              <span className="text-slate-600 italic">Listening for background events...</span>
            ) : (
              telemetryLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                  <span
                    className={
                      log.level === 'success'
                        ? 'text-emerald-400'
                        : log.level === 'warn'
                        ? 'text-amber-400'
                        : log.level === 'error'
                        ? 'text-rose-400'
                        : log.level === 'process'
                        ? 'text-purple-300 font-bold'
                        : 'text-slate-300'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
