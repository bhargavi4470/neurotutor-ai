
export type GradeLevel =
  | 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4' | 'Class 5'
  | 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10';

export type Stream = 'MPC' | 'BiPC' | 'CEC' | 'MEC' | 'None';

export interface Badge {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
  unlockedAt?: number;
}

export interface TopicStatus {
  id: string;
  name: string;
  status: 'locked' | 'unlocked' | 'completed';
  score?: number;
  description?: string; // Short description for the flowchart
}

export interface SubjectSyllabus {
  subject: string;
  topics: TopicStatus[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  profilePic?: string; // Base64 encoded image
  password?: string;
  grade?: GradeLevel;
  stream?: Stream;
  // Performance map: Subject -> 'Good' | 'Moderate' | 'Weak'
  subjectPerformance: { [subject: string]: 'Good' | 'Moderate' | 'Weak' };
  weakSubjects?: string[]; // Kept for backward compatibility
  mastery: { [topic: string]: number };
  streak: number;
  lastLoginDate?: number;
  badges: Badge[];
  syllabus?: SubjectSyllabus[];
  isNewUser: boolean;
  preferences: {
    darkMode: boolean;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  timestamp: number;
  isEli5?: boolean;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  subject?: string; // Added subject for diagnostic categorization
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  topic: string;
  timestamp: number;
}
