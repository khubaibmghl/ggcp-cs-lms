'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Assignment, Submission, UploadedFile } from '@/types';
import { useToast } from '@/context/ToastContext';
import { dataStore } from '@/lib/storage';
import { computePeerPlagiarism, PlagiarismScanResult, tokenizeCode } from '@/lib/plagiarismEngine';
import { getFileBlob, resolveFileUrl, downloadUploadedFile } from '@/lib/fileStorage';
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
  const { showSuccess, showWarning, showError } = useToast();

  // Navigation State
  const [currentIndex, setCurrentIndex] = useState(initialStudentIndex);
  const [showConsole, setShowConsole] = useState(true);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);
  const [docViewTab, setDocViewTab] = useState<'preview' | 'extracted'>('preview');

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

  const activeFile = activeSub?.files?.[0];
  const [resolvedLocalUri, setResolvedLocalUri] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (activeFile?.dataUrl || activeFile?.url) {
      setResolvedLocalUri(activeFile.dataUrl || activeFile.url || '');
    } else if (activeFile?.fileKey) {
      getFileBlob(activeFile.fileKey).then((blob) => {
        if (isMounted) setResolvedLocalUri(blob || '');
      });
    } else {
      setResolvedLocalUri('');
    }
    return () => {
      isMounted = false;
    };
  }, [activeFile]);

  const activeFileNameLower = activeFile?.name?.toLowerCase() || '';
  const activeFileUri = activeFile?.dataUrl || activeFile?.url || resolvedLocalUri || '';
  const isPdf =
    activeFileNameLower.endsWith('.pdf') ||
    activeFileUri.startsWith('data:application/pdf') ||
    activeFileUri.includes('/raw/upload/') ||
    false;
  const isImage =
    activeFileNameLower.endsWith('.png') ||
    activeFileNameLower.endsWith('.jpg') ||
    activeFileNameLower.endsWith('.jpeg') ||
    activeFileNameLower.endsWith('.webp') ||
    activeFileUri.startsWith('data:image/') ||
    activeEntry?.documentKind === 'handwritten_scan' ||
    false;

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

  // Keyboard navigation shortcuts (Alt+ArrowLeft/Right to navigate, Ctrl+Enter to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSaveAndAdvance();
        return;
      }

      if (!isInput) {
        if (e.altKey && e.key === 'ArrowLeft') {
          e.preventDefault();
          if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
        } else if (e.altKey && e.key === 'ArrowRight') {
          e.preventDefault();
          if (currentIndex < submissions.length - 1) setCurrentIndex((prev) => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentScore, currentFeedback, activeSub]);

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

      // 1. EXTRACT TEXT & CODE TOKENS FOR ALL STUDENTS (CHUNKED ASYNC SLICES)
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

          // Use pre-extracted text if available (0ms load)
          if (!text && file.extractedText) {
            text = file.extractedText;
            addLog(`  ↳ Using cached text (${text.length} chars) from "${file.name}".`, 'info');
          } else if (!text) {
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
                  file.extractedText = text;
                  addLog(`  ↳ Extracted ${data.length} characters from "${file.name}".`, 'success');
                }
              }
            } catch (err) {
              addLog(`  ⚠️ Text extraction warning for Roll #${sub.studentRollNumber}: ${err}`, 'warn');
            }
          }
        }

        const tokens = text ? tokenizeCode(text) : [];
        const hasCachedEval = !!sub.integrityReport?.evaluationReport;
        const hasCachedPlag = !!sub.integrityReport?.plagiarismScanResult;

        tempMap.set(sub.id, {
          sub,
          text,
          codeTokens: tokens,
          documentKind: isScan ? 'handwritten_scan' : 'computerized',
          isExtracted: true,
          isEvaluated: hasCachedEval,
          correctionReport: sub.integrityReport?.evaluationReport,
          plagiarismReport: sub.integrityReport?.plagiarismScanResult,
        });

        setIndexingProgress(Math.round(((i + 1) / (submissions.length * 2)) * 100));

        // Yield execution every 3 students to keep browser animations and progress smooth at 60 FPS
        if (i % 3 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      addLog(`✅ All ${submissions.length} student documents ingested into memory map.`, 'success');

      // 2. RUN COMBINATORIAL TRIANGULAR CROSS-CHECK (N*(N-1)/2 comparisons in non-blocking slices)
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

        // If not already cached, run pairwise MOSS comparison
        if (!entry.plagiarismReport) {
          const otherPeers = peerList.filter((p) => p.rollNumber !== sub.studentRollNumber);
          const scanResult = computePeerPlagiarism(entry.text, otherPeers, questionPrompt);
          entry.plagiarismReport = scanResult;

          if (sub.integrityReport) {
            sub.integrityReport.peerPlagiarismScore = scanResult.peerPlagiarismScore;
            sub.integrityReport.matchedWithRollNumber = scanResult.matchedWithRollNumber;
            sub.integrityReport.matchedStudentName = scanResult.matchedWithName;
            sub.integrityReport.plagiarismScanResult = scanResult;
          }
        }

        const scanResult = entry.plagiarismReport;
        if (scanResult && scanResult.riskLevel === 'critical') {
          addLog(`  ⚠️ Collusion Alert: Roll #${sub.studentRollNumber} (${sub.studentName}) matches Roll #${scanResult.matchedWithRollNumber} with ${scanResult.peerPlagiarismScore}% MOSS similarity!`, 'warn');
        } else if (scanResult && scanResult.riskLevel === 'moderate') {
          addLog(`  ℹ️ Moderate overlap: Roll #${sub.studentRollNumber} matches Roll #${scanResult.matchedWithRollNumber} (${scanResult.peerPlagiarismScore}%).`, 'info');
        }

        setIndexingProgress(50 + Math.round(((i + 1) / (submissions.length * 2)) * 50));

        // Yield to browser event loop every 4 students to prevent thread locking
        if (i % 4 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
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

  // Evaluate a student using the 2-stage authentic engine (WITH PERSISTENT RESULT CACHING)
  const evaluateStudentInMap = async (subId: string, mapToUse?: Map<string, CachedStudentEntry>) => {
    const map = mapToUse || classroomMap;
    const entry = map.get(subId);
    if (!entry) return;

    // 1. Check if already evaluated in this session or cached in submission integrity report
    if (entry.isEvaluated && entry.correctionReport) {
      return;
    }

    if (entry.sub.integrityReport?.evaluationReport) {
      entry.correctionReport = entry.sub.integrityReport.evaluationReport;
      entry.isEvaluated = true;
      setClassroomMap(new Map(map));
      addLog(`⚡ Loaded cached evaluation for Roll #${entry.sub.studentRollNumber}: ${entry.correctionReport.overallScore}/${assignment.totalMarks} Marks (${entry.correctionReport.status}). Zero API latency.`, 'info');

      if (activeSub?.id === subId && (activeSub.score === undefined || activeSub.score === null)) {
        setCurrentScore(entry.correctionReport.overallScore);
        setCurrentFeedback(entry.correctionReport.instructorFeedbackDraft || '');
      }
      return;
    }

    addLog(`🤖 Evaluating student Roll #${entry.sub.studentRollNumber} against Canonical Answer Key...`, 'process');

    try {
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('ggcp_gemini_api_key') || undefined : undefined;

      let questionData = assignment.resourceFileContent;
      if (!questionData && assignment.resourceFileKey) {
        questionData = (await getFileBlob(assignment.resourceFileKey)) || '';
      }
      const questionFilePayload = questionData
        ? { name: assignment.resourceFileName || 'Question_Paper.pdf', dataUrl: questionData }
        : null;

      let solutionData = entry.sub.files?.[0]?.dataUrl;
      if (!solutionData && entry.sub.files?.[0]?.fileKey) {
        solutionData = (await getFileBlob(entry.sub.files[0].fileKey)) || '';
      }
      const solutionFilePayload = entry.sub.files?.[0]
        ? { name: entry.sub.files[0].name, dataUrl: solutionData, url: entry.sub.files[0].url }
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

          // Cache on submission object for instant zero-token future reloads
          if (entry.sub.integrityReport) {
            entry.sub.integrityReport.evaluationReport = data.evaluation;
          }
          dataStore.upsertSubmission(entry.sub);
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
      showWarning(
        'Invalid Score',
        `Please enter a valid score between 0 and ${assignment.totalMarks}.`
      );
      setIsApplying(false);
      return;
    }

    const updated: Submission = {
      ...activeSub,
      status: 'graded',
      score: scoreNum,
      teacherFeedback: currentFeedback.trim(),
      integrityReport: {
        ...activeSub.integrityReport,
        evaluationReport: activeEntry?.correctionReport || activeSub.integrityReport?.evaluationReport,
        plagiarismScanResult: activeEntry?.plagiarismReport || activeSub.integrityReport?.plagiarismScanResult,
        peerPlagiarismScore: activeEntry?.plagiarismReport?.peerPlagiarismScore ?? activeSub.integrityReport?.peerPlagiarismScore ?? 0,
        matchedWithRollNumber: activeEntry?.plagiarismReport?.matchedWithRollNumber ?? activeSub.integrityReport?.matchedWithRollNumber,
        matchedStudentName: activeEntry?.plagiarismReport?.matchedWithName ?? activeSub.integrityReport?.matchedStudentName,
      },
    };

    dataStore.upsertSubmission(updated);
    addLog(`💾 Saved Grade for Roll #${activeSub.studentRollNumber}: ${scoreNum}/${assignment.totalMarks} Marks.`, 'success');
    showSuccess(
      'Grade Recorded',
      `Saved ${scoreNum}/${assignment.totalMarks} marks for Roll #${activeSub.studentRollNumber} (${activeSub.studentName}).`
    );
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
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span className="font-bold text-white truncate max-w-[160px] sm:max-w-xs">
                {activeSub?.files?.[0]?.name || 'Student Submission Text'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] uppercase font-mono flex-shrink-0">
                {activeEntry?.documentKind === 'handwritten_scan' ? 'Handwritten Scan' : 'Computerized'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Document View Switcher Pills */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDocViewTab('preview')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    docViewTab === 'preview'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Document View
                </button>
                <button
                  type="button"
                  onClick={() => setDocViewTab('extracted')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    docViewTab === 'extracted'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Extracted Code
                </button>
              </div>

              {activeFile && (
                <button
                  type="button"
                  onClick={() => downloadUploadedFile(activeFile, `${activeSub?.studentName || 'Student'}_Solution.pdf`)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-bold transition shadow-xs cursor-pointer"
                  title="Download student solution file"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}

              {activeFileUri && (
                <button
                  type="button"
                  onClick={() => {
                    const win = window.open();
                    if (win) {
                      if (activeFileUri.startsWith('data:application/pdf')) {
                        win.document.write(
                          `<!DOCTYPE html><html><head><title>${activeSub?.files?.[0]?.name || 'Student Submission'}</title><style>body,html{margin:0;padding:0;height:100%;overflow:hidden;}</style></head><body><iframe src="${activeFileUri}" style="border:0;width:100%;height:100%;"></iframe></body></html>`
                        );
                      } else {
                        win.location.href = activeFileUri;
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-bold transition"
                  title="Open document in new window"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Pop Out</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {docViewTab === 'preview' ? (
              activeFileUri ? (
                isPdf ? (
                  <div className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md">
                    <iframe
                      src={activeFileUri}
                      className="w-full h-full border-0 bg-white"
                      title="Student Submitted PDF"
                    />
                  </div>
                ) : isImage ? (
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>High-resolution scan and handwritten preview:</span>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg p-2">
                      <img
                        src={activeFileUri}
                        alt="Student Submission"
                        className="w-full h-auto object-contain max-h-[72vh] rounded-xl"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-300 space-y-3">
                    <FileText className="w-10 h-10 text-blue-400 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-white">Word Document ({activeFile?.name})</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                        Word documents cannot be previewed natively in the browser frame. Click &ldquo;Extracted Code&rdquo; above to read the recognized text, or download the original Word document.
                      </p>
                    </div>
                    {activeFile && (
                      <button
                        type="button"
                        onClick={() => downloadUploadedFile(activeFile, `${activeSub?.studentName || 'Student'}_Solution.docx`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm cursor-pointer mx-auto"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Word Document</span>
                      </button>
                    )}
                  </div>
                )
              ) : (
                <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No solution document file attached. Reviewing text submission.
                </div>
              )
            ) : (
              /* Extracted Code & Prose View */
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
            )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      Award Marks (Max: {assignment.totalMarks}):
                    </label>
                    {corrReport?.overallScore !== undefined && (
                      <button
                        type="button"
                        onClick={() => setCurrentScore(corrReport.overallScore)}
                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300"
                        title="Fill AI suggested score"
                      >
                        Use AI ({corrReport.overallScore})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={assignment.totalMarks}
                    value={currentScore}
                    onChange={(e) => setCurrentScore(e.target.value)}
                    className="w-full text-base font-black px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                    placeholder="0"
                  />
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentScore(assignment.totalMarks)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 transition"
                      title="Award full marks"
                    >
                      Max ({assignment.totalMarks})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentScore(Math.round(assignment.totalMarks * 0.75))}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 transition"
                      title="Award 75% marks"
                    >
                      75% ({Math.round(assignment.totalMarks * 0.75)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentScore(Math.round(assignment.totalMarks * 0.5))}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 transition"
                      title="Award 50% passing marks"
                    >
                      50% ({Math.round(assignment.totalMarks * 0.5)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentScore(0)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-[10px] font-bold text-rose-300 transition"
                      title="Award zero marks"
                    >
                      0
                    </button>
                  </div>
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

              <div>
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
                <span className="text-[10px] text-slate-500 font-mono text-center block mt-1.5">
                  Pro-tip: Press <kbd className="bg-slate-800 px-1 rounded text-slate-300">Ctrl+Enter</kbd> to save &amp; advance • <kbd className="bg-slate-800 px-1 rounded text-slate-300">Alt+←/→</kbd> to navigate
                </span>
              </div>
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
