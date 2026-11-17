import { Subject, User, Assignment, Submission } from '@/types';
import {
  INITIAL_SUBJECTS,
  INITIAL_USERS,
  INITIAL_ASSIGNMENTS,
  INITIAL_SUBMISSIONS,
} from './mockData';
import { supabaseService } from './supabaseService';
import { isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEYS = {
  USERS: 'college_lms_users',
  SUBJECTS: 'college_lms_subjects',
  ASSIGNMENTS: 'college_lms_assignments',
  SUBMISSIONS: 'college_lms_submissions',
  ACTIVE_USER_ID: 'college_lms_active_user_id',
};

// Safe localStorage wrapper for SSR
class LocalDataStore {
  private isClient = typeof window !== 'undefined';

  private get<T>(key: string, fallback: T): T {
    if (!this.isClient) return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, data: T): void {
    if (!this.isClient) return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new Event('lms_storage_updated'));
    } catch (err) {
      console.error('Storage write error:', err);
    }
  }

  init(): void {
    if (!this.isClient) return;

    // Version key to auto-update catalog when official workload allocation changes
    const CURRICULUM_VERSION = 'v4_fall_official_odd_semesters';
    const currentVersion = localStorage.getItem('college_lms_curriculum_version');

    if (currentVersion !== CURRICULUM_VERSION) {
      // Overwrite subjects, users and assignments with the official curriculum and workload allocation
      this.set(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
      this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
      this.set(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
      localStorage.setItem('college_lms_curriculum_version', CURRICULUM_VERSION);
    } else {
      if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
        this.set(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS)) {
        this.set(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)) {
        this.set(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
      }
    }

    // Cloud Synchronization (Supabase PostgreSQL)
    if (isSupabaseConfigured) {
      this.syncWithSupabase();
    }
  }

  async syncWithSupabase(): Promise<void> {
    try {
      const [cloudUsers, cloudSubjects, cloudAssignments, cloudSubmissions] = await Promise.all([
        supabaseService.fetchUsers(),
        supabaseService.fetchSubjects(),
        supabaseService.fetchAssignments(),
        supabaseService.fetchSubmissions(),
      ]);

      if (cloudUsers && cloudUsers.length > 0) {
        this.set(STORAGE_KEYS.USERS, cloudUsers);
      } else if (isSupabaseConfigured) {
        // Seed cloud DB with initial users
        const localUsers = this.getUsers();
        for (const u of localUsers) {
          await supabaseService.upsertUser(u);
        }
      }

      if (cloudSubjects && cloudSubjects.length > 0) {
        this.set(STORAGE_KEYS.SUBJECTS, cloudSubjects);
      } else if (isSupabaseConfigured) {
        // Seed cloud DB with initial subjects
        const localSubs = this.getSubjects();
        for (const s of localSubs) {
          await supabaseService.upsertSubject(s);
        }
      }

      if (cloudAssignments && cloudAssignments.length > 0) {
        this.set(STORAGE_KEYS.ASSIGNMENTS, cloudAssignments);
      }

      if (cloudSubmissions && cloudSubmissions.length > 0) {
        this.set(STORAGE_KEYS.SUBMISSIONS, cloudSubmissions);
      }
    } catch (err) {
      console.warn('Supabase background sync notification:', err);
    }
  }

  // --- Users ---
  getUsers(): User[] {
    return this.get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  saveUsers(users: User[]): void {
    this.set(STORAGE_KEYS.USERS, users);
  }

  addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    if (isSupabaseConfigured) {
      supabaseService.upsertUser(user).catch(console.error);
    }
  }

  updateUser(id: string, updates: Partial<User>): void {
    const users = this.getUsers().map((u) => (u.id === id ? { ...u, ...updates } : u));
    this.saveUsers(users);
    if (isSupabaseConfigured) {
      const updated = users.find((u) => u.id === id);
      if (updated) supabaseService.upsertUser(updated).catch(console.error);
    }
  }

  // Active User session (null means user is logged out and on the landing login page)
  getActiveUserId(): string | null {
    if (!this.isClient) return null;
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
  }

  setActiveUserId(id: string | null): void {
    if (!this.isClient) return;
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
    }
    window.dispatchEvent(new Event('lms_storage_updated'));
  }

  // Unique Official Student Login ID: BCS{Semester}-{Section}-{Roll}
  // e.g., Semester 3, Section A1, Roll 1 -> BCS3-A1-001
  generateStudentLoginId(semester: number, section: string, rollNumber: number): string {
    const padded = String(rollNumber).padStart(3, '0');
    return `BCS${semester}-${section}-${padded}`;
  }

  // --- Subjects (Curriculum) ---
  getSubjects(): Subject[] {
    return this.get<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  }

  saveSubjects(subjects: Subject[]): void {
    this.set(STORAGE_KEYS.SUBJECTS, subjects);
  }

  addSubject(subject: Subject): void {
    const subjects = this.getSubjects();
    subjects.push(subject);
    this.saveSubjects(subjects);
    if (isSupabaseConfigured) {
      supabaseService.upsertSubject(subject).catch(console.error);
    }
  }

  deleteSubject(id: string): void {
    const subjects = this.getSubjects().filter((s) => s.id !== id);
    this.saveSubjects(subjects);
    if (isSupabaseConfigured) {
      supabaseService.deleteSubject(id).catch(console.error);
    }
  }

  // --- Assignments ---
  getAssignments(): Assignment[] {
    return this.get<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
  }

  saveAssignments(assignments: Assignment[]): void {
    this.set(STORAGE_KEYS.ASSIGNMENTS, assignments);
  }

  addAssignment(assignment: Assignment): void {
    const assignments = this.getAssignments();
    assignments.unshift(assignment); // latest first
    this.saveAssignments(assignments);
    if (isSupabaseConfigured) {
      supabaseService.upsertAssignment(assignment).catch(console.error);
    }
  }

  deleteAssignment(id: string): void {
    const assignments = this.getAssignments().filter((a) => a.id !== id);
    this.saveAssignments(assignments);
    const submissions = this.getSubmissions().filter((s) => s.assignmentId !== id);
    this.saveSubmissions(submissions);
  }

  // --- Submissions ---
  getSubmissions(): Submission[] {
    return this.get<Submission[]>(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
  }

  saveSubmissions(submissions: Submission[]): void {
    this.set(STORAGE_KEYS.SUBMISSIONS, submissions);
  }

  upsertSubmission(submission: Submission): void {
    const submissions = this.getSubmissions();
    const idx = submissions.findIndex(
      (s) => s.assignmentId === submission.assignmentId && s.studentId === submission.studentId
    );
    if (idx >= 0) {
      submissions[idx] = submission; // overwrite prior submission (allowed before deadline)
    } else {
      submissions.push(submission);
    }
    this.saveSubmissions(submissions);
    if (isSupabaseConfigured) {
      supabaseService.upsertSubmission(submission).catch(console.error);
    }
  }

  // Reset all to fresh defaults
  resetToDefaults(): void {
    if (!this.isClient) return;
    this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.set(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    this.set(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    this.set(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    this.setActiveUserId(null);
  }
}

export const dataStore = new LocalDataStore();
