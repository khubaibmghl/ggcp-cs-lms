'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataStore } from '@/lib/storage';
import { generateIntegrityReport } from '@/lib/integrityEngine';
import { Assignment, Submission, UploadedFile, SubmissionTelemetry } from '@/types';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Image as ImageIcon,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Copy,
  Trash2,
  Flame,
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
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Existing submission check (for editing/resubmitting)
  const existingSub = dataStore
    .getSubmissions()
    .find((s) => s.assignmentId === assignment.id && s.studentId === currentUser?.id);

  // Form states
  const [textSolution, setTextSolution] = useState(existingSub?.textSubmission || '');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingSub?.files || []);
  const [inputMode, setInputMode] = useState<'text' | 'files'>('text');

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

  // File Upload Handler (Images, PDFs, Source code up to 10 MB)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    let totalSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 10 MB size limit.`);
        return;
      }
      totalSize += file.size;
      if (totalSize > 10 * 1024 * 1024) {
        alert('Total uploaded size exceeds 10 MB limit.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        });
        if (newFiles.length === files.length) {
          setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Assignment Handler
  const handleSubmit = () => {
    if (!textSolution.trim() && uploadedFiles.length === 0) {
      alert('Please enter your code/text solution or upload solution files/handwritten images.');
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

    alert('Assignment successfully submitted! You can resubmit anytime before midnight.');
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
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
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
                        alert('Starter template copied to clipboard!');
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
                      accept="image/*,.pdf,.cpp,.c,.py,.java,.zip,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      Click or drag photos of handwritten work, code files, or PDFs
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Max file size: 10 MB bundle (Supports JPG, PNG, PDF, ZIP, CPP, PY)
                    </p>
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
                              <span className="text-[10px] text-slate-400">
                                ({Math.round(file.size / 1024)} KB)
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
                  alert('Please enter your solution or upload a file before continuing.');
                  return;
                }
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
