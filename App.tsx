
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

import { User, Message, QuizQuestion, GradeLevel, Stream, TopicStatus, SubjectSyllabus } from './types';
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


// 2. Onboarding Wizard (Refactored: Split steps for Class and Subject)
const OnboardingWizard = ({ user, onComplete }: { user: User, onComplete: (u: User) => void }) => {
  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState<GradeLevel>(user.grade || 'Class 10');
  const [weakSubject, setWeakSubject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{[key: string]: number}>({});
  const [analysis, setAnalysis] = useState<{
    good: string[];
    moderate: string[];
    weak: string[];
  } | null>(null);
  
  const [finalUser, setFinalUser] = useState<User | null>(null);

  const getSubjects = () => {
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
    const subjectStats: {[key: string]: { total: number, correct: number }} = {};
    
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
                          <input type="radio" name={`q-${idx}`} onChange={() => setQuizAnswers({...quizAnswers, [idx]: optIdx})} className="text-indigo-600 focus:ring-indigo-500" />
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

        {step === 4 && analysis && finalUser && (
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

            <button onClick={() => onComplete(finalUser)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold transition shadow-lg w-full">
              Go to Learning Path
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 8. Learning Flowchart Component (Redesigned as per screenshot)
const LearningFlowchart = ({ user, onUpdateUser }: { user: User, onUpdateUser: (u: User) => void }) => {
  const [activeSubject, setActiveSubject] = useState<string>(user.weakSubjects?.[0] || user.syllabus?.[0]?.subject || '');
  const [selectedTopic, setSelectedTopic] = useState<TopicStatus | null>(null);
  const [mode, setMode] = useState<'map' | 'learn' | 'quiz'>('map');
  const [content, setContent] = useState('');
  const [quizQ, setQuizQ] = useState<any>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ((!user.syllabus || user.syllabus.length === 0) && !showAddSubject) {
       setShowAddSubject(true);
    } else if (user.syllabus && user.syllabus.length > 0 && !activeSubject) {
       setActiveSubject(user.syllabus[0].subject);
    }
  }, [user.syllabus]);

  const currentSyllabus = user.syllabus?.find(s => s.subject === activeSubject);
  const completedCount = currentSyllabus?.topics.filter(t => t.status === 'completed').length || 0;
  const totalCount = currentSyllabus?.topics.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const subjectPerformance = user.subjectPerformance[activeSubject] || 'Moderate';
  
  // Calculate Avg Score if needed, for now mock or simple calc
  const avgScore = totalCount > 0 ? 0 : 0; // Placeholder based on screenshots showing 0% initially

  const startLearning = async (topic: TopicStatus) => {
    setLoading(true);
    setSelectedTopic(topic);
    setMode('learn');
    try {
      const text = await GeminiService.generateTopicTutorial(user.grade || 'Class 10', activeSubject, topic.name);
      setContent(text);
    } catch (e) {
      setContent("Error loading tutorial.");
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (topic: TopicStatus) => {
    setLoading(true);
    setSelectedTopic(topic);
    setMode('quiz');
    setQuizFeedback(null);
    const q = await GeminiService.generateQuizQuestion(topic.name);
    setQuizQ(q);
    setLoading(false);
  };

  const handleQuizAnswer = (idx: number) => {
    if (!quizQ) return;
    const isCorrect = idx === quizQ.correctIndex;
    if (isCorrect) {
      setQuizFeedback("Correct! Great job.");
      if (selectedTopic && currentSyllabus) {
         const topicIdx = currentSyllabus.topics.findIndex(t => t.id === selectedTopic.id);
         if (topicIdx !== -1) {
            const updatedSyllabus = [...(user.syllabus || [])];
            const subjIndex = updatedSyllabus.findIndex(s => s.subject === activeSubject);
            const syllabusClone = { ...updatedSyllabus[subjIndex] };
            const topicsClone = [...syllabusClone.topics];
            
            topicsClone[topicIdx] = { ...topicsClone[topicIdx], status: 'completed', score: 100 };
            
            if (topicIdx < topicsClone.length - 1) {
              const nextTopic = topicsClone[topicIdx + 1];
              if (nextTopic.status === 'locked') {
                topicsClone[topicIdx + 1] = { ...nextTopic, status: 'unlocked' };
              }
            }
            
            syllabusClone.topics = topicsClone;
            updatedSyllabus[subjIndex] = syllabusClone;
            
            const updatedUser = { ...user, syllabus: updatedSyllabus };
            if (!updatedUser.mastery[selectedTopic.name]) updatedUser.mastery[selectedTopic.name] = 0;
            updatedUser.mastery[selectedTopic.name] = Math.min(1, updatedUser.mastery[selectedTopic.name] + 0.2);

            StorageService.updateUser(updatedUser);
            onUpdateUser(updatedUser);
         }
      }
    } else {
      setQuizFeedback(`Incorrect. ${quizQ.explanation}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 lg:p-10 overflow-hidden font-sans">
      {/* Subject Tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-1">
         {user.syllabus?.map(s => (
            <button 
              key={s.subject} 
              onClick={() => { setActiveSubject(s.subject); setMode('map'); }}
              className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeSubject === s.subject ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              {s.subject}
            </button>
         ))}
         <button onClick={() => setShowAddSubject(true)} className="pb-3 px-1 text-sm font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-700">
           <Plus className="w-4 h-4" /> Add Subject
         </button>
      </div>

      {mode === 'map' && (
        <>
          {/* Header Stats */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
             <div>
               <div className="flex items-center gap-3 mb-1">
                 <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{activeSubject}</h1>
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${subjectPerformance === 'Weak' ? 'bg-red-100 text-red-600' : subjectPerformance === 'Moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {subjectPerformance}
                 </span>
               </div>
               <p className="text-slate-500 text-sm">You have completed <span className="font-bold text-slate-700 dark:text-slate-300">{completedCount}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{totalCount}</span> topics.</p>
             </div>
             <div className="flex gap-8">
                <div className="text-center">
                   <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{progressPercent}%</div>
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completion</div>
                </div>
                <div className="text-center">
                   <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{avgScore}%</div>
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Score</div>
                </div>
             </div>
          </div>

          {/* Timeline Flowchart */}
          <div className="flex-1 overflow-y-auto pr-4 pb-20 relative">
             <div className="absolute left-[19px] top-4 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 z-0"></div>
             
             <div className="space-y-8 relative z-10">
               {!currentSyllabus ? (
                 <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                   <p className="text-slate-500">No syllabus generated yet.</p>
                 </div>
               ) : (
                 currentSyllabus.topics.map((topic, index) => {
                   const isCurrent = topic.status === 'unlocked';
                   const isLocked = topic.status === 'locked';
                   const isCompleted = topic.status === 'completed';

                   return (
                     <div key={topic.id} className="flex gap-6 items-start">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 z-10 ${isCurrent ? 'border-indigo-600 text-indigo-600' : isCompleted ? 'border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-300'}`}>
                           {isCurrent ? <PlayCircle className="w-5 h-5 fill-indigo-50" /> : isCompleted ? <Check className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                        </div>
                        
                        {/* Card */}
                        <div className={`flex-1 p-6 rounded-xl border transition-all ${isCurrent ? 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/30 shadow-md' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                           {isCurrent && (
                             <div className="flex justify-between items-start mb-2">
                               <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Current</span>
                             </div>
                           )}
                           
                           <h3 className={`font-bold text-lg mb-2 ${isLocked ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{topic.name}</h3>
                           <p className={`text-sm mb-4 leading-relaxed ${isLocked ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{topic.description}</p>
                           
                           {!isLocked && (
                             <button 
                               onClick={() => startLearning(topic)}
                               className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:underline"
                             >
                               Start Lesson <ChevronRight className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
        </>
      )}

      {mode === 'learn' && selectedTopic && (
        <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
           <button onClick={() => setMode('map')} className="text-sm text-slate-500 mb-6 hover:text-indigo-600 flex items-center gap-2 group">
             <div className="bg-slate-100 p-1.5 rounded-full group-hover:bg-indigo-50 transition"><ArrowRight className="w-4 h-4 rotate-180" /></div> Back to Path
           </button>
           
           <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
             <div className="mb-6 border-b border-slate-100 dark:border-slate-700 pb-6">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 block">{activeSubject}</span>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{selectedTopic.name}</h1>
             </div>
             
             {loading ? (
               <div className="py-20 flex flex-col items-center">
                 <div className="animate-spin w-10 h-10 border-4 border-indigo-500 rounded-full border-t-transparent mb-4"></div>
                 <p className="text-slate-500">Generating lesson content...</p>
               </div>
             ) : (
               <div className="prose dark:prose-invert prose-indigo max-w-none">
                 <div className="whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-300 leading-7">{content}</div>
               </div>
             )}
             
             {!loading && (
               <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                 <button onClick={() => startQuiz(selectedTopic)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2">
                   Take Topic Quiz <ArrowRight className="w-5 h-5" />
                 </button>
               </div>
             )}
           </div>
        </div>
      )}

      {mode === 'quiz' && selectedTopic && (
        <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
           <button onClick={() => setMode('map')} className="text-sm text-slate-500 mb-6 hover:text-indigo-600 flex items-center gap-2 group">
             <div className="bg-slate-100 p-1.5 rounded-full group-hover:bg-indigo-50 transition"><ArrowRight className="w-4 h-4 rotate-180" /></div> Quit Quiz
           </button>

           <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-100 dark:border-slate-700">
              {loading ? (
                <div className="py-20 flex flex-col items-center">
                   <div className="animate-spin w-10 h-10 border-4 border-indigo-500 rounded-full border-t-transparent mb-4"></div>
                   <p className="text-slate-500">Preparing question...</p>
                </div>
              ) : quizQ ? (
                <>
                  <div className="mb-6">
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Quiz Time</span>
                    <h3 className="text-xl font-bold mt-4 text-slate-900 dark:text-white leading-relaxed">{quizQ.question}</h3>
                  </div>

                  <div className="space-y-3">
                    {quizQ.options.map((opt: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => handleQuizAnswer(idx)} 
                        disabled={!!quizFeedback}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          quizFeedback 
                            ? (idx === quizQ.correctIndex 
                                ? 'bg-green-50 border-green-500 text-green-800' 
                                : 'bg-slate-50 border-slate-100 text-slate-400') 
                            : 'bg-white border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${quizFeedback && idx === quizQ.correctIndex ? 'bg-green-200 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="font-medium">{opt}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {quizFeedback && (
                    <div className={`mt-8 p-6 rounded-xl border ${quizFeedback.startsWith('Correct') ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-1 rounded-full ${quizFeedback.startsWith('Correct') ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                          {quizFeedback.startsWith('Correct') ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold mb-1">{quizFeedback.startsWith('Correct') ? 'Excellent!' : 'Not quite.'}</p>
                          <p className="text-sm opacity-90">{quizFeedback}</p>
                        </div>
                      </div>
                      <button onClick={() => setMode('map')} className={`mt-4 px-6 py-2 rounded-lg text-white font-bold text-sm ${quizFeedback.startsWith('Correct') ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        Continue
                      </button>
                    </div>
                  )}
                </>
              ) : <p>Error loading quiz.</p>}
           </div>
        </div>
      )}

      {showAddSubject && <AddSubjectModal user={user} onClose={() => setShowAddSubject(false)} onAdd={(u) => { onUpdateUser(u); setActiveSubject(u.syllabus?.[u.syllabus.length-1].subject || ''); }} />}
    </div>
  );
};

// 9. Chat Interface
const ChatInterface = ({ user }: { user: User }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hist = StorageService.getChatHistory(user.id);
    if(hist && hist.length > 0) setMessages(hist);
    else setMessages([{ id: '0', role: 'model', text: `Hi ${user.name}! I'm your AI tutor. Ask me anything about your subjects!`, timestamp: Date.now() }]);
  }, [user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    StorageService.saveChatHistory(user.id, messages);
  }, [messages, user.id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const responseText = await GeminiService.explainConcept(userMsg.text, messages.slice(-5), null, "General Query", user.grade || "Class 10");
    
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
              <div className="prose dark:prose-invert prose-sm max-w-none">
                 <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none flex gap-2 items-center">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
         <div className="flex gap-2">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..." 
              className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={handleSend} disabled={loading || !input.trim()} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition">
              <Send className="w-5 h-5" />
            </button>
         </div>
      </div>
    </div>
  );
};

// 10. Dashboard (Renamed from ProgressDashboard, Redesigned)
const Dashboard = ({ user, onViewChange }: { user: User, onViewChange: (view: 'dashboard' | 'learning' | 'chat') => void }) => {
  // Stats
  const focusSubject = user.weakSubjects?.[0] || 'Mathematics';
  const subjects = Object.keys(user.subjectPerformance);
  const weakAreas = subjects.filter(s => user.subjectPerformance[s] === 'Weak');
  const moderateAreas = subjects.filter(s => user.subjectPerformance[s] === 'Moderate');
  const goodAreas = subjects.filter(s => user.subjectPerformance[s] === 'Good');
  
  const topicsDone = Object.values(user.mastery).filter(v => v >= 1).length;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
         {/* Welcome Banner */}
         <div className="lg:col-span-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name}!</h2>
              <p className="text-indigo-100 mb-8 max-w-lg">You are focusing on {focusSubject}. Let's turn that into a strength.</p>
              
              <div className="flex gap-4 mb-8">
                 <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 min-w-[100px]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 mb-1">Streak</div>
                    <div className="text-2xl font-bold">{user.streak} Days</div>
                 </div>
                 <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 min-w-[100px]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 mb-1">Topics Done</div>
                    <div className="text-2xl font-bold">{topicsDone}</div>
                 </div>
              </div>

              <button onClick={() => onViewChange('learning')} className="bg-white text-indigo-600 px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-50 transition shadow-lg">
                Continue Learning
              </button>
            </div>
            
            {/* Decorative background shapes */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="absolute right-20 bottom-0 w-40 h-40 bg-indigo-500/30 rounded-full blur-2xl"></div>
         </div>

         {/* Badges Card */}
         <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6">Badges</h3>
            <div className="flex flex-wrap gap-4">
              {user.badges.length > 0 ? (
                user.badges.map(b => (
                  <div key={b.id} className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-xl" title={b.name}>
                    {b.icon === 'Footprints' && '👣'}
                    {b.icon === 'Flame' && '🔥'}
                    {b.icon === 'Trophy' && '🏆'}
                    {b.icon === 'GraduationCap' && '🎓'}
                    {!['Footprints','Flame','Trophy','GraduationCap'].includes(b.icon) && '🏅'}
                  </div>
                ))
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                   <Award className="w-6 h-6" />
                </div>
              )}
            </div>
         </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-white mb-6">Performance Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-6 min-h-[120px]">
              <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-3">Weak Areas</h4>
              {weakAreas.length > 0 ? (
                <ul className="space-y-1">
                  {weakAreas.map(s => <li key={s} className="text-sm font-medium text-red-600 dark:text-red-300">• {s}</li>)}
                </ul>
              ) : <p className="text-xs text-red-400/60 italic">None</p>}
           </div>

           <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-6 min-h-[120px]">
              <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-3">Moderate Areas</h4>
               {moderateAreas.length > 0 ? (
                <ul className="space-y-1">
                  {moderateAreas.map(s => <li key={s} className="text-sm font-medium text-yellow-600 dark:text-yellow-300">• {s}</li>)}
                </ul>
              ) : <p className="text-xs text-yellow-400/60 italic">None</p>}
           </div>

           <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-6 min-h-[120px]">
              <h4 className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-3">Good Areas</h4>
               {goodAreas.length > 0 ? (
                <ul className="space-y-1">
                  {goodAreas.map(s => <li key={s} className="text-sm font-medium text-green-600 dark:text-green-300">• {s}</li>)}
                </ul>
              ) : <p className="text-xs text-green-400/60 italic">None</p>}
           </div>
        </div>
      </div>
    </div>
  );
};

// 7. Auth Screen (Login/Register)
const AuthScreen = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const { isValid: isPasswordValid, errors: passwordErrors } = usePasswordValidation(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const user = StorageService.authenticate(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid email or password");
      }
    } else {
      if (!isPasswordValid) return;
      const user = StorageService.registerUser(name, email, password);
      if (user) {
        onLogin(user);
      } else {
        setError("User already exists with this email");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-100 dark:border-slate-700">
        <div className="flex justify-center mb-6">
           <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
             <BrainCircuit className="w-8 h-8 text-white" />
           </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-1 dark:text-white">{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="text-center text-slate-500 mb-8 text-sm">{isLogin ? "Continue your learning journey" : "Join NeuroTutor today"}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="text" value={name} onChange={e => setName(e.target.value)} required 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" />
              </div>
            </div>
          )}
          
          <div>
             <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Email Address</label>
             <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="you@example.com" />
             </div>
          </div>

          <div>
             <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Password</label>
             <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
             </div>
             {!isLogin && password && (
               <div className="mt-2 space-y-1">
                 {passwordErrors.map((err, i) => (
                   <p key={i} className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> {err}</p>
                 ))}
                 {isPasswordValid && <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Strong password</p>}
               </div>
             )}
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{error}</div>}

          <button type="submit" disabled={!isLogin && !isPasswordValid} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition mt-4">
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-indigo-600 hover:underline font-medium">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// 10. Main App
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'learning' | 'chat'>('dashboard');
  const [showSyllabusUpload, setShowSyllabusUpload] = useState(false);

  useEffect(() => {
    const currentUser = StorageService.getCurrentUser();
    if (currentUser) setUser(currentUser);
  }, []);

  // Sync dark mode class with user preference
  useEffect(() => {
    if (user?.preferences?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user]);

  const handleLogin = (u: User) => {
    StorageService.setCurrentUser(u);
    setUser(u);
  };

  const handleUpdateUser = (updated: User) => {
    setUser(updated);
  };

  const handleToggleDarkMode = () => {
    if (!user) return;
    const updated = { ...user, preferences: { ...user.preferences, darkMode: !user.preferences.darkMode } };
    setUser(updated);
    StorageService.updateUser(updated);
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setUser(null);
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  
  if (user.isNewUser) return <OnboardingWizard user={user} onComplete={handleUpdateUser} />;

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col py-6 z-20">
         <div className="mb-8 px-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
               <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">NeuroTutor</span>
         </div>

         {/* User Card in Sidebar */}
         <div className="mx-4 mb-6 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
               {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
               <p className="text-sm font-bold truncate">{user.name}</p>
               <p className="text-xs text-slate-500 truncate">{user.grade || 'Student'}</p>
            </div>
         </div>

         <nav className="flex-1 space-y-1 px-4">
            <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeView === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900'}`}>
               <LayoutDashboard className="w-5 h-5" />
               Dashboard
            </button>
            <button onClick={() => setActiveView('learning')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeView === 'learning' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900'}`}>
               <BookOpen className="w-5 h-5" />
               Learning Path
            </button>
            <button onClick={() => setActiveView('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeView === 'chat' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900'}`}>
               <MessageCircle className="w-5 h-5" />
               AI Chat
            </button>
         </nav>

         <div className="px-4 mt-auto space-y-1">
            <button onClick={handleToggleDarkMode} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium">
               {user.preferences.darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
               {user.preferences.darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all font-medium">
               <LogOut className="w-5 h-5" />
               Sign Out
            </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-hidden relative bg-white dark:bg-slate-900">
         {activeView === 'dashboard' && <Dashboard user={user} onViewChange={setActiveView} />}
         {activeView === 'learning' && <LearningFlowchart user={user} onUpdateUser={handleUpdateUser} />}
         {activeView === 'chat' && <ChatInterface user={user} />}
      </div>

      {showSyllabusUpload && <AddSubjectModal user={user} onClose={() => setShowSyllabusUpload(false)} onAdd={handleUpdateUser} allowExisting={true} />}

    </div>
  );
};

export default App;
