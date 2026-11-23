import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Subject, Assignment, Submission } from '@/types';

// Convert DB snake_case to TS camelCase
function mapDbUser(row: any): User {
  return {
    id: row.id,
    loginId: row.login_id,
    name: row.name,
    fatherName: row.father_name,
    email: row.email,
    password: row.password,
    role: row.role,
    phone: row.phone,
    avatar: row.avatar,
    status: row.status,
    taughtSemester: row.taught_semester,
    taughtSubjectId: row.taught_subject_id,
    taughtSubjectName: row.taught_subject_name,
    assignedCourses: row.assigned_courses || [],
    rollNumber: row.roll_number,
    semester: row.semester,
    section: row.section,
    createdAt: row.created_at,
  };
}

function mapUserToDb(u: User): any {
  return {
    id: u.id,
    login_id: u.loginId,
    name: u.name,
    father_name: u.fatherName || null,
    email: u.email,
    password: u.password,
    role: u.role,
    phone: u.phone || null,
    avatar: u.avatar || null,
    status: u.status || 'approved',
    taught_semester: u.taughtSemester || null,
    taught_subject_id: u.taughtSubjectId || null,
    taught_subject_name: u.taughtSubjectName || null,
    assigned_courses: u.assignedCourses || [],
    roll_number: u.rollNumber || null,
    semester: u.semester || null,
    section: u.section || null,
    created_at: u.createdAt,
  };
}

function mapDbSubject(row: any): Subject {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    semester: row.semester,
    creditHours: row.credit_hours,
    description: row.description || '',
  };
}

function mapSubjectToDb(s: Subject): any {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    semester: s.semester,
    credit_hours: s.creditHours,
    description: s.description,
  };
}

function mapDbAssignment(row: any): Assignment {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    semester: row.semester,
    subjectId: row.subject_id,
    subjectCode: row.subject_code,
    subjectName: row.subject_name,
    targetSections: row.target_sections || ['All'],
    title: row.title,
    description: row.description,
    totalMarks: row.total_marks,
    deadlineDate: row.deadline_date,
    gradingMode: row.grading_mode,
    testCases: row.test_cases || [],
    aiRubric: row.ai_rubric || [],
    resourceFileName: row.resource_file_name,
    resourceFileContent: row.resource_file_content,
    createdAt: row.created_at,
  };
}

function mapAssignmentToDb(a: Assignment): any {
  return {
    id: a.id,
    teacher_id: a.teacherId,
    teacher_name: a.teacherName,
    semester: a.semester,
    subject_id: a.subjectId,
    subject_code: a.subjectCode,
    subject_name: a.subjectName,
    target_sections: a.targetSections,
    title: a.title,
    description: a.description,
    total_marks: a.totalMarks,
    deadline_date: a.deadlineDate,
    grading_mode: a.gradingMode,
    test_cases: a.testCases || [],
    ai_rubric: a.aiRubric || [],
    resource_file_name: a.resourceFileName || null,
    resource_file_content: a.resourceFileContent && a.resourceFileContent.length < 50000 ? a.resourceFileContent : null,
    created_at: a.createdAt,
  };
}

function mapDbSubmission(row: any): Submission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentRollNumber: row.student_roll_number,
    studentSemester: row.student_semester,
    studentSection: row.student_section,
    textSubmission: row.text_submission || '',
    files: row.files || [],
    submittedAt: row.submitted_at,
    status: row.status || 'submitted',
    score: row.marks != null ? Number(row.marks) : undefined,
    teacherFeedback: row.feedback || undefined,
    testCasesPassed: row.test_cases_passed,
    testCasesTotal: row.test_cases_total,
    aiSuggestedScore: row.ai_suggested_score,
    integrityReport: row.integrity_report || {
      peerPlagiarismScore: 0,
      aiLikelihoodScore: 0,
      aiReasoning: 'Normal submission',
      telemetry: {
        typedCharacterCount: 0,
        pasteEventCount: 0,
        totalPastedCharacters: 0,
        typingDurationSeconds: 0,
        estimatedWPM: 0,
        suspiciousBurstDetected: false,
        timelineLogs: [],
      },
    },
  };
}

function mapSubmissionToDb(s: Submission): any {
  const sanitizedFiles = (s.files || []).map((f) => {
    const copy = { ...f };
    // Never send multi-megabyte base64 strings to Supabase REST payload
    if (copy.dataUrl && copy.dataUrl.length > 20000) {
      delete copy.dataUrl;
    }
    return copy;
  });

  return {
    id: s.id,
    assignment_id: s.assignmentId,
    student_id: s.studentId,
    student_name: s.studentName,
    student_roll_number: s.studentRollNumber,
    student_semester: s.studentSemester,
    student_section: s.studentSection,
    text_submission: s.textSubmission || null,
    files: sanitizedFiles,
    submitted_at: s.submittedAt,
    status: s.status,
    marks: s.score != null ? s.score : null,
    feedback: s.teacherFeedback || null,
    test_cases_passed: s.testCasesPassed != null ? s.testCasesPassed : null,
    test_cases_total: s.testCasesTotal != null ? s.testCasesTotal : null,
    ai_suggested_score: s.aiSuggestedScore != null ? s.aiSuggestedScore : null,
    integrity_report: s.integrityReport || {},
  };
}

// Cloud Service Methods with Error Handling and Retry-Aware Results
export const supabaseService = {
  async fetchUsers(): Promise<User[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error || !data) return null;
      return data.map(mapDbUser);
    } catch {
      return null;
    }
  },

  async upsertUser(user: User): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload = mapUserToDb(user);
      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteUser(
    id: string,
    loginId?: string,
    extra?: { semester?: number; section?: string; rollNumber?: number }
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      // 1. Delete associated student submissions to avoid foreign key errors
      await supabase.from('submissions').delete().eq('student_id', id);

      if (extra?.rollNumber != null && extra?.semester != null && extra?.section) {
        await supabase
          .from('submissions')
          .delete()
          .eq('student_roll_number', extra.rollNumber)
          .eq('student_semester', extra.semester)
          .eq('student_section', extra.section);
      }

      // 2. Delete user by id
      const { error: err1 } = await supabase.from('users').delete().eq('id', id);

      // 3. Also delete by login_id if available
      if (loginId) {
        await supabase.from('users').delete().eq('login_id', loginId);
      }

      // 4. Also delete by (semester, section, roll_number) if available
      if (extra?.rollNumber != null && extra?.semester != null && extra?.section) {
        await supabase
          .from('users')
          .delete()
          .eq('role', 'student')
          .eq('roll_number', extra.rollNumber)
          .eq('semester', extra.semester)
          .eq('section', extra.section);
      }

      return !err1;
    } catch (err) {
      console.warn('Supabase delete user exception:', err);
      return false;
    }
  },

  async fetchSubjects(): Promise<Subject[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.from('subjects').select('*').order('semester', { ascending: true });
      if (error || !data) return null;
      return data.map(mapDbSubject);
    } catch {
      return null;
    }
  },

  async upsertSubject(subject: Subject): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload = mapSubjectToDb(subject);
      const { error } = await supabase.from('subjects').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteSubject(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  async fetchAssignments(): Promise<Assignment[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
      if (error || !data) return null;
      return data.map(mapDbAssignment);
    } catch {
      return null;
    }
  },

  async upsertAssignment(assignment: Assignment): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload = mapAssignmentToDb(assignment);
      const { error } = await supabase.from('assignments').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteAssignment(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  async fetchSubmissions(): Promise<Submission[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
      if (error || !data) return null;
      return data.map(mapDbSubmission);
    } catch {
      return null;
    }
  },

  async upsertSubmission(submission: Submission): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload = mapSubmissionToDb(submission);
      const { error } = await supabase.from('submissions').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteSubmission(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },
};
