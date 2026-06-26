
import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, MessageCircle, LayoutDashboard, LogOut, BrainCircuit, TrendingUp,
  Image as ImageIcon, Mic, Send, CheckCircle, XCircle, Menu, X, User as UserIcon,
  Award, Sparkles, Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, RefreshCw,
  Sun, Moon, Upload, PlayCircle, FileText, Settings, Camera, Check, ChevronRight, Edit2,
  Video, MonitorPlay, Plus, Wand2, FileUp, BarChart3, GraduationCap
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

import { User, Message, QuizQuestion, GradeLevel, Stream, TopicStatus, SubjectSyllabus, Badge } from './types';
import { StorageService } from './services/storageService';
import { GeminiService } from './services/geminiService';
import { GRADES, SUBJECTS_PRIMARY, SUBJECTS_HIGH_SCHOOL, SUBJECTS_INTER_MPC, SUBJECTS_INTER_BIPC } from './constants';

// --- HELPER COMPONENTS ---

const usePasswordValidation = (password: string) => {
  const [isValid, setIsValid] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const errs = [];
    if (password.length < 8 || password.length > 36) errs.push("Must be 8-36 characters");
    if (!/[A-Z]/.test(password)) errs.push("Must contain 1 uppercase letter");
    if (!/[0-9]/.test(password)) errs.push("Must contain 1 number");
    if (!/[!@#$%^&*]/.test(password)) errs.push("Must contain 1 special character");

    setErrors(errs);
    setIsValid(errs.length === 0);
  }, [password]);

  return { isValid, errors };
};

// --- MAIN COMPONENTS ---

// 7. Add Subject Modal (Enhanced for Upload Syllabus & Camera)
const AddSubjectModal = ({ user, onClose, onAdd, allowExisting = false }: { user: User, onClose: () => void, onAdd: (u: User) => void, allowExisting?: boolean }) => {
  const [step, setStep] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const getAvailableSubjects = () => {
    let allSubjects: string[] = [];
    // Only High School or Primary logic needed now as Inter is removed
    const classNum = parseInt((user.grade || 'Class 10').split(' ')[1]);
    allSubjects = classNum <= 5 ? SUBJECTS_PRIMARY : SUBJECTS_HIGH_SCHOOL;

    if (allowExisting) return allSubjects;

    const existing = new Set(user.syllabus?.map(s => s.subject) || []);
    return allSubjects.filter(s => !existing.has(s));
  };

  const availableSubjects = getAvailableSubjects();

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  // Initialize video stream when camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please allow permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        stopCamera();
        handleGenerate('upload', base64Data);
      }
    }
  };

  const handleGenerate = async (method: 'auto' | 'upload', fileBase64?: string) => {
    setLoading(true);
    try {
      const topics = await GeminiService.generateSyllabus(user.grade || 'Class 10', selectedSubject, fileBase64);
      const mappedTopics = topics.map((t: any, i: number) => ({
        ...t,
        id: `t-${Date.now()}-${i}`,
        status: i === 0 ? 'unlocked' : 'locked',
        score: 0
      }));

      const newSyllabusItem: SubjectSyllabus = {
        subject: selectedSubject,
        topics: mappedTopics
      };

      let updatedSyllabus = user.syllabus ? [...user.syllabus] : [];
      const existingIndex = updatedSyllabus.findIndex(s => s.subject === selectedSubject);

      if (existingIndex !== -1) {
        updatedSyllabus[existingIndex] = newSyllabusItem;
      } else {
        updatedSyllabus.push(newSyllabusItem);
      }

      const updatedPerformance = { ...user.subjectPerformance };
      if (!updatedPerformance[selectedSubject]) {
        updatedPerformance[selectedSubject] = 'Moderate';
      }

      const updatedUser = {
        ...user,
        syllabus: updatedSyllabus,
        subjectPerformance: updatedPerformance,
        weakSubjects: [selectedSubject]
      };

      StorageService.updateUser(updatedUser);
      onAdd(updatedUser);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to generate subject. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleGenerate('upload', (reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">
            {step === 1 ? (allowExisting ? 'Select Subject' : 'Add New Subject') : `Setup ${selectedSubject}`}
          </h2>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-300">
              {allowExisting
                ? "Choose a subject to update or add syllabus."
                : "Choose a subject to add to your learning dashboard."}
            </p>
            {availableSubjects.length === 0 ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                You have added all available subjects for your grade!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                {availableSubjects.map(s => (
                  <button key={s} onClick={() => { setSelectedSubject(s); setStep(2); }}
                    className="p-4 text-left border rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:border-slate-700 dark:text-slate-200 transition group">
                    <span className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{s}</span>
                    {allowExisting && user.syllabus?.some(sub => sub.subject === s) && (
                      <span className="block text-[10px] text-green-600 dark:text-green-400 font-medium mt-1">● Added</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {!isCameraActive && <p className="text-slate-600 dark:text-slate-300">How should we build the syllabus for {selectedSubject}?</p>}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-slate-500">Generating your learning path...</p>
              </div>
            ) : isCameraActive ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3] w-full">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-between items-center px-4">
                  <button onClick={stopCamera} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Cancel</button>
                  <button onClick={captureImage} className="w-14 h-14 bg-white rounded-full border-4 border-slate-200 ring-2 ring-indigo-500 hover:scale-105 transition shadow-lg"></button>
                  <div className="w-10"></div> {/* Spacer for centering */}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleGenerate('auto')} className="flex items-center gap-4 p-4 border-2 border-indigo-100 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition text-left group">
                  <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full text-indigo-600 dark:text-indigo-400">
                    <Wand2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Auto-Recommend</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">AI generates topics based on grade.</p>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition text-center group">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-full text-slate-600 dark:text-slate-400">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Upload File</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Image of syllabus</p>
                    </div>
                  </button>

                  <button onClick={startCamera} className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition text-center group">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-full text-slate-600 dark:text-slate-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Take Photo</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Scan via Camera</p>
                    </div>
                  </button>
                </div>

                <input type="file" ref={fileRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
            )}

            {!loading && !isCameraActive && (
              <button onClick={() => setStep(1)} className="text-slate-500 text-sm hover:underline mt-4 block mx-auto">
                Back to subjects
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


// 8. Edit Profile Modal
const EditProfileModal = ({ user, onClose, onUpdate }: { user: User, onClose: () => void, onUpdate: (u: User) => void }) => {
  const [name, setName] = useState(user.name);
  const [grade, setGrade] = useState<GradeLevel>(user.grade || 'Class 10');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(user.profilePic);

  const handleSave = () => {
    setLoading(true);
    const updatedUser = { ...user, name, grade, profilePic: preview };
    StorageService.updateUser(updatedUser);
    onUpdate(updatedUser);
    setLoading(false);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">Edit Profile</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 mb-3">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-inner bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              {preview ? <img src={`data:image/jpeg;base64,${preview}`} className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10 text-slate-400" />}
            </div>
            <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition">
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={fileRef} hidden accept="image/*" onChange={handleFileUpload} />
          </div>
          <p className="text-sm text-slate-500">Tap icon to change photo</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Class</label>
            <div className="grid grid-cols-3 gap-2">
              {GRADES.map(g => (
                <button key={g} onClick={() => setGrade(g)} className={`px-2 py-2 text-xs rounded-lg border transition ${grade === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};


// 2. Onboarding Wizard (Refactored: Split steps for Class and Subject)
const OnboardingWizard = ({ user, onComplete }: { user: User, onComplete: (u: User) => void }) => {
  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState<GradeLevel>(user.grade || 'Class 10');
  const [weakSubject, setWeakSubject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: number }>({});
  const [analysis, setAnalysis] = useState<{
    good: string[];
    moderate: string[];
    weak: string[];
  } | null>(null);
  const [finalUser, setFinalUser] = useState<User | null>(null);

  // Determine available subjects based on grade
  const getSubjects = () => {
    // Inter logic removed
    const classNum = parseInt(grade.split(' ')[1]);
    if (classNum <= 5) return SUBJECTS_PRIMARY;
    return SUBJECTS_HIGH_SCHOOL;
  };

  const subjects = getSubjects();

  const handleClassSelection = () => {
    setStep(2);
  };

  const startDiagnostic = async () => {
    setLoading(true);
    setStep(3); // Move to quiz view
    const questions = await GeminiService.generateDiagnosticQuiz(grade, weakSubject);
    setQuizQuestions(questions);
    setLoading(false);
  };

  const submitQuiz = async () => {
    setLoading(true);

    // Calculate performance per subject
    const subjectStats: { [key: string]: { total: number, correct: number } } = {};

    quizQuestions.forEach((q, idx) => {
      const subject = weakSubject || q.subject || 'General';
      if (!subjectStats[subject]) subjectStats[subject] = { total: 0, correct: 0 };

      subjectStats[subject].total++;
      if (quizAnswers[idx] === q.correctIndex) {
        subjectStats[subject].correct++;
      }
    });

    const good: string[] = [];
    const moderate: string[] = [];
    const weak: string[] = [];
    const performanceMap: any = {};

    Object.keys(subjectStats).forEach(subj => {
      const score = (subjectStats[subj].correct / subjectStats[subj].total) * 100;
      if (score >= 80) {
        good.push(subj);
        performanceMap[subj] = 'Good';
      } else if (score >= 50) {
        moderate.push(subj);
        performanceMap[subj] = 'Moderate';
      } else {
        weak.push(subj);
        performanceMap[subj] = 'Weak';
      }
    });

    let primaryWeak = weak.length > 0 ? weak[0] : (moderate.length > 0 ? moderate[0] : (weakSubject || good[0] || 'Mathematics'));

    setAnalysis({ good, moderate, weak });

    const updatedUser: User = {
      ...user,
      grade,
      subjectPerformance: performanceMap,
      weakSubjects: [primaryWeak],
      isNewUser: false,
      badges: [{ id: 'first_step', name: 'First Step', icon: 'Footprints', description: 'Completed diagnostic', unlockedAt: Date.now() }]
    };
    StorageService.updateUser(updatedUser);
    setFinalUser(updatedUser);

    setLoading(false);
    setStep(4); // Result screen
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 transition-colors border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold dark:text-white">Welcome, {user.name}!</h2>
              <p className="text-slate-600 dark:text-slate-300">Let's set up your profile to personalize your learning.</p>
            </div>

            {/* Grade Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Select Class</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GRADES.map((g) => (
                  <button key={g} onClick={() => { setGrade(g); setWeakSubject(''); }}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${grade === g ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleClassSelection} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all mt-4">
              Next Step <ArrowRight className="inline-block w-4 h-4 ml-2" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => setStep(1)} className="text-slate-400 hover:text-indigo-600 text-sm flex items-center gap-1 mb-2">
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to Class Selection
            </button>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold dark:text-white">Customize for {grade}</h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Knowing your weak spots helps us build a better plan.</p>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Which subject is hardest for you?</label>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map(s => (
                  <button key={s} onClick={() => setWeakSubject(s)}
                    className={`p-4 rounded-xl border text-sm font-medium transition-all ${weakSubject === s ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200' : 'border-slate-200 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startDiagnostic} disabled={!weakSubject} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all mt-4">
              Start Diagnostic Quiz
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center dark:text-white">Assessment: {weakSubject}</h2>
            {loading ? (
              <div className="text-center py-10"><div className="animate-spin w-10 h-10 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto"></div><p className="mt-4 dark:text-white">Preparing questions for you...</p></div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                {quizQuestions.map((q, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-indigo-500 uppercase">{q.subject || weakSubject}</span>
                    </div>
                    <p className="font-medium mb-3 dark:text-white">{idx + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt: string, optIdx: number) => (
                        <label key={optIdx} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600">
                          <input type="radio" name={`q-${idx}`} onChange={() => setQuizAnswers({ ...quizAnswers, [idx]: optIdx })} className="text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-slate-700 dark:text-slate-300 text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && (
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                <button onClick={submitQuiz} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium">Submit Assessment</button>
              </div>
            )}
          </div>
        )}

        {step === 4 && analysis && (
          <div className="text-center py-4 space-y-6">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold dark:text-white">Analysis Complete</h2>

            <div className="grid grid-cols-1 gap-4 text-left">
              {analysis.good.includes(weakSubject) && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                  <p className="font-bold text-green-700 dark:text-green-400 mb-1">Great Job!</p>
                  <p className="text-sm text-green-800 dark:text-green-300">You have a strong foundation in {weakSubject}. We'll advance you to tougher topics.</p>
                </div>
              )}
              {analysis.moderate.includes(weakSubject) && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-800">
                  <p className="font-bold text-yellow-700 dark:text-yellow-400 mb-1">Good Start</p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">You know the basics of {weakSubject}, but there's room to grow.</p>
                </div>
              )}
              {analysis.weak.includes(weakSubject) && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                  <p className="font-bold text-red-700 dark:text-red-400 mb-1">Focus Area</p>
                  <p className="text-sm text-red-800 dark:text-red-300">We've identified gaps in {weakSubject}. We'll start from the beginning to build your confidence.</p>
                </div>
              )}
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-sm">
              Ready to master <span className="font-bold text-indigo-600 dark:text-indigo-400">{weakSubject}</span>?
            </p>

            <button onClick={() => onComplete(finalUser || user)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold transition shadow-lg w-full">
              Go to Learning Path
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 6. Learning Flowchart View (Enhanced with Subject Tabs and Stats)
const LearningFlowchart = ({ user, onUpdateUser }: { user: User, onUpdateUser: (u: User) => void }) => {
  const focusSubject = user.weakSubjects?.[0] || 'Mathematics';

  // Find syllabus for the focused subject or fallback to first available
  const activeSyllabus = user.syllabus?.find(s => s.subject === focusSubject) || user.syllabus?.[0];

  const [syllabus, setSyllabus] = useState<TopicStatus[]>(activeSyllabus?.topics || []);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'flow' | 'tutoring' | 'quiz'>('flow');
  const [tutorialContent, setTutorialContent] = useState('');
  const [quizQuestion, setQuizQuestion] = useState<any>(null);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  const [activeTab, setActiveTab] = useState<'concept' | 'video'>('concept');

  // Quiz State
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // Update syllabus when user/focusSubject changes
  useEffect(() => {
    const s = user.syllabus?.find(s => s.subject === focusSubject) || user.syllabus?.[0];
    if (s) {
      setSyllabus(s.topics);
      setShowSyllabusModal(false);
    } else {
      setSyllabus([]);
      setShowSyllabusModal(true); // Only show if absolutely no syllabus found for the active choice
    }
  }, [user.syllabus, focusSubject]);

  const handleSwitchSubject = (subject: string) => {
    const updated = { ...user, weakSubjects: [subject] };
    StorageService.updateUser(updated);
    onUpdateUser(updated);
  };

  const generateSyllabus = async (type: 'auto' | 'upload', fileBase64?: string) => {
    setLoading(true);
    setShowSyllabusModal(false);

    const topics = await GeminiService.generateSyllabus(user.grade!, focusSubject, fileBase64);
    const mappedTopics = topics.map((t: any, i: number) => ({ ...t, id: `t-${i}`, status: i === 0 ? 'unlocked' : 'locked' }));

    setSyllabus(mappedTopics);

    // Save, respecting multiple subjects structure
    const newSyllabusItem: SubjectSyllabus = { subject: focusSubject, topics: mappedTopics };
    let existingSyllabus = user.syllabus || [];
    // Remove old syllabus for this subject if exists, append new
    existingSyllabus = existingSyllabus.filter(s => s.subject !== focusSubject);
    existingSyllabus.push(newSyllabusItem);

    const updatedUser = { ...user, syllabus: existingSyllabus };
    StorageService.updateUser(updatedUser);
    onUpdateUser(updatedUser);
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => generateSyllabus('upload', (reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    }
  };

  const startTopic = async (topic: any) => {
    if (topic.status === 'locked') return;
    setSelectedTopic(topic);
    setMode('tutoring');
    setActiveTab('concept');
    setLoading(true);

    const [text, vidLink] = await Promise.all([
      GeminiService.generateTopicTutorial(user.grade!, focusSubject, topic.name),
      GeminiService.getVideoSearchQuery(topic.name, user.grade!)
    ]);

    setTutorialContent(text);
    setVideoLink(vidLink);
    setLoading(false);
  };

  const startQuiz = async () => {
    setMode('quiz');
    setLoading(true);
    setQuizSubmitted(false);
    setSelectedOption(null);
    const q = await GeminiService.generateQuizQuestion(selectedTopic.name);
    setQuizQuestion(q);
    setLoading(false);
  };

  const submitQuizAnswer = (idx: number) => {
    if (quizSubmitted) return;
    setSelectedOption(idx);
    setQuizSubmitted(true);
  };

  const handleQuizSuccess = () => {
    const newTopics = [...syllabus];
    const topicIndex = newTopics.findIndex(t => t.id === selectedTopic.id);

    if (topicIndex !== -1) {
      newTopics[topicIndex].status = 'completed';
      newTopics[topicIndex].score = 100; // Mark 100% on success for simple quiz
      if (topicIndex + 1 < newTopics.length) {
        newTopics[topicIndex + 1].status = 'unlocked';
      }
      setSyllabus(newTopics);

      // Save to storage
      const allSyllabus = user.syllabus?.map(s => {
        if (s.subject === focusSubject || (activeSyllabus && s.subject === activeSyllabus.subject)) {
          return { ...s, topics: newTopics };
        }
        return s;
      }) || [];

      const updatedUser = { ...user, syllabus: allSyllabus };
      StorageService.updateUser(updatedUser);
      onUpdateUser(updatedUser);
    }
    setMode('flow');
    setSelectedTopic(null);
    setQuizSubmitted(false);
    setSelectedOption(null);
  };

  const handleRetry = () => {
    setQuizSubmitted(false);
    setSelectedOption(null);
  };

  // Stats Logic
  const completedTopics = syllabus.filter(t => t.status === 'completed');
  const progress = syllabus.length > 0 ? (completedTopics.length / syllabus.length) * 100 : 0;
  const avgScore = completedTopics.length > 0
    ? completedTopics.reduce((acc, t) => acc + (t.score || 0), 0) / completedTopics.length
    : 0;
  const subjectStatus = user.subjectPerformance?.[focusSubject] || 'Moderate';

  if (mode === 'tutoring' || mode === 'quiz') {
    return (
      <div className="h-full p-6 overflow-y-auto bg-white dark:bg-slate-900">
        <button onClick={() => setMode('flow')} className="mb-4 text-slate-500 hover:text-indigo-600 flex items-center"><ArrowRight className="w-4 h-4 rotate-180 mr-2" /> Back to Learning Path</button>

        {loading ? <div className="text-center py-20 dark:text-white">Loading content...</div> : (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-2 dark:text-white">{selectedTopic.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Subject: {focusSubject}</p>

            {mode === 'tutoring' && (
              <>
                <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                  <button onClick={() => setActiveTab('concept')} className={`px-6 py-3 font-medium transition ${activeTab === 'concept' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Concept</button>
                  <button onClick={() => setActiveTab('video')} className={`px-6 py-3 font-medium transition ${activeTab === 'video' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Video Lesson</button>
                </div>

                {activeTab === 'concept' ? (
                  <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-2xl border dark:border-slate-700">
                    <div className="prose dark:prose-invert lg:prose-lg max-w-none">
                      <div className="whitespace-pre-wrap">{tutorialContent}</div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <button onClick={startQuiz} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2">
                        Take Quiz <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-2xl border dark:border-slate-700 text-center">
                    <div className="mb-6 mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center">
                      <MonitorPlay className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold dark:text-white mb-2">Watch Video Tutorial</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">We've found the best video resources for <strong>{selectedTopic.name}</strong>.</p>

                    <a href={videoLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-700 transition shadow-lg">
                      <PlayCircle className="w-5 h-5" /> Watch on YouTube
                    </a>
                    <p className="mt-4 text-xs text-slate-400">Opens in a new tab</p>
                  </div>
                )}
              </>
            )}

            {mode === 'quiz' && quizQuestion && (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-2xl mx-auto">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2 block">Quick Check</span>
                <p className="text-xl font-medium mb-8 dark:text-white leading-relaxed">{quizQuestion.question}</p>
                <div className="space-y-3">
                  {quizQuestion.options.map((o: string, i: number) => {
                    let btnClass = "w-full text-left p-4 border rounded-xl transition-all duration-200 flex justify-between items-center ";
                    if (quizSubmitted) {
                      if (i === quizQuestion.correctIndex) btnClass += "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300 ring-1 ring-green-500 shadow-md scale-[1.01] ";
                      else if (i === selectedOption) btnClass += "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300 ring-1 ring-red-500 shadow-md ";
                      else btnClass += "opacity-50 grayscale bg-slate-50 dark:bg-slate-800 dark:border-slate-700 ";
                    } else {
                      btnClass += "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:border-indigo-300 dark:text-slate-200 ";
                    }
                    return (
                      <button key={i} onClick={() => submitQuizAnswer(i)} disabled={quizSubmitted} className={btnClass}>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-400">{String.fromCharCode(65 + i)}.</span>
                          <span className="font-medium">{o}</span>
                        </div>
                        {quizSubmitted && i === quizQuestion.correctIndex && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
                        {quizSubmitted && i === selectedOption && i !== quizQuestion.correctIndex && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                      </button>
                    );
                  })}
                </div>

                {quizSubmitted && (
                  <div className={`mt-6 p-6 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${selectedOption === quizQuestion.correctIndex ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 p-2 rounded-full shrink-0 ${selectedOption === quizQuestion.correctIndex ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {selectedOption === quizQuestion.correctIndex ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold mb-2 text-lg ${selectedOption === quizQuestion.correctIndex ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                          {selectedOption === quizQuestion.correctIndex ? 'Correct Answer!' : 'Incorrect'}
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                          {quizQuestion.explanation || "Review the concept to understand why."}
                        </p>

                        {selectedOption === quizQuestion.correctIndex ? (
                          <button onClick={handleQuizSuccess} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none transition flex items-center gap-2">
                            Continue to Next Topic <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            <button onClick={handleRetry} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 transition shadow-lg shadow-indigo-200 dark:shadow-none">
                              <RefreshCw className="w-4 h-4" /> Try Again
                            </button>
                            <button onClick={() => setMode('tutoring')} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-6 py-2.5 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                              Review Concept
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-6 pt-20 pb-8 md:pt-24 md:pb-10 overflow-y-auto relative bg-slate-50 dark:bg-slate-900 ml-5 no-scrollbar">

      {showSyllabusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2 dark:text-white">Start Learning {focusSubject}</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-8">How would you like to build your learning path?</p>

            <div className="space-y-4">
              <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group">
                <Camera className="w-6 h-6 text-indigo-600" />
                <div className="text-left">
                  <span className="block font-bold text-slate-800 dark:text-white">Upload Syllabus Photo</span>
                  <span className="text-xs text-slate-500">Scan your textbook index or paper</span>
                </div>
              </button>
              <input type="file" ref={fileRef} hidden accept="image/*" capture="environment" onChange={handleFileUpload} />

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-800 px-2 text-slate-400">OR</span></div>
              </div>

              <button onClick={() => generateSyllabus('auto')} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg">
                Auto-Generate Topics (Recommended)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Tabs Header */}
      <div className="flex items-center gap-3 mb-8 mt-2 overflow-x-auto py-6 px-1 no-scrollbar">
        {user.syllabus?.map(s => (
          <button
            key={s.subject}
            onClick={() => handleSwitchSubject(s.subject)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${focusSubject === s.subject ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            {s.subject}
          </button>
        ))}
        <button
          onClick={() => setShowAddSubject(true)}
          className="px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* Current Subject Stats Card */}
      {syllabus.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold dark:text-white flex items-center justify-center md:justify-start gap-3">
                {focusSubject}
                <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold ${subjectStatus === 'Good' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : subjectStatus === 'Moderate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {subjectStatus}
                </span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                You have completed <strong>{completedTopics.length}</strong> of <strong>{syllabus.length}</strong> topics.
              </p>
            </div>

            <div className="flex gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{Math.round(progress)}%</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Completion</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{Math.round(avgScore)}%</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Avg Score</p>
              </div>
            </div>
          </div>

          <div className="mt-6 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="dark:text-white animate-pulse">Building your learning path...</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto w-full pb-20">
          {syllabus.map((topic, index) => (
            <div key={topic.id} className="relative flex gap-6 group">
              {index !== syllabus.length - 1 && (
                <div className={`absolute left-5 top-10 w-1 h-full ${topic.status === 'completed' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
              )}

              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${topic.status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                topic.status === 'unlocked' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' :
                  'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'
                }`}>
                {topic.status === 'completed' ? <Check className="w-5 h-5" /> :
                  topic.status === 'unlocked' ? <PlayCircle className="w-5 h-5" /> :
                    <Lock className="w-4 h-4" />}
              </div>

              <div onClick={() => startTopic(topic)}
                className={`flex-1 mb-8 p-6 rounded-2xl border transition cursor-pointer relative overflow-hidden ${topic.status === 'locked'
                  ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60 pointer-events-none'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-lg dark:hover:border-indigo-500 transform hover:-translate-y-1'
                  }`}>
                {topic.status === 'unlocked' && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wider">Current</div>}

                <h3 className={`font-bold text-lg ${topic.status === 'locked' ? 'text-slate-500' : 'text-slate-800 dark:text-white'}`}>{topic.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{topic.description}</p>

                {topic.status !== 'locked' && (
                  <div className="mt-4 flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                    Start Lesson <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                )}
              </div>
            </div>
          ))}
          {syllabus.length === 0 && !loading && (
            <div className="text-center text-slate-400 py-10">No topics found. Please regenerate syllabus.</div>
          )}
        </div>
      )}

      {showAddSubject && <AddSubjectModal user={user} onClose={() => setShowAddSubject(false)} onAdd={onUpdateUser} />}
    </div>
  );
};

// 3. Auth Screen
const AuthScreen = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { isValid, errors } = usePasswordValidation(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const user = StorageService.authenticate(email, password);
      if (user) onLogin(user);
      else setError('Invalid credentials');
    } else {
      if (!isValid) return;
      const user = StorageService.registerUser(name, email, password);
      if (user) onLogin(user);
      else setError('User already exists');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold dark:text-white">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-slate-500">Your AI-powered learning companion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500" required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500" required />
            {!isLogin && errors.length > 0 && (
              <div className="mt-2 space-y-1">
                {errors.map((err, i) => <p key={i} className="text-xs text-red-500 flex items-center"><XCircle className="w-3 h-3 mr-1" />{err}</p>)}
              </div>
            )}
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none">
            {isLogin ? 'Sign In' : 'Get Started'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 font-medium hover:underline">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. Chat Interface
const ChatInterface = ({ user }: { user: User }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    // Load history
    const history = StorageService.getChatHistory(user.id);
    if (history.length > 0) setMessages(history);
    else {
      setMessages([{
        id: 'welcome', role: 'model', text: `Hi ${user.name}! I'm your AI tutor. Ask me anything about your subjects, upload a math problem, or ask for an explanation!`, timestamp: Date.now()
      }]);
    }
  }, [user.id, user.name]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    if ((!input.trim() && !image) || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: image || undefined,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setImage(null);
    setLoading(true);

    // Generate Context String
    const progressContext = `
      Current Streak: ${user.streak} days.
      Mastery Points: ${Object.values(user.mastery).reduce((a, b) => a + b, 0)}.
      Learning Path Progress:
      ${user.syllabus?.map(s => {
      const completed = s.topics.filter(t => t.status === 'completed').length;
      const total = s.topics.length;
      return `- ${s.subject}: ${completed}/${total} topics completed (${Math.round(completed / total * 100)}%)`;
    }).join('\n      ')}
    `;

    // Call Gemini
    const responseText = await GeminiService.explainConcept(
      userMsg.text,
      messages.slice(-5), // Context window
      userMsg.image || null,
      'General Query',
      user.grade || 'Class 10',
      progressContext
    );

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    const finalMessages = [...newMessages, botMsg];
    setMessages(finalMessages);
    StorageService.saveChatHistory(user.id, finalMessages);
    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'}`}>
              {msg.image && (
                <img src={`data:image/png;base64,${msg.image}`} alt="User upload" className="max-w-full h-auto rounded-lg mb-2" />
              )}
              <div className="whitespace-pre-wrap markdown-body text-sm leading-relaxed">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        {image && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg w-fit">
            <span className="text-xs text-slate-500">Image attached</span>
            <button onClick={() => setImage(null)} className="text-slate-500 hover:text-red-500"><XCircle className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition">
            <ImageIcon className="w-6 h-6" />
          </button>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={handleImageUpload} />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a doubt..."
            className="flex-1 bg-slate-100 dark:bg-slate-700 border-0 rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />

          <button onClick={handleSend} disabled={loading || (!input && !image)} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-200 dark:shadow-none">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 5. Progress Dashboard
const ProgressDashboard = ({ user, onNavigate }: { user: User, onNavigate: (view: 'learn' | 'chat' | 'progress') => void }) => {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const data = Object.entries(user.subjectPerformance).map(([subject, perf]) => ({
    subject: subject.substring(0, 3),
    fullSubject: subject,
    A: perf === 'Good' ? 100 : perf === 'Moderate' ? 60 : 30,
    fullMark: 100
  }));

  const badges = user.badges || [];
  const weakSubject = Object.entries(user.subjectPerformance).find(([_, p]) => p === 'Weak')?.[0] || 'Mathematics';

  return (
    <div className="h-full p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900 scrollbar-hide">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Your Progress</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Performance Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.01] duration-300">
          <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Performance
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid stroke="#94a3b8" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="User" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }}
                  itemStyle={{ color: '#818cf8' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Streak Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-indigo-100 font-medium mb-1">Current Streak</p>
                <p className="text-4xl font-bold">{user.streak} Days</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg animate-pulse"><Sparkles className="w-6 h-6 text-white" /></div>
            </div>
            <p className="text-xs mt-4 text-indigo-200">Keep learning daily to maintain it!</p>
          </div>

          {/* Badges Count Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Badges Earned</p>
                <p className="text-4xl font-bold dark:text-white">{badges.length}</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg"><Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" /></div>
            </div>
            <p className="text-xs mt-4 text-slate-400">Unlock more by completing quizzes.</p>
          </div>

          {/* Recommended Focus */}
          <div onClick={() => onNavigate('learn')} className="col-span-2 bg-slate-900 dark:bg-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01] duration-300">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <BrainCircuit className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-500 text-xs px-2 py-0.5 rounded-full font-bold">RECOMMENDED FOCUS</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">Focus on {weakSubject}</h3>
              <p className="text-indigo-200 text-sm mb-4">Your performance suggests this needs a bit more attention.</p>
              <button className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors">
                Start Practice Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Collection */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4">Badges Collection</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {badges.map(b => (
            <div key={b.id} onClick={() => setSelectedBadge(b)} className="flex flex-col items-center min-w-[80px] cursor-pointer group">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-2 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800 transition-all">
                {/* Placeholder icons for now per badge type */}
                <Award className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-center text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{b.name}</span>
            </div>
          ))}
          {badges.length === 0 && <p className="text-sm text-slate-400">No badges yet. Complete your first quiz!</p>}
        </div>
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedBadge(null)}>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-12 h-12 text-yellow-600 dark:text-yellow-400 drop-shadow-sm" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedBadge.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">{selectedBadge.description}</p>
            <button onClick={() => setSelectedBadge(null)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};


// 10. Main App
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'learn' | 'chat' | 'progress'>('learn');
  const [showSyllabusUpload, setShowSyllabusUpload] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    const currentUser = StorageService.getCurrentUser();
    if (currentUser) setUser(currentUser);
  }, []);

  const handleUpdateUser = (updated: User) => {
    setUser(updated);
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setUser(null);
  };

  if (!user) return <AuthScreen onLogin={setUser} />;

  if (user.isNewUser) return <OnboardingWizard user={user} onComplete={handleUpdateUser} />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">

      {/* Sidebar */}
      <div className="w-20 lg:w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col items-center lg:items-stretch py-6 z-20">
        <div className="mb-8 px-4 flex justify-center lg:justify-start items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <span className="hidden lg:block font-bold text-xl tracking-tight">NeuroTutor</span>
        </div>

        {/* Profile Card */}
        <div className="mb-6 px-4 w-full">
          <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-2xl flex items-center gap-3 border border-slate-200 dark:border-slate-600">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
              {user.profilePic ? <img src={`data:image/jpeg;base64,${user.profilePic}`} className="w-full h-full object-cover" /> : user.name[0]}
            </div>
            <div className="flex-1 min-w-0 hidden lg:block">
              <p className="font-bold text-sm truncate dark:text-white">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user.grade}</p>
            </div>
            <button onClick={() => setShowEditProfile(true)} className="hidden lg:block p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3">
          <button onClick={() => setActiveView('learn')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeView === 'learn' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <LayoutDashboard className="w-6 h-6" />
            <span className="hidden lg:block">Learning Path</span>
          </button>
          <button onClick={() => setActiveView('chat')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeView === 'chat' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <MessageCircle className="w-6 h-6" />
            <span className="hidden lg:block">AI Tutor</span>
          </button>
          <button onClick={() => setActiveView('progress')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeView === 'progress' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <BarChart3 className="w-6 h-6" />
            <span className="hidden lg:block">Progress</span>
          </button>

          <div className="pt-2">
            <button onClick={() => setShowSyllabusUpload(true)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700`}>
              <FileUp className="w-6 h-6" />
              <span className="hidden lg:block">Upload Syllabus</span>
            </button>
          </div>
        </nav>

        <div className="px-3 mt-auto">
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all mb-2">
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            <span className="hidden lg:block">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all">
            <LogOut className="w-6 h-6" />
            <span className="hidden lg:block">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-hidden relative">
        {activeView === 'learn' && <LearningFlowchart user={user} onUpdateUser={handleUpdateUser} />}
        {activeView === 'chat' && <ChatInterface user={user} />}
        {activeView === 'progress' && <ProgressDashboard user={user} onNavigate={setActiveView} />}
      </div>

      {showEditProfile && <EditProfileModal user={user} onClose={() => setShowEditProfile(false)} onUpdate={handleUpdateUser} />}
      {showSyllabusUpload && <AddSubjectModal user={user} onClose={() => setShowSyllabusUpload(false)} onAdd={handleUpdateUser} allowExisting={true} />}

    </div>
  );
};

export default App;
