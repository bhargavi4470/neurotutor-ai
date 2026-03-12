
import { User, GradeLevel, Stream, Badge } from './types';

export const GRADES: GradeLevel[] = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'
];

export const STREAMS: Stream[] = ['MPC', 'BiPC', 'CEC', 'MEC'];

export const SUBJECTS_PRIMARY = ["Mathematics", "English", "Science", "Social Studies", "General Knowledge"];
export const SUBJECTS_HIGH_SCHOOL = ["Mathematics", "Physics", "Chemistry", "Biology", "Social Studies", "English"];
export const SUBJECTS_INTER_MPC = ["Mathematics A", "Mathematics B", "Physics", "Chemistry", "English"];
export const SUBJECTS_INTER_BIPC = ["Botany", "Zoology", "Physics", "Chemistry", "English"];

export const AVAILABLE_BADGES: Badge[] = [
  { id: 'first_step', name: 'First Step', icon: 'Footprints', description: 'Completed the diagnostic quiz' },
  { id: 'on_fire', name: 'On Fire', icon: 'Flame', description: 'Reached a 3-day streak' },
  { id: 'quiz_master', name: 'Quiz Master', icon: 'Trophy', description: 'Scored 100% on a topic quiz' },
  { id: 'scholar', name: 'Scholar', icon: 'GraduationCap', description: 'Completed 5 topics' },
];

export const MOCK_USERS: User[] = [
  {
    id: 'student-1',
    name: 'Alex Johnson',
    email: 'alex@school.com',
    password: 'Password1!',
    grade: 'Class 10',
    stream: 'None',
    subjectPerformance: { 'Mathematics': 'Weak' },
    mastery: { "Algebra": 0.3 },
    streak: 5,
    lastLoginDate: Date.now(),
    badges: [AVAILABLE_BADGES[0]],
    isNewUser: false,
    preferences: { darkMode: false }
  }
];
