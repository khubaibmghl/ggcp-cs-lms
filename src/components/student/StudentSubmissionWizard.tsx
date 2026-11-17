'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataStore } from '@/lib/storage';
import { generateIntegrityReport } from '@/lib/integrityEngine';
import { Assignment, Submission, UploadedFile, SubmissionTelemetry } from '@/types';
import { uploadFileToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinaryService';
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
  Download,
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

  // Solution Document Upload Handler (PDF or Word .docx ONLY)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const rawFiles = Array.from(files);

    // Validate: Only PDF or Word documents
    const validExts = ['.pdf', '.doc', '.docx'];
    for (const file of rawFiles) {
      const isDoc = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!isDoc) {
        setSubmissionError(`Invalid file: "${file.name}". Only PDF (.pdf) and Microsoft Word (.docx, .doc) files are allowed.`);
        showError('Invalid Format', 'Only PDF (.pdf) or Word (.docx, .doc) files are accepted.');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setSubmissionError(`File "${file.name}" exceeds the 25 MB limit.`);
        showError('File Too Large', `File "${file.name}" exceeds 25 MB.`);
        return;
      }
    }

    setIsOptimizing(true);
    setSubmissionError(null);

    try {
      // 1. Read files into base64 dataUrl
      const readDocs: UploadedFile[] = await Promise.all(
        rawFiles.map((file) => {
          return new Promise<UploadedFile>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = typeof reader.result === 'string' ? reader.result : '';
              resolve({
                name: file.name,
                size: file.size,
                type: file.type || 'application/pdf',
                dataUrl: dataUrl,
              });
            };
            reader.onerror = () => {
              resolve({ name: file.name, size: file.size, type: file.type });
            };
            reader.readAsDataURL(file);
          });
        })
      );

      // 2. Upload to Cloudinary if configured, BUT PRESERVE dataUrl (prevents 401 ACL download failures!)
      const processed: UploadedFile[] = await Promise.all(
        readDocs.map(async (file) => {
          if (file.dataUrl && isCloudinaryConfigured()) {
            const cloudRes = await uploadFileToCloudinary(file.dataUrl, file.name);
            return {
              ...file,
              url: cloudRes.url,
              dataUrl: file.dataUrl, // KEEP BASE64 DATAURL SAFE FOR 100% RELIABLE DOWNLOADS!
              size: file.size,
            };
          }
          return file;
        })
      );

      setUploadedFiles(processed);
      setSubmissionError(null);
      showSuccess(
        'Document Attached',
        `"${processed[0]?.name}" attached as solution file.`
      );
    } catch {
      setSubmissionError('An error occurred while uploading your document. Please try again.');
      showError('Upload Error', 'Could not process selected file.');
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
    if (uploadedFiles.length === 0) {
      setSubmissionError('Please upload your completed solution document in PDF (.pdf) or Word (.docx) format.');
      showWarning('Incomplete Submission', 'Please attach your solution document before submitting.');
      return;
    }

    if (!currentUser) return;

    const newSubmission: Submission = {
      id: existingSub?.id || `sub-${Date.now()}`,
      assignmentId: assignment.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentRollNumber: currentUser.rollNumber || 1,
      studentSemester: currentUser.semester || 1,
      studentSection: currentUser.section || 'A1',
      textSubmission: '',
      files: uploadedFiles,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      // No fake AI suggested score! Teacher grades manually based on the document.
      aiSuggestedScore: undefined,
      integrityReport: {
        peerPlagiarismScore: 0,
        aiLikelihoodScore: 0,
        aiReasoning: `Document submission (${uploadedFiles[0]?.name || 'PDF/Word'}). Solution file attached for instructor manual evaluation.`,
        telemetry: {
          typedCharacterCount: 0,
          pasteEventCount: 0,
          totalPastedCharacters: 0,
          typingDurationSeconds: 0,
          estimatedWPM: 0,
          suspiciousBurstDetected: false,
          timelineLogs: ['Document uploaded directly in official PDF/Word format.'],
        },
      },
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

              {/* Question Document Download Banner */}
              {assignment.resourceFileContent && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate">
                    <FileText className="w-8 h-8 text-purple-700 flex-shrink-0" />
                    <div className="truncate">
                      <h4 className="text-xs font-extrabold text-slate-900 truncate">
                        {assignment.resourceFileName || 'Assignment Question Document'}
                      </h4>
                      <p className="text-[11px] text-slate-500">Official Question Paper (PDF / Word .docx)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!assignment.resourceFileContent) return;
                      const link = document.createElement('a');
                      link.href = assignment.resourceFileContent;
                      link.download = assignment.resourceFileName || 'Assignment_Questions.pdf';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Question Paper
                  </button>
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

          {/* --- STEP 2: Solution Document Upload (PDF or Word .docx ONLY) --- */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-2xl p-8 text-center hover:bg-purple-50 transition cursor-pointer relative">
                <input
                  type="file"
                  multiple={false}
                  disabled={isOptimizing}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                />
                {isOptimizing ? (
                  <div className="flex flex-col items-center justify-center py-2">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
                    <p className="text-xs font-bold text-purple-900">
                      Attaching solution document...
                    </p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-extrabold text-slate-800">
                      Click or drag your completed assignment solution here
                    </p>
                    <p className="text-xs text-purple-700 font-semibold mt-1">
                      Accepted formats: <strong>PDF (.pdf)</strong> or <strong>Microsoft Word (.docx, .doc)</strong>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Official document upload only • Max file size: 25 MB
                    </p>
                  </>
                )}
              </div>

              {/* Uploaded Document List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">Attached Solution Document:</span>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white rounded-2xl border border-purple-200 flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <FileText className="w-7 h-7 text-purple-700 flex-shrink-0" />
                          <div className="truncate">
                            <span className="font-extrabold text-slate-800 truncate block text-xs">
                              {file.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {file.size >= 1024 * 1024
                                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.round(file.size / 1024)} KB`}{' '}
                              • Ready for submission
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-rose-500 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 transition"
                          title="Remove file"
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

              {/* Summary of Document */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                  Solution Document Attached:
                </span>
                <strong className="text-purple-900 font-extrabold text-sm block">
                  {uploadedFiles[0]?.name || 'Document Attached'}
                </strong>
                <p className="text-[11px] text-slate-500">
                  Official solution document attached for instructor evaluation.
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
