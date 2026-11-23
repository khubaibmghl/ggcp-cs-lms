'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataStore } from '@/lib/storage';
import { Assignment, Submission, UploadedFile } from '@/types';
import { uploadFileToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinaryService';
import { formatDateDDMMMYYYY, formatDateTimeDDMMMYYYY } from '@/lib/dateUtils';
import { saveFileBlob } from '@/lib/fileStorage';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  X,
  Send,
  FileCheck,
  AlertCircle,
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

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

  // Process document upload
  const processDocumentFiles = async (filesList: File[]) => {
    if (filesList.length === 0) return;

    const file = filesList[0];
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

      const processedFile: UploadedFile = {
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

      // 3. Pre-flight text extraction for AI assessment engine
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
      showSuccess('File Ready', `"${file.name}" is attached.`);
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

  const handleSubmit = async () => {
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

    setIsProcessing(true);
    setSubmissionError(null);

    try {
      const fileItem = { ...uploadedFiles[0] };
      const subId = existingSub?.id || `sub-${Date.now()}`;

      // 1. Cloud upload if configured and URL not yet obtained
      if (isCloudinaryConfigured() && !fileItem.url && fileItem.dataUrl) {
        try {
          const cloudRes = await uploadFileToCloudinary(fileItem.dataUrl, fileItem.name);
          if (cloudRes?.url && cloudRes.isCloudinary) {
            fileItem.url = cloudRes.url;
            delete fileItem.dataUrl; // Release multi-MB string from memory & storage
          }
        } catch (cloudErr) {
          console.warn('Cloudinary upload warning:', cloudErr);
        }
      }

      // 2. Local IndexedDB offload if no remote URL
      if (!fileItem.url && fileItem.dataUrl) {
        const fileKey = `file_${subId}_0`;
        await saveFileBlob(fileKey, fileItem.dataUrl);
        fileItem.fileKey = fileKey;
        delete fileItem.dataUrl; // Strip from localStorage payload to never exceed 5MB quota
      }

      const submissionPayload: Submission = {
        id: subId,
        assignmentId: assignment.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentRollNumber: currentUser.rollNumber || 1,
        studentSemester: currentUser.semester || assignment.semester,
        studentSection: currentUser.section || 'A1',
        textSubmission: '',
        files: [fileItem],
        submittedAt: new Date().toISOString(),
        status: 'submitted',
        aiSuggestedScore: undefined,
        integrityReport: {
          peerPlagiarismScore: 0,
          aiLikelihoodScore: 0,
          aiReasoning: `Document submission: ${fileItem.name}`,
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

      // 3. Save to local storage with verified persistence
      const saved = await dataStore.upsertSubmissionAsync(submissionPayload);
      if (!saved) {
        throw new Error('Could not persist submission to local storage. Please try again.');
      }

      // 4. Trigger celebration & feedback only on verified save
      try {
        confetti({
          particleCount: 100,
          spread: 70,
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
    } catch (err: any) {
      console.error('Submission execution error:', err);
      setSubmissionError(err?.message || 'Could not complete submission. Please try again.');
      showError('Submission Error', 'Failed to save submission.');
    } finally {
      setIsProcessing(false);
    }
  };

  const attachedFile = uploadedFiles[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] font-black bg-white/20 text-purple-200 px-2 py-0.5 rounded-md">
                {assignment.subjectCode}
              </span>
              <span className="text-[11px] text-purple-200 font-mono">
                Due: {formatDateDDMMMYYYY(assignment.deadlineDate)}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              {existingSub ? 'Update Assignment Submission' : 'Submit Assignment'}
            </h2>
            <p className="text-xs text-purple-200 mt-0.5 line-clamp-1">{assignment.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Simple Guidelines (2 points only) */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-purple-900">
              <FileCheck className="w-4 h-4 text-purple-700 flex-shrink-0" />
              <span>Submission Guidelines</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 text-[11px]">
              <li>
                <strong>Accepted Formats:</strong> PDF (.pdf) or Word (.docx, .doc) up to 25 MB.
              </li>
              <li>
                <strong>Original Work:</strong> Ensure this solution is your own authentic effort.
              </li>
            </ul>
          </div>

          {/* Upload Dropzone / File Picker */}
          {!attachedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                isDragging
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-slate-300 hover:border-purple-400 bg-slate-50/70 hover:bg-purple-50/30'
              }`}
            >
              <input
                type="file"
                disabled={isProcessing}
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileInputChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
              />

              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-3 space-y-2">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-800">Processing document...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Drop solution file here, or <span className="text-purple-700 underline">browse</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF or Word documents</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate" title={attachedFile.name}>
                    {attachedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {formatBytes(attachedFile.size)} • Ready to submit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadedFiles([])}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition cursor-pointer flex-shrink-0"
                title="Remove attached file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Submission Notice / Resubmission Info */}
          {existingSub && (
            <p className="text-[11px] text-slate-500 font-mono">
              Last submitted on {formatDateTimeDDMMMYYYY(existingSub.submittedAt)}. Submitting again will update your solution file.
            </p>
          )}

          {/* Error Message */}
          {submissionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submissionError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isProcessing || uploadedFiles.length === 0 || isDeadlinePassed()}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-900/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{existingSub ? 'Update Solution' : 'Submit Assignment'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
