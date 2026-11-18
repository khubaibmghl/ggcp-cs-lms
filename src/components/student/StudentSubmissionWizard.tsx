'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataStore } from '@/lib/storage';
import { Assignment, Submission, UploadedFile } from '@/types';
import { uploadFileToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinaryService';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Loader2,
  Download,
  Calendar,
  Award,
  BookOpen,
  User,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
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
  const { showSuccess, showError, showWarning } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Check if student already submitted earlier
  const existingSub = dataStore
    .getSubmissions()
    .find((s) => s.assignmentId === assignment.id && s.studentId === currentUser?.id);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingSub?.files || []);

  // Format file size nicely
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check deadline expiration
  const isDeadlinePassed = (): boolean => {
    if (!assignment.deadlineDate) return false;
    const [year, month, day] = assignment.deadlineDate.split('-').map(Number);
    const deadline = new Date(year, month - 1, day, 23, 59, 59, 999);
    return Date.now() > deadline.getTime();
  };

  // Pre-flight check and process document files
  const processDocumentFiles = async (filesList: File[]) => {
    if (filesList.length === 0) return;

    const file = filesList[0]; // strictly 1 solution document per assignment
    const fileNameLower = file.name.toLowerCase();
    const isDoc =
      fileNameLower.endsWith('.pdf') ||
      fileNameLower.endsWith('.docx') ||
      fileNameLower.endsWith('.doc');

    if (!isDoc) {
      setSubmissionError('Invalid format. Only PDF (.pdf) and Microsoft Word (.docx, .doc) files are accepted.');
      showError('Invalid Format', 'Please upload a PDF (.pdf) or Word (.docx) document.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setSubmissionError('File size exceeds the 25 MB limit. Please compress or optimize your document.');
      showError('File Too Large', 'Maximum file size allowed is 25 MB.');
      return;
    }

    setIsProcessing(true);
    setSubmissionError(null);

    try {
      // 1. Read file to Base64 DataURL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      let processedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type || (fileNameLower.endsWith('.pdf') ? 'application/pdf' : 'application/msword'),
        dataUrl,
      };

      // 2. Cloud storage sync if configured
      if (isCloudinaryConfigured()) {
        try {
          const cloudRes = await uploadFileToCloudinary(dataUrl, file.name);
          processedFile.url = cloudRes.url;
        } catch {
          // Continue with local dataUrl
        }
      }

      // 3. Pre-flight text extraction check
      try {
        const extractRes = await fetch('/api/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: processedFile }),
        });
        if (extractRes.ok) {
          const json = await extractRes.json();
          if (json.success && json.text) {
            processedFile.extractedText = json.text;
          }
        }
      } catch {
        // Safe to proceed even if extraction is deferred
      }

      setUploadedFiles([processedFile]);
      setSubmissionError(null);
      showSuccess('Document Attached', `"${file.name}" is attached and ready.`);
    } catch {
      setSubmissionError('Could not process the selected file. Please verify it is a valid document.');
      showError('Upload Error', 'Could not process the document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processDocumentFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processDocumentFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDownloadAttachedFile = (file: UploadedFile) => {
    const downloadUri = file.dataUrl || file.url;
    if (!downloadUri) return;
    const link = document.createElement('a');
    link.href = downloadUri;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadQuestionPaper = () => {
    if (!assignment.resourceFileContent) return;
    const link = document.createElement('a');
    link.href = assignment.resourceFileContent;
    link.download = assignment.resourceFileName || `${assignment.subjectCode}_Assignment_Paper.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = () => {
    if (uploadedFiles.length === 0) {
      setSubmissionError('Please attach your solution document (PDF or Word) before submitting.');
      showWarning('File Required', 'Attach your completed assignment file.');
      return;
    }

    if (!currentUser) return;

    if (isDeadlinePassed()) {
      setSubmissionError('The deadline for this assignment has expired.');
      showError('Submission Closed', 'The deadline for this assignment has passed.');
      return;
    }

    const submissionPayload: Submission = {
      id: existingSub?.id || `sub-${Date.now()}`,
      assignmentId: assignment.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentRollNumber: currentUser.rollNumber || 1,
      studentSemester: currentUser.semester || assignment.semester,
      studentSection: currentUser.section || 'A1',
      textSubmission: '',
      files: uploadedFiles,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      aiSuggestedScore: undefined,
      integrityReport: {
        peerPlagiarismScore: 0,
        aiLikelihoodScore: 0,
        aiReasoning: `Document submission: ${uploadedFiles[0]?.name}`,
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

    dataStore.upsertSubmission(submissionPayload);

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignored if confetti fails
    }

    showSuccess(
      'Assignment Submitted',
      existingSub
        ? 'Your updated solution document has been submitted successfully.'
        : 'Your assignment solution has been submitted successfully.'
    );

    onClose();
  };

  const attachedFile = uploadedFiles[0];
  const isPdf = attachedFile?.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                  {assignment.subjectCode}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Total: {assignment.totalMarks} Marks
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white mt-1.5 truncate max-w-lg">
                {assignment.title}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition text-xs font-bold"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: 'Question Paper' },
              { num: 2, label: 'Attach Solution' },
              { num: 3, label: 'Review & Submit' },
            ].map((s) => {
              const isActive = s.num === step;
              const isDone = s.num < step;
              return (
                <div key={s.num} className="space-y-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-400'
                        : isActive
                        ? 'bg-purple-400'
                        : 'bg-slate-700'
                    }`}
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-semibold ${
                        isActive
                          ? 'text-purple-300'
                          : isDone
                          ? 'text-emerald-300'
                          : 'text-slate-500'
                      }`}
                    >
                      Step {s.num}: {s.label}
                    </span>
                    {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Error Banner */}
          {submissionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{submissionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionError(null)}
                className="text-rose-400 hover:text-rose-700 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: Question Paper & Instructions */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Official Question Paper Download Card */}
              {assignment.resourceFileContent ? (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {assignment.resourceFileName || 'Assignment_Questions.pdf'}
                      </h4>
                      <p className="text-[11px] text-purple-700 font-medium">
                        Official Question Paper provided by instructor
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadQuestionPaper}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Paper</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-2 text-xs text-slate-600">
                  <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>Refer to the description below for assignment questions and details.</span>
                </div>
              )}

              {/* Instructions Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Assignment Instructions
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {assignment.description || 'Complete the assignment as instructed.'}
                </p>
              </div>

              {/* Evaluation Rubric */}
              {assignment.aiRubric && assignment.aiRubric.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Marking Rubric
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assignment.aiRubric.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800 mb-0.5">
                          <span>{item.title}</span>
                          <span className="text-purple-700 text-[11px] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                            {item.weight}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Timeline & Deadline Info */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Deadline: <strong>{assignment.deadlineDate}</strong> at 11:59:59 PM (Midnight)
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/60 px-2.5 py-0.5 rounded-full">
                  {assignment.totalMarks} Marks
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Solution Document Upload */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-slate-300 hover:border-purple-400 bg-slate-50/60 hover:bg-purple-50/30'
                }`}
              >
                <input
                  type="file"
                  multiple={false}
                  disabled={isProcessing}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                />

                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-2 space-y-2">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-800">Verifying document...</p>
                    <p className="text-[11px] text-slate-400">Processing file for submission</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Drop your solution document here, or <span className="text-purple-700 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supported formats: <strong>PDF (.pdf)</strong> or <strong>Word (.docx, .doc)</strong>
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400">Maximum file size: 25 MB</p>
                  </div>
                )}
              </div>

              {/* Attached Document Card */}
              {attachedFile && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Attached Solution Document
                  </span>
                  <div className="p-4 bg-white rounded-2xl border border-purple-200 flex items-center justify-between text-xs shadow-xs">
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${
                          isPdf ? 'bg-rose-500' : 'bg-blue-600'
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <span className="font-extrabold text-slate-900 truncate block text-xs">
                          {attachedFile.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{formatBytes(attachedFile.size)}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            Ready for grading
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachedFile(attachedFile)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition"
                        title="Verify / Download your file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Verify File</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUploadedFiles([])}
                        className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                        title="Remove attached file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Clean Guidance */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Submission Tips:</p>
                <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-0.5">
                  <li>Ensure your Roll Number and Name are written on the title page.</li>
                  <li>Click &quot;Verify File&quot; above to double-check that you attached the correct document.</li>
                  <li>You can resubmit or replace your file anytime until the midnight deadline.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Student Identity Card */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">
                      Submitting Student
                    </span>
                    <h3 className="text-xs font-extrabold text-slate-900">
                      {currentUser?.name || 'Student'}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Roll #{currentUser?.rollNumber} • Semester {currentUser?.semester || assignment.semester} • Section{' '}
                      {currentUser?.section || 'A1'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Verified Profile
                </span>
              </div>

              {/* Solution Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Document Ready for Submission
                </span>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className={`w-5 h-5 ${isPdf ? 'text-rose-600' : 'text-blue-600'}`} />
                    <span className="font-bold text-slate-800 text-xs truncate">
                      {attachedFile?.name || 'No file selected'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                    {formatBytes(attachedFile?.size || 0)}
                  </span>
                </div>
              </div>

              {/* Resubmission / Policy Banner */}
              {existingSub ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Resubmission Notice</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      You previously submitted on{' '}
                      {new Date(existingSub.submittedAt).toLocaleDateString()} at{' '}
                      {new Date(existingSub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                      Submitting now will update your solution file.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Ready to submit! You may update or resubmit your file anytime before the midnight deadline.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
            className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold transition ${
              step === 1
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 2 && uploadedFiles.length === 0) {
                  setSubmissionError('Please attach your solution document (PDF or Word) to continue.');
                  return;
                }
                setSubmissionError(null);
                setStep((prev) => (prev + 1) as 1 | 2 | 3);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition"
            >
              <span>Continue to Step {step + 1}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isDeadlinePassed() || uploadedFiles.length === 0}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Submit Assignment</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
