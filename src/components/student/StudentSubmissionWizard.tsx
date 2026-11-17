'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataStore } from '@/lib/storage';
import { generateIntegrityReport } from '@/lib/integrityEngine';
import { Assignment, Submission, UploadedFile, SubmissionTelemetry } from '@/types';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Code2,
  Image as ImageIcon,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Copy,
  Trash2,
  Flame,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentSubmissionWizardProps {
  assignment: Assignment;
  onClose: () => void;
}

export const StudentSubmissionWizard: React.FC<StudentSubmissionWizardProps> = ({
  assignment,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Existing submission check (for editing/resubmitting)
  const existingSub = dataStore
    .getSubmissions()
    .find((s) => s.assignmentId === assignment.id && s.studentId === currentUser?.id);

  // Form states
  const [textSolution, setTextSolution] = useState(existingSub?.textSubmission || '');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingSub?.files || []);
  const [inputMode, setInputMode] = useState<'text' | 'files'>('text');
  const [isOptimizing, setIsOptimizing] = useState(false);

  // --- Real-Time Telemetry Tracking ---
  const [telemetry, setTelemetry] = useState<SubmissionTelemetry>(
    existingSub?.integrityReport?.telemetry || {
      typedCharacterCount: 0,
      pasteEventCount: 0,
      totalPastedCharacters: 0,
      typingDurationSeconds: 0,
      estimatedWPM: 0,
      suspiciousBurstDetected: false,
      timelineLogs: ['Session started in LMS editor'],
    }
  );

  const activeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingStartTimeRef = useRef<number>(Date.now());

  // Track active time spent typing
  useEffect(() => {
    activeTimerRef.current = setInterval(() => {
      setTelemetry((prev) => {
        const duration = Math.max(1, Math.round((Date.now() - typingStartTimeRef.current) / 1000));
        const words = prev.typedCharacterCount / 5;
        const wpm = Math.round((words / (duration / 60)) || 0);
        return {
          ...prev,
          typingDurationSeconds: duration,
          estimatedWPM: wpm,
        };
      });
    }, 1000);

    return () => {
      if (activeTimerRef.current) clearInterval(activeTimerRef.current);
    };
  }, []);

  // Text change handler (tracks organic typing)
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const diff = val.length - textSolution.length;
    setTextSolution(val);

    if (diff > 0 && diff < 15) {
      // Normal human keystrokes
      setTelemetry((prev) => ({
        ...prev,
        typedCharacterCount: prev.typedCharacterCount + diff,
      }));
    }
  };

  // Intercept paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const pastedLength = pastedText.length;

    setTelemetry((prev) => {
      const isBurst = pastedLength > 150;
      const newLogs = [...prev.timelineLogs];

      if (isBurst) {
        newLogs.push(
          `SUSPICIOUS: ${pastedLength} characters pasted in bulk from clipboard at ${new Date().toLocaleTimeString()}`
        );
      } else {
        newLogs.push(`Pasted ${pastedLength} characters at ${new Date().toLocaleTimeString()}`);
      }

      return {
        ...prev,
        pasteEventCount: prev.pasteEventCount + 1,
        totalPastedCharacters: prev.totalPastedCharacters + pastedLength,
        suspiciousBurstDetected: prev.suspiciousBurstDetected || isBurst,
        timelineLogs: newLogs,
      };
    });
  };

  // Smart Ultra-HD Optimizer for Student Submissions
  // - Images under 1 MB are kept 100% untouched with zero quality loss.
  // - Large camera photos (5-15 MB) are scaled to 2K Ultra-HD (max 2048px) at ~88% quality,
  //   producing ~800 KB - 1.1 MB files with crystal-clear handwriting readability.
  // - Non-image files (PDFs, ZIPs, code) are kept as original.
  const optimizeFileForSubmission = async (file: File): Promise<UploadedFile> => {
    // Non-images or images already <= 1 MB (1024 * 1024 bytes) remain 100% original
    if (!file.type.startsWith('image/') || file.size <= 1024 * 1024) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
          });
        };
        reader.onerror = () => {
          resolve({ name: file.name, size: file.size, type: file.type });
        };
        reader.readAsDataURL(file);
      });
    }

    // Heavy camera photos: gentle Ultra-HD 2K optimization
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!rawDataUrl) {
          resolve({ name: file.name, size: file.size, type: file.type });
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 2048;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve({ name: file.name, size: file.size, type: file.type, dataUrl: rawDataUrl });
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // 0.88 quality JPEG produces razor-sharp handwriting text around 800 KB - 1.1 MB
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
            const approxBytes = Math.round((optimizedDataUrl.length * 3) / 4);

            resolve({
              name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
              size: approxBytes,
              type: 'image/jpeg',
              dataUrl: optimizedDataUrl,
            });
          } catch {
            resolve({ name: file.name, size: file.size, type: file.type, dataUrl: rawDataUrl });
          }
        };
        img.onerror = () => {
          resolve({ name: file.name, size: file.size, type: file.type, dataUrl: rawDataUrl });
        };
        img.src = rawDataUrl;
      };
      reader.onerror = () => {
        resolve({ name: file.name, size: file.size, type: file.type });
      };
      reader.readAsDataURL(file);
    });
  };

  // File Upload Handler (with Ultra-HD ~1 MB Optimizer)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const rawFiles = Array.from(files);

    // Initial individual raw file check (allows up to 25 MB camera photos before optimization)
    for (const file of rawFiles) {
      if (file.size > 25 * 1024 * 1024) {
        setSubmissionError(`File "${file.name}" exceeds the 25 MB maximum upload limit.`);
        showError('File Too Large', `File "${file.name}" exceeds 25 MB.`);
        return;
      }
    }

    setIsOptimizing(true);
    setSubmissionError(null);

    try {
      const processed = await Promise.all(rawFiles.map((f) => optimizeFileForSubmission(f)));
      const currentTotal = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
      const newTotal = processed.reduce((acc, f) => acc + f.size, 0);

      // Max total bundle size: 25 MB
      if (currentTotal + newTotal > 25 * 1024 * 1024) {
        setSubmissionError('Total upload bundle exceeds the 25 MB limit. Please remove some files or submit fewer pages.');
        showWarning('Size Limit Exceeded', 'Total upload bundle exceeds 25 MB limit.');
        setIsOptimizing(false);
        return;
      }

      setUploadedFiles((prev) => [...prev, ...processed]);
      setSubmissionError(null);
      showSuccess(
        'Files Added',
        `${processed.length} file(s) attached in Ultra-HD clarity (~1 MB standard).`
      );
    } catch {
      setSubmissionError('An error occurred while processing your files. Please try again.');
      showError('Upload Error', 'Could not process selected files.');
    } finally {
      setIsOptimizing(false);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Assignment Handler
  const handleSubmit = () => {
    if (!textSolution.trim() && uploadedFiles.length === 0) {
      setSubmissionError('Please enter your code/text solution or upload solution files/handwritten images before submitting.');
      showWarning('Incomplete Submission', 'Please provide your solution before submitting.');
      return;
    }

    if (!currentUser) return;

    // Run 3-Layer Integrity Engine
    const existingSubmissions = dataStore.getSubmissions().filter((s) => s.assignmentId === assignment.id);
    const integrityReport = generateIntegrityReport(
      textSolution,
      existingSubmissions,
      telemetry,
      currentUser.id
    );

    // Compute automatic test cases passed if provided
    let testCasesPassed = 0;
    const totalTestCases = assignment.testCases?.length || 0;
    if (totalTestCases > 0 && textSolution) {
      // Mock runner: passes if non-empty and has reasonable length
      testCasesPassed = textSolution.length > 50 ? totalTestCases : Math.floor(totalTestCases / 2);
    }

    const newSubmission: Submission = {
      id: existingSub?.id || `sub-${Date.now()}`,
      assignmentId: assignment.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentRollNumber: currentUser.rollNumber || 1,
      studentSemester: currentUser.semester || 1,
      studentSection: currentUser.section || 'A1',
      textSubmission: textSolution,
      files: uploadedFiles,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      testCasesPassed: totalTestCases > 0 ? testCasesPassed : undefined,
      testCasesTotal: totalTestCases > 0 ? totalTestCases : undefined,
      aiSuggestedScore: Math.round(assignment.totalMarks * (integrityReport.peerPlagiarismScore > 50 ? 0.4 : 0.9)),
      integrityReport: integrityReport,
    };

    dataStore.upsertSubmission(newSubmission);

    // Confetti celebration
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // fallback
    }

    showSuccess(
      'Assignment Submitted',
      'Your work has been saved successfully! You can resubmit anytime before midnight.'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header & Stepper */}
        <div className="p-6 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                Step {step} of 3 • {assignment.subjectCode}
              </span>
              <h2 className="text-base font-extrabold truncate max-w-xl">{assignment.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>

          {/* Stepper Dots */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-purple-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Professional Inline Validation Alert Label */}
          {submissionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{submissionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionError(null)}
                className="text-rose-400 hover:text-rose-700 font-bold p-1"
                title="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}
          {/* --- STEP 1: Assignment Brief & Starter File --- */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-purple-700 uppercase">
                  Problem Description & Instructions
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {assignment.description}
                </p>
                <div className="flex items-center gap-4 text-xs font-semibold text-purple-900 pt-2 border-t border-purple-200/60">
                  <span>Total Marks: {assignment.totalMarks}</span>
                  <span>Deadline: {assignment.deadlineDate} (11:59:59 PM)</span>
                </div>
              </div>

              {/* Starter File Download / Preview if available */}
              {assignment.resourceFileContent && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-purple-600" />
                      Starter Template ({assignment.resourceFileName})
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(assignment.resourceFileContent || '');
                        showInfo('Copied to Clipboard', 'Starter code template copied.');
                      }}
                      className="text-purple-700 hover:underline font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Template
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl max-h-48 overflow-x-auto border border-slate-800">
                    {assignment.resourceFileContent}
                  </pre>
                </div>
              )}

              {/* Grading Criteria */}
              {assignment.aiRubric && assignment.aiRubric.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Evaluation Rubric:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assignment.aiRubric.map((rub) => (
                      <div key={rub.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex justify-between font-bold text-slate-800 mb-0.5">
                          <span>{rub.title}</span>
                          <span className="text-purple-700">{rub.weight}%</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{rub.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- STEP 2: Solution Input & Real-Time Telemetry --- */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Telemetry Live Indicator Bar */}
              <div className="bg-slate-900 text-slate-200 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-300">Live Input Telemetry:</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span>Typed: <strong className="text-emerald-400">{telemetry.typedCharacterCount} chars</strong></span>
                  <span>Pastes: <strong className={telemetry.pasteEventCount > 2 ? 'text-amber-400' : 'text-slate-300'}>{telemetry.pasteEventCount}</strong></span>
                  <span>Active: <strong className="text-purple-300">{telemetry.typingDurationSeconds}s</strong></span>
                  <span>WPM: <strong className="text-slate-300">{telemetry.estimatedWPM}</strong></span>
                </div>
                {telemetry.suspiciousBurstDetected && (
                  <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Burst Paste Logged
                  </span>
                )}
              </div>

              {/* Mode Switcher: Code/Text vs File/Image Upload */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    inputMode === 'text'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  Direct Code / Text Solution
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('files')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    inputMode === 'files'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Upload Images / Files ({uploadedFiles.length})
                </button>
              </div>

              {/* Text / Code Editor */}
              {inputMode === 'text' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Write or compose your solution below:</span>
                    <span>{textSolution.length} characters</span>
                  </div>
                  <textarea
                    rows={12}
                    placeholder="// Write your code or text solution here...
#include <iostream>
using namespace std;

int main() {
    // Your implementation
    return 0;
}"
                    value={textSolution}
                    onChange={handleTextChange}
                    onPaste={handlePaste}
                    className="w-full font-mono text-xs p-4 rounded-2xl bg-slate-950 text-emerald-400 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-y"
                  />
                  <p className="text-[11px] text-slate-400 italic">
                    Tip: System monitors organic typing cadence vs sudden copy-paste bursts to maintain integrity.
                  </p>
                </div>
              )}

              {/* File & Handwritten Photo Uploads */}
              {inputMode === 'files' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-2xl p-6 text-center hover:bg-purple-50 transition cursor-pointer relative">
                    <input
                      type="file"
                      multiple
                      disabled={isOptimizing}
                      accept="image/*,.pdf,.cpp,.c,.py,.java,.zip,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                    />
                    {isOptimizing ? (
                      <div className="flex flex-col items-center justify-center py-2">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
                        <p className="text-xs font-bold text-purple-900">
                          Optimizing photos to Ultra-HD (~1 MB standard)...
                        </p>
                        <p className="text-[11px] text-purple-600 mt-1">
                          Preserving 100% handwriting clarity for faculty evaluation
                        </p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-800">
                          Click or drag photos of handwritten work, code files, or PDFs
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Ultra-HD ~1 MB Smart Optimizer enabled • Files ≤ 1 MB kept untouched • Up to 25 MB bundle
                        </p>
                      </>
                    )}
                  </div>

                  {/* Uploaded Files Grid */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700">Attached Files:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {uploadedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {file.type.startsWith('image/') ? (
                                <ImageIcon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              )}
                              <span className="font-semibold text-slate-800 truncate">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({file.size >= 1024 * 1024
                                  ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                                  : `${Math.round(file.size / 1024)} KB`})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --- STEP 3: Review & Final Submission --- */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Ready to Submit
                </div>
                <p>
                  You are submitting as <strong>{currentUser?.name}</strong> (Roll #{currentUser?.rollNumber}, Section{' '}
                  {currentUser?.section}).
                </p>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Direct Solution</span>
                  <strong className="text-slate-800">
                    {textSolution.length > 0 ? `${textSolution.length} characters entered` : 'None (Files only)'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Attached Files</span>
                  <strong className="text-slate-800">{uploadedFiles.length} file(s) attached</strong>
                </div>
              </div>

              {/* Telemetry Summary */}
              <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-purple-300 font-bold">
                  <span>Integrity & Telemetry Status:</span>
                  <span>Audit Logged</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  • Active Typing Time: {telemetry.typingDurationSeconds} seconds<br />
                  • Total Pastes: {telemetry.pasteEventCount} events ({telemetry.totalPastedCharacters} chars)<br />
                  • Estimated Cadence: {telemetry.estimatedWPM} WPM
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-900 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>
                  Reminder: The portal will automatically lock at <strong>11:59:59 PM (Midnight)</strong>. You can resubmit anytime before this deadline.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((prev) => (prev - 1) as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              step === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 2 && !textSolution.trim() && uploadedFiles.length === 0) {
                  setSubmissionError('Please enter your solution or upload a file before continuing to the review step.');
                  return;
                }
                setSubmissionError(null);
                setStep((prev) => (prev + 1) as any);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-900/20"
            >
              Continue to Step {step + 1}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm & Submit Assignment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
