'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, SemesterNumber, Section } from '@/types';
import { dataStore } from '@/lib/storage';

interface LoginResult {
  success: boolean;
  message?: string;
  user?: User;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  switchUser: (userId: string) => void;
  login: (identifier: string, password: string) => LoginResult;
  registerStudent: (data: {
    name: string;
    fatherName: string;
    rollNumber: number;
    semester: SemesterNumber;
    section: Section;
    password: string;
  }) => {
    success: boolean;
    user?: User;
    generatedLoginId?: string;
    message?: string;
  };
  createTeacherByAdmin: (data: {
    name: string;
    phone: string;
    email: string;
    password: string;
    assignedCourses: import('@/types').TeacherCourseAssignment[];
    taughtSemester?: SemesterNumber;
    taughtSubjectId?: string;
    taughtSubjectName?: string;
  }) => User;
  approveTeacher: (teacherId: string) => void;
  rejectTeacher: (teacherId: string) => void;
  logout: () => void;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const loadData = () => {
    dataStore.init();
    const allUsers = dataStore.getUsers();
    setUsers(allUsers);
    const activeId = dataStore.getActiveUserId();
    if (activeId) {
      const found = allUsers.find((u) => u.id === activeId);
      setCurrentUser(found || null);
    } else {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    loadData();

    const handleStorageUpdate = () => {
      const allUsers = dataStore.getUsers();
      setUsers(allUsers);
      const activeId = dataStore.getActiveUserId();
      if (activeId) {
        const found = allUsers.find((u) => u.id === activeId);
        setCurrentUser(found || null);
      } else {
        setCurrentUser(null);
      }
    };

    window.addEventListener('lms_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('lms_storage_updated', handleStorageUpdate);
  }, []);

  const switchUser = (userId: string) => {
    dataStore.setActiveUserId(userId);
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  // Intelligent Multi-Role Unified Login Validator
  const login = (identifier: string, password: string): LoginResult => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPhone = identifier.trim().replace(/[-\s]/g, '');

    let found = users.find((u) => {
      const matchLoginId = u.loginId?.toLowerCase() === cleanId;
      const matchEmail = u.email?.toLowerCase() === cleanId;
      const matchPhone = u.phone?.replace(/[-\s]/g, '') === cleanPhone;
      const matchRoleAdmin = (cleanId === 'admin' || cleanId === 'admin@college.edu') && u.role === 'admin';
      return matchLoginId || matchEmail || matchPhone || matchRoleAdmin;
    });

    // Fail-safe for master admin if local storage is from an earlier session
    if (!found && (cleanId === 'admin' || cleanId === 'admin@college.edu')) {
      const adminUser: User = {
        id: 'usr-admin',
        loginId: 'admin',
        name: 'Prof. Dr. Tariq Mahmood',
        email: 'admin@college.edu',
        password: 'admin123',
        phone: '03009999999',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      dataStore.addUser(adminUser);
      found = adminUser;
    }

    if (!found) {
      return {
        success: false,
        message: 'Invalid User ID or password.',
      };
    }

    const isPassValid =
      found.password === password || (cleanId === 'admin' && password === 'admin123');
    if (!isPassValid) {
      return {
        success: false,
        message: 'Invalid User ID or password.',
      };
    }

    // Set active user session
    dataStore.setActiveUserId(found.id);
    setCurrentUser(found);
    return {
      success: true,
      user: found,
    };
  };

  // Student Self-Registration: Issues system-generated Login ID with strict duplicate check
  const registerStudent = (data: {
    name: string;
    fatherName: string;
    rollNumber: number;
    semester: SemesterNumber;
    section: Section;
    password: string;
  }) => {
    // 1. Validate roll number
    const rollNum = Number(data.rollNumber);
    if (!rollNum || isNaN(rollNum) || rollNum < 1 || !Number.isInteger(rollNum)) {
      return {
        success: false,
        message: 'Please enter a valid positive roll number (e.g., 1, 2, 3...).',
      };
    }

    if (rollNum > 250) {
      return {
        success: false,
        message: 'Roll number cannot exceed 250 for a section. Please enter your valid class roll number.',
      };
    }

    // 2. Strict check for duplicate roll number in the SAME class (Semester + Section)
    const currentUsers = dataStore.getUsers();
    const existingStudent = currentUsers.find(
      (u) =>
        u.role === 'student' &&
        Number(u.semester) === Number(data.semester) &&
        u.section === data.section &&
        Number(u.rollNumber) === rollNum
    );

    if (existingStudent) {
      return {
        success: false,
        message: `Roll Number ${rollNum} is already registered in Semester ${data.semester} (Section ${data.section}) to "${existingStudent.name}". Each student in a class must have a unique roll number. Please enter a valid, unassigned roll number or contact your teacher.`,
      };
    }

    // 3. Check for duplicate login ID
    const generatedLoginId = dataStore.generateStudentLoginId(data.semester, data.section, rollNum);
    const existingLogin = currentUsers.find(
      (u) => u.loginId?.toLowerCase() === generatedLoginId.toLowerCase()
    );
    if (existingLogin) {
      return {
        success: false,
        message: `An account with ID "${generatedLoginId}" already exists. If this is you, please log in with your credentials.`,
      };
    }

    const newUser: User = {
      id: `usr-stud-${Date.now()}`,
      loginId: generatedLoginId,
      name: data.name.trim(),
      fatherName: data.fatherName.trim(),
      email: `${generatedLoginId.toLowerCase()}@student.college.edu`,
      password: data.password,
      role: 'student',
      rollNumber: rollNum,
      semester: data.semester,
      section: data.section,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${generatedLoginId}`,
      createdAt: new Date().toISOString(),
    };

    dataStore.addUser(newUser);
    setUsers(dataStore.getUsers());
    return { success: true, user: newUser, generatedLoginId };
  };

  // Admin Adds/Creates Teacher Account with 2-Step Multi-Course & Multi-Section Mapping
  const createTeacherByAdmin = (data: {
    name: string;
    phone: string;
    email: string;
    password: string;
    assignedCourses: import('@/types').TeacherCourseAssignment[];
    taughtSemester?: SemesterNumber;
    taughtSubjectId?: string;
    taughtSubjectName?: string;
  }): User => {
    // Generate summarized taught subject string
    const summary = data.assignedCourses.length > 0
      ? data.assignedCourses.map((c) => `${c.subjectCode} (${c.sections.join(', ')})`).join(', ')
      : data.taughtSubjectName || 'General Faculty';

    const primarySem = data.assignedCourses[0]?.semester || data.taughtSemester || 1;
    const primarySubId = data.assignedCourses[0]?.subjectId || data.taughtSubjectId;

    const newUser: User = {
      id: `usr-teach-${Date.now()}`,
      loginId: data.phone.trim(),
      phone: data.phone.trim(),
      name: data.name.trim(),
      email: data.email.trim() || `${data.phone.trim()}@college.edu`,
      password: data.password.trim(),
      role: 'teacher',
      status: 'approved', // Pre-approved when created directly by the admin
      taughtSemester: primarySem,
      taughtSubjectId: primarySubId,
      taughtSubjectName: summary,
      assignedCourses: data.assignedCourses,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
      createdAt: new Date().toISOString(),
    };

    dataStore.addUser(newUser);
    setUsers(dataStore.getUsers());
    return newUser;
  };

  const approveTeacher = (teacherId: string) => {
    dataStore.updateUser(teacherId, { status: 'approved' });
    setUsers(dataStore.getUsers());
  };

  const rejectTeacher = (teacherId: string) => {
    dataStore.updateUser(teacherId, { status: 'rejected' });
    setUsers(dataStore.getUsers());
  };

  const logout = () => {
    dataStore.setActiveUserId(null);
    setCurrentUser(null);
  };

  const refreshUsers = () => {
    setUsers(dataStore.getUsers());
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        switchUser,
        login,
        registerStudent,
        createTeacherByAdmin,
        approveTeacher,
        rejectTeacher,
        logout,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
