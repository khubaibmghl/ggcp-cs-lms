'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, SemesterNumber, Section } from '@/types';
import { dataStore } from '@/lib/storage';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  switchUser: (userId: string) => void;
  login: (email: string) => boolean;
  registerStudent: (data: {
    name: string;
    email: string;
    rollNumber: number;
    semester: SemesterNumber;
    section: Section;
  }) => User;
  registerTeacher: (data: {
    name: string;
    email: string;
    taughtSemester: SemesterNumber;
    taughtSubjectId: string;
    taughtSubjectName: string;
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
    const found = allUsers.find((u) => u.id === activeId) || allUsers[1] || allUsers[0];
    setCurrentUser(found || null);
  };

  useEffect(() => {
    loadData();

    const handleStorageUpdate = () => {
      const allUsers = dataStore.getUsers();
      setUsers(allUsers);
      const activeId = dataStore.getActiveUserId();
      const found = allUsers.find((u) => u.id === activeId);
      if (found) setCurrentUser(found);
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

  const login = (email: string): boolean => {
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      switchUser(found.id);
      return true;
    }
    return false;
  };

  const registerStudent = (data: {
    name: string;
    email: string;
    rollNumber: number;
    semester: SemesterNumber;
    section: Section;
  }): User => {
    const newUser: User = {
      id: `usr-stud-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: 'student',
      rollNumber: data.rollNumber,
      semester: data.semester,
      section: data.section,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.rollNumber}`,
      createdAt: new Date().toISOString(),
    };
    dataStore.addUser(newUser);
    switchUser(newUser.id);
    return newUser;
  };

  const registerTeacher = (data: {
    name: string;
    email: string;
    taughtSemester: SemesterNumber;
    taughtSubjectId: string;
    taughtSubjectName: string;
  }): User => {
    const newUser: User = {
      id: `usr-teach-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: 'teacher',
      status: 'pending', // Starts in pending status waiting for admin approval
      taughtSemester: data.taughtSemester,
      taughtSubjectId: data.taughtSubjectId,
      taughtSubjectName: data.taughtSubjectName,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
      createdAt: new Date().toISOString(),
    };
    dataStore.addUser(newUser);
    switchUser(newUser.id);
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
    // switch to student or general view
    if (users.length > 0) {
      switchUser(users[0].id);
    }
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
        registerTeacher,
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
