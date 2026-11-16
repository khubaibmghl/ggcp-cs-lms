export type UserRole = 'admin' | 'teacher' | 'student';

export type TeacherStatus = 'pending' | 'approved' | 'rejected';

export type Section = 'A1' | 'A2' | 'B';

export type SemesterNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Subject {
  id: string;
  code: string; // e.g. CS101, CS201
  name: string; // e.g. Programming Fundamentals, Data Structures
  semester: SemesterNumber;
  creditHours: number;
  description: string;
}

export interface TeacherCourseAssignment {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semester: SemesterNumber;
  sections: Section[]; // e.g. ['A1', 'A2', 'B'] or subset
}

export interface User {
  id: string;
  loginId: string; // System-generated Student ID (e.g. BCS26-001) or Admin username
  name: string;
  email: string;
  password: string; // For authentication
  role: UserRole;
  avatar?: string;
  phone?: string; // Used by teachers for login (e.g. 03001234567)
  fatherName?: string; // For students
  // Teacher-specific fields:
  status?: TeacherStatus;
  taughtSemester?: SemesterNumber;
  taughtSubjectId?: string;
  taughtSubjectName?: string;
  assignedCourses?: TeacherCourseAssignment[]; // Multi-subject and section mapping
  // Student-specific fields:
  rollNumber?: number; // 1 to N
  semester?: SemesterNumber;
  section?: Section;
  createdAt: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  points: number;
}

export interface RubricCriterion {
  id: string;
  title: string;
  weight: number; // percentage
  description: string;
}

export type GradingMode = 'manual' | 'testcases' | 'ai_rubric' | 'hybrid';

export interface Assignment {
  id: string;
  teacherId: string;
  teacherName: string;
  semester: SemesterNumber;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  targetSections: ('All' | Section)[];
  title: string;
  description: string;
  totalMarks: number;
  deadlineDate: string; // YYYY-MM-DD
  gradingMode: GradingMode;
  testCases?: TestCase[];
  aiRubric?: RubricCriterion[];
  resourceFileName?: string;
  resourceFileContent?: string;
  createdAt: string;
}

export interface SubmissionTelemetry {
  typedCharacterCount: number;
  pasteEventCount: number;
  totalPastedCharacters: number;
  typingDurationSeconds: number;
  estimatedWPM: number;
  suspiciousBurstDetected: boolean;
  timelineLogs: string[];
}

export interface IntegrityReport {
  peerPlagiarismScore: number; // 0 to 100
  matchedWithRollNumber?: number;
  matchedStudentName?: string;
  matchedSnippet?: string;
  aiLikelihoodScore: number; // 0 to 100
  aiReasoning: string;
  telemetry: SubmissionTelemetry;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  extractedText?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentRollNumber: number;
  studentSemester: SemesterNumber;
  studentSection: Section;
  textSubmission: string;
  files: UploadedFile[];
  submittedAt: string;
  status: 'submitted' | 'graded';
  score?: number;
  teacherFeedback?: string;
  testCasesPassed?: number;
  testCasesTotal?: number;
  aiSuggestedScore?: number;
  aiFeedback?: string;
  integrityReport: IntegrityReport;
}
