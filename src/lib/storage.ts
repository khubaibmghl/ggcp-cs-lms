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
  SYNC_QUEUE: 'college_lms_sync_queue',
  CURRICULUM_VERSION: 'college_lms_curriculum_version',
  DELETED_USER_IDS: 'college_lms_deleted_user_ids',
};

export interface SyncQueueItem {
  id: string;
  entity: 'user' | 'subject' | 'assignment' | 'submission';
  action: 'upsert' | 'delete';
  payload: any;
  timestamp: number;
  retryCount: number;
}

const SAMPLE_ASSIGNMENT_IDS = new Set(['asg-301-01', 'asg-301-02', 'asg-501-01', 'asg-101-01']);
const SAMPLE_SUBMISSION_IDS = new Set(['sub-001', 'sub-002', 'sub-003']);
const SAMPLE_STUDENT_IDS = new Set(['usr-stud-1', 'usr-stud-2', 'usr-stud-3', 'usr-stud-4', 'usr-stud-5']);

// Safe localStorage wrapper with Non-Destructive Migrations & Resilient Sync Queue
class LocalDataStore {
  private isClient = typeof window !== 'undefined';
  private isProcessingQueue = false;

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

  // --- RESILIENT SYNC QUEUE WITH RETRY LOGIC ---
  private getSyncQueue(): SyncQueueItem[] {
    return this.get<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  private saveSyncQueue(queue: SyncQueueItem[]): void {
    this.set(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  private enqueueSync(
    entity: SyncQueueItem['entity'],
    action: SyncQueueItem['action'],
    payload: any
  ): void {
    if (!this.isClient || !isSupabaseConfigured) return;

    const queue = this.getSyncQueue();
    const entityId = payload?.id || String(payload);

    // Replace existing queued action for the same entity item to avoid redundant writes
    const filtered = queue.filter((item) => !(item.entity === entity && item.id === entityId));

    filtered.push({
      id: entityId,
      entity,
      action,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    });

    this.saveSyncQueue(filtered);
    this.processSyncQueue();
  }

  async processSyncQueue(): Promise<void> {
    if (!this.isClient || !isSupabaseConfigured || this.isProcessingQueue) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    this.isProcessingQueue = true;
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      let success = false;

      try {
        if (item.entity === 'user') {
          if (item.action === 'upsert') {
            success = await supabaseService.upsertUser(item.payload);
          } else if (item.action === 'delete') {
            success = await supabaseService.deleteUser(item.id, item.payload?.loginId, {
              semester: item.payload?.semester,
              section: item.payload?.section,
              rollNumber: item.payload?.rollNumber,
            });
          }
        } else if (item.entity === 'subject') {
          if (item.action === 'upsert') {
            success = await supabaseService.upsertSubject(item.payload);
          } else if (item.action === 'delete') {
            success = await supabaseService.deleteSubject(item.id);
          }
        } else if (item.entity === 'assignment') {
          if (item.action === 'upsert') {
            success = await supabaseService.upsertAssignment(item.payload);
          } else if (item.action === 'delete') {
            success = await supabaseService.deleteAssignment(item.id);
          }
        } else if (item.entity === 'submission') {
          if (item.action === 'upsert') {
            success = await supabaseService.upsertSubmission(item.payload);
          } else if (item.action === 'delete') {
            success = await supabaseService.deleteSubmission(item.id);
          }
        }
      } catch (err) {
        success = false;
        console.warn(`Sync failed for ${item.entity}:${item.id}:`, err);
      }

      if (!success) {
        // Retry with backoff if attempts < 5
        if (item.retryCount < 5) {
          remainingQueue.push({
            ...item,
            retryCount: item.retryCount + 1,
          });
        } else {
          console.error(`Giving up on sync queue item after 5 failed retries:`, item);
        }
      }
    }

    this.saveSyncQueue(remainingQueue);
    this.isProcessingQueue = false;
  }

  getPendingSyncCount(): number {
    return this.getSyncQueue().length;
  }

  // --- INITIALIZATION & SMART NON-DESTRUCTIVE CURRICULUM MERGE ---
  init(): void {
    if (!this.isClient) return;

    const CURRICULUM_VERSION = 'v7_clean_production_zero_samples';
    const currentVersion = localStorage.getItem(STORAGE_KEYS.CURRICULUM_VERSION);

    if (currentVersion !== CURRICULUM_VERSION) {
      // 1. NON-DESTRUCTIVE USER PRESERVATION (Exclude sample students):
      // Keep real registered students and custom faculty created by administrators
      const existingUsers = this.get<User[]>(STORAGE_KEYS.USERS, []);
      const realStudents = existingUsers.filter(
        (u) => u.role === 'student' && !SAMPLE_STUDENT_IDS.has(u.id) && !this.isUserDeleted(u.id, u.loginId, u.semester, u.section, u.rollNumber)
      );
      const customTeachers = existingUsers.filter(
        (u) => u.role === 'teacher' && !INITIAL_USERS.some((iu) => iu.id === u.id)
      );

      const mergedUsers: User[] = [...INITIAL_USERS];

      // Re-insert real student registrations
      realStudents.forEach((stud) => {
        if (!mergedUsers.some((u) => u.id === stud.id || (u.loginId && stud.loginId && u.loginId.toLowerCase() === stud.loginId.toLowerCase()))) {
          mergedUsers.push(stud);
        }
      });

      // Re-insert custom faculty
      customTeachers.forEach((teach) => {
        if (!mergedUsers.some((u) => u.id === teach.id || (u.phone && teach.phone && u.phone === teach.phone))) {
          mergedUsers.push(teach);
        }
      });

      this.set(STORAGE_KEYS.USERS, mergedUsers);

      // 2. OFFICIAL SUBJECTS:
      const existingSubjects = this.get<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
      const customSubjects = existingSubjects.filter(
        (s) => !INITIAL_SUBJECTS.some((is) => is.id === s.id || is.code === s.code)
      );
      this.set(STORAGE_KEYS.SUBJECTS, [...INITIAL_SUBJECTS, ...customSubjects]);

      // 3. CLEAN ASSIGNMENTS (Purge sample assignments):
      const existingAssignments = this.get<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
      const realAssignments = existingAssignments.filter((a) => !SAMPLE_ASSIGNMENT_IDS.has(a.id));
      this.set(STORAGE_KEYS.ASSIGNMENTS, realAssignments);

      // 4. CLEAN SUBMISSIONS (Purge sample submissions):
      const existingSubmissions = this.get<Submission[]>(STORAGE_KEYS.SUBMISSIONS, []);
      const realSubmissions = existingSubmissions.filter(
        (s) => !SAMPLE_SUBMISSION_IDS.has(s.id) && !SAMPLE_ASSIGNMENT_IDS.has(s.assignmentId)
      );
      this.set(STORAGE_KEYS.SUBMISSIONS, realSubmissions);

      localStorage.setItem(STORAGE_KEYS.CURRICULUM_VERSION, CURRICULUM_VERSION);
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

    // Auto-process pending sync items on reconnection
    window.addEventListener('online', () => {
      this.processSyncQueue();
    });

    // Cloud Synchronization (Supabase PostgreSQL)
    if (isSupabaseConfigured) {
      this.syncWithSupabase();
      this.processSyncQueue();
    }
  }

  // --- TWO-WAY RESILIENT CLOUD SYNCHRONIZATION ---
  async syncWithSupabase(): Promise<void> {
    try {
      const [cloudUsers, cloudSubjects, cloudAssignments, cloudSubmissions] = await Promise.all([
        supabaseService.fetchUsers(),
        supabaseService.fetchSubjects(),
        supabaseService.fetchAssignments(),
        supabaseService.fetchSubmissions(),
      ]);

      // Users: Reconcile and merge
      if (cloudUsers && cloudUsers.length > 0) {
        // Filter out any cloud user that has been deleted locally (tombstoned)
        // Filter out any cloud user that has been deleted locally (tombstoned) or is sample
        const cleanCloudUsers = cloudUsers.filter(
          (cu) => !SAMPLE_STUDENT_IDS.has(cu.id) && !this.isUserDeleted(cu.id, cu.loginId, cu.semester, cu.section, cu.rollNumber)
        );

        // If cloud still has tombstoned users or sample students, actively purge them from cloud
        for (const cu of cloudUsers) {
          if (SAMPLE_STUDENT_IDS.has(cu.id) || this.isUserDeleted(cu.id, cu.loginId, cu.semester, cu.section, cu.rollNumber)) {
            supabaseService.deleteUser(cu.id, cu.loginId, {
              semester: cu.semester,
              section: cu.section,
              rollNumber: cu.rollNumber,
            }).catch(() => {});
          }
        }

        const syncQueue = this.getSyncQueue();
        const pendingUpsertIds = new Set(
          syncQueue.filter((q) => q.entity === 'user' && q.action === 'upsert').map((q) => q.id)
        );

        const localUsers = this.getUsers().filter(
          (lu) => !SAMPLE_STUDENT_IDS.has(lu.id) && !this.isUserDeleted(lu.id, lu.loginId, lu.semester, lu.section, lu.rollNumber)
        );

        const merged = [...cleanCloudUsers];

        // ONLY preserve local users if they are EXPLICITLY queued as pending offline upserts!
        // DO NOT resurrect deleted users!
        for (const lu of localUsers) {
          const inCloud = merged.some(
            (cu) =>
              cu.id === lu.id ||
              (cu.loginId && lu.loginId && cu.loginId.toLowerCase() === lu.loginId.toLowerCase())
          );
          if (!inCloud && pendingUpsertIds.has(lu.id)) {
            merged.push(lu);
          }
        }
        this.set(STORAGE_KEYS.USERS, merged);
      } else if (isSupabaseConfigured) {
        // Seed cloud DB with existing local users (excluding any tombstones or samples)
        const localUsers = this.getUsers().filter(
          (lu) => !SAMPLE_STUDENT_IDS.has(lu.id) && !this.isUserDeleted(lu.id, lu.loginId, lu.semester, lu.section, lu.rollNumber)
        );
        for (const u of localUsers) {
          this.enqueueSync('user', 'upsert', u);
        }
      }

      // Subjects: Reconcile and merge
      if (cloudSubjects && cloudSubjects.length > 0) {
        const localSubs = this.getSubjects();
        const mergedSubs = [...cloudSubjects];
        for (const ls of localSubs) {
          if (!mergedSubs.some((cs) => cs.id === ls.id || cs.code === ls.code)) {
            mergedSubs.push(ls);
            this.enqueueSync('subject', 'upsert', ls);
          }
        }
        this.set(STORAGE_KEYS.SUBJECTS, mergedSubs);
      } else if (isSupabaseConfigured) {
        const localSubs = this.getSubjects();
        for (const s of localSubs) {
          this.enqueueSync('subject', 'upsert', s);
        }
      }

      // Assignments: Reconcile and merge (purge any sample assignments from cloud too)
      if (cloudAssignments && cloudAssignments.length > 0) {
        const cleanCloudAsgs = cloudAssignments.filter((a) => !SAMPLE_ASSIGNMENT_IDS.has(a.id));
        for (const a of cloudAssignments) {
          if (SAMPLE_ASSIGNMENT_IDS.has(a.id)) {
            supabaseService.deleteAssignment(a.id).catch(() => {});
          }
        }

        const localAsgs = this.getAssignments().filter((a) => !SAMPLE_ASSIGNMENT_IDS.has(a.id));
        const mergedAsgs = [...cleanCloudAsgs];
        for (const la of localAsgs) {
          if (!mergedAsgs.some((ca) => ca.id === la.id)) {
            mergedAsgs.push(la);
            this.enqueueSync('assignment', 'upsert', la);
          }
        }
        this.set(STORAGE_KEYS.ASSIGNMENTS, mergedAsgs);
      }

      // Submissions: Reconcile and merge (purge any sample submissions from cloud too)
      if (cloudSubmissions && cloudSubmissions.length > 0) {
        const cleanCloudSubs = cloudSubmissions.filter(
          (s) => !SAMPLE_SUBMISSION_IDS.has(s.id) && !SAMPLE_ASSIGNMENT_IDS.has(s.assignmentId)
        );
        for (const s of cloudSubmissions) {
          if (SAMPLE_SUBMISSION_IDS.has(s.id) || SAMPLE_ASSIGNMENT_IDS.has(s.assignmentId)) {
            supabaseService.deleteSubmission(s.id).catch(() => {});
          }
        }

        const localSubs = this.getSubmissions().filter(
          (s) => !SAMPLE_SUBMISSION_IDS.has(s.id) && !SAMPLE_ASSIGNMENT_IDS.has(s.assignmentId)
        );
        const mergedSubs = [...cleanCloudSubs];
        for (const ls of localSubs) {
          if (!mergedSubs.some((cs) => cs.id === ls.id)) {
            mergedSubs.push(ls);
            this.enqueueSync('submission', 'upsert', ls);
          }
        }
        this.set(STORAGE_KEYS.SUBMISSIONS, mergedSubs);
      }

      // Process any enqueued synchronization tasks
      this.processSyncQueue();
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
    this.enqueueSync('user', 'upsert', user);
  }

  updateUser(id: string, updates: Partial<User>): void {
    const users = this.getUsers().map((u) => (u.id === id ? { ...u, ...updates } : u));
    this.saveUsers(users);
    const updated = users.find((u) => u.id === id);
    if (updated) {
      this.enqueueSync('user', 'upsert', updated);
    }
  }

  getDeletedUserIds(): string[] {
    return this.get<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
  }

  addDeletedUserId(identifier: string): void {
    if (!this.isClient || !identifier) return;
    const current = new Set(this.getDeletedUserIds().map((s) => String(s).toLowerCase()));
    current.add(String(identifier).toLowerCase());
    this.set(STORAGE_KEYS.DELETED_USER_IDS, Array.from(current));
  }

  isUserDeleted(id?: string, loginId?: string, sem?: number, sec?: string, roll?: number): boolean {
    const deleted = new Set(this.getDeletedUserIds().map((s) => String(s).toLowerCase()));
    if (id && deleted.has(String(id).toLowerCase())) return true;
    if (loginId && deleted.has(String(loginId).toLowerCase())) return true;
    if (sem != null && sec && roll != null) {
      const classKey = `sem${sem}-sec${sec}-roll${roll}`.toLowerCase();
      if (deleted.has(classKey)) return true;
    }
    return false;
  }

  deleteUser(id: string): void {
    const targetUser = this.getUsers().find((u) => u.id === id);
    const users = this.getUsers().filter((u) => u.id !== id);
    this.saveUsers(users);

    // Record tombstones to prevent zombie resurrection across background syncs
    this.addDeletedUserId(id);
    if (targetUser?.loginId) {
      this.addDeletedUserId(targetUser.loginId);
    }
    if (targetUser?.semester && targetUser?.section && targetUser?.rollNumber) {
      this.addDeletedUserId(
        `sem${targetUser.semester}-sec${targetUser.section}-roll${targetUser.rollNumber}`
      );
    }

    // Also remove any submissions associated with this student
    const submissions = this.getSubmissions().filter((s) => s.studentId !== id);
    this.saveSubmissions(submissions);

    // Enqueue cloud sync action
    this.enqueueSync('user', 'delete', {
      id,
      loginId: targetUser?.loginId,
      semester: targetUser?.semester,
      section: targetUser?.section,
      rollNumber: targetUser?.rollNumber,
    });

    // Also call server API in background to ensure database-level purge
    if (typeof window !== 'undefined') {
      fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: id,
          loginId: targetUser?.loginId,
          semester: targetUser?.semester,
          section: targetUser?.section,
          rollNumber: targetUser?.rollNumber,
        }),
      }).catch((err) => console.warn('Background delete student API call:', err));
    }
  }

  // Active User session
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
    this.enqueueSync('subject', 'upsert', subject);
  }

  updateSubject(id: string, updates: Partial<Subject>): void {
    const subjects = this.getSubjects().map((s) => (s.id === id ? { ...s, ...updates } : s));
    this.saveSubjects(subjects);
    const updated = subjects.find((s) => s.id === id);
    if (updated) {
      this.enqueueSync('subject', 'upsert', updated);
    }
  }

  deleteSubject(id: string): void {
    const subjects = this.getSubjects().filter((s) => s.id !== id);
    this.saveSubjects(subjects);
    this.enqueueSync('subject', 'delete', { id });
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
    this.enqueueSync('assignment', 'upsert', assignment);
  }

  deleteAssignment(id: string): void {
    const assignments = this.getAssignments().filter((a) => a.id !== id);
    this.saveAssignments(assignments);
    const submissions = this.getSubmissions().filter((s) => s.assignmentId !== id);
    this.saveSubmissions(submissions);

    this.enqueueSync('assignment', 'delete', { id });
    for (const sub of submissions) {
      this.enqueueSync('submission', 'delete', { id: sub.id });
    }
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
      submissions[idx] = submission;
    } else {
      submissions.push(submission);
    }
    this.saveSubmissions(submissions);
    this.enqueueSync('submission', 'upsert', submission);
  }

  // Reset all to fresh defaults (Explicit Admin Action)
  resetToDefaults(): void {
    if (!this.isClient) return;
    this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.set(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    this.set(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    this.set(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    this.saveSyncQueue([]);
    this.setActiveUserId(null);
  }
}

export const dataStore = new LocalDataStore();
