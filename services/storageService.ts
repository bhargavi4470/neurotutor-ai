import { User, QuizResult, Badge, SubjectSyllabus } from '../types';
import { MOCK_USERS, AVAILABLE_BADGES } from '../constants';

const USERS_KEY = 'neurotutor_users';
const CURRENT_USER_KEY = 'neurotutor_current_user';
const QUIZ_HISTORY_KEY = 'neurotutor_quiz_history';
const CHAT_PREFIX = 'neurotutor_chat_';

// Initialize with mock data if empty
if (!localStorage.getItem(USERS_KEY)) {
  localStorage.setItem(USERS_KEY, JSON.stringify(MOCK_USERS));
}

export const StorageService = {
  getUsers: (): User[] => {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  registerUser: (name: string, email: string, password: string): User | null => {
    const users = StorageService.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return null;
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      password,
      isNewUser: true, // Triggers onboarding
      subjectPerformance: {},
      mastery: {},
      streak: 0,
      badges: [],
      preferences: { darkMode: false }
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  authenticate: (email: string, password: string): User | null => {
    const users = StorageService.getUsers();
    const user = users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      (u.password === password || (!u.password && password === ''))
    );
    
    if (user) {
      // Update streak logic on login
      const now = Date.now();
      const lastLogin = user.lastLoginDate || 0;
      const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        user.streak += 1;
        // Check badge
        if (user.streak === 3) StorageService.unlockBadge(user, 'on_fire');
      } else if (diffDays > 1) {
        user.streak = 1; // Reset if missed a day
      }
      
      user.lastLoginDate = now;
      StorageService.updateUser(user);
    }
    
    return user || null;
  },

  updateUser: (updatedUser: User) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      
      const current = StorageService.getCurrentUser();
      if (current && current.id === updatedUser.id) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
      }
    }
  },

  updateUserMastery: (userId: string, topic: string, increment: number) => {
    const user = StorageService.getUsers().find(u => u.id === userId);
    if (user) {
      const current = user.mastery[topic] || 0;
      user.mastery[topic] = Math.min(1, current + increment);
      StorageService.updateUser(user);
    }
  },

  unlockBadge: (user: User, badgeId: string) => {
    if (user.badges.some(b => b.id === badgeId)) return;
    
    const badge = AVAILABLE_BADGES.find(b => b.id === badgeId);
    if (badge) {
      user.badges.push({ ...badge, unlockedAt: Date.now() });
      StorageService.updateUser(user);
    }
  },

  saveQuizResult: (userId: string, result: QuizResult) => {
    const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '[]');
    history.push({ ...result, userId });
    localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(history));
  },

  saveChatHistory: (userId: string, messages: any[]) => {
    localStorage.setItem(`${CHAT_PREFIX}${userId}`, JSON.stringify(messages));
  },

  getChatHistory: (userId: string): any[] => {
    const history = localStorage.getItem(`${CHAT_PREFIX}${userId}`);
    return history ? JSON.parse(history) : [];
  },

  saveSyllabus: (userId: string, syllabus: SubjectSyllabus[]) => {
    const user = StorageService.getUsers().find(u => u.id === userId);
    if (user) {
      user.syllabus = syllabus;
      StorageService.updateUser(user);
    }
  }
};