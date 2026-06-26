
import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types";
import { SUBJECTS_PRIMARY, SUBJECTS_HIGH_SCHOOL, SUBJECTS_INTER_MPC } from "../constants";

const ai = new GoogleGenAI({ apiKey: "AIzaSyAYSUPS_bR09yNj6iwiZY_12BFtaqAZd80" });

export const GeminiService = {
  // 1. Chat / Explain Concept
  explainConcept: async (
    query: string,
    history: Message[] | null,
    imageBase64: string | null,
    topic: string,
    grade: string,
    userContext?: string
  ) => {
    let contents: any[] = [];

    // Include chat history if provided
    if (history && history.length > 0) {
      contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));
    }

    const currentParts: any[] = [];
    if (imageBase64) {
      currentParts.push({
        inlineData: { mimeType: 'image/png', data: imageBase64 }
      });
    }
    currentParts.push({ text: query });

    contents.push({
      role: 'user',
      parts: currentParts
    });

    try {
      const response = await ai.models.generateContent({
        model: imageBase64 ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: `You are a helpful and knowledgeable AI Tutor. 
          Your student is in ${grade}. 
          
          USER CONTEXT / PROGRESS:
          ${userContext || 'No specific progress data available.'}

          You must answer ANY question the user asks, whether it's about "${topic}", another subject, or general knowledge. 
          If the query is academic, explain it clearly and simply suitable for a ${grade} student. 
          If it is a general question (like "who is the president", "write a poem", "hello"), answer it directly and helpfuly. DO NOT refuse to answer.
          Context focus (if relevant to query): ${topic}.`,
          temperature: 0.7,
        }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm having trouble connecting to the tutoring brain right now.";
    }
  },

  // 2. Generate Diagnostic Quiz (Subject specific or Comprehensive)
  generateDiagnosticQuiz: async (grade: string, subject?: string) => {
    let prompt;
    if (subject) {
      prompt = `Generate a 10-question diagnostic quiz for ${grade} ${subject}. 
      Cover a variety of key topics within ${subject} to assess mastery level.
      Return JSON format only.`;
    } else {
      prompt = `Generate a comprehensive 10-question diagnostic quiz for a student in ${grade}. 
      Cover a mix of major subjects (Math, Science, English, Social). 
      The goal is to identify weak subjects.
      Return JSON format only.`;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                    subject: { type: Type.STRING }, // Crucial for categorization
                    topic: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      return JSON.parse(response.text).questions;
    } catch (e) {
      console.error("Quiz Gen Error", e);
      // Fallback questions if API fails
      return [
        { id: '1', question: 'What is 5 + 7?', options: ['10', '11', '12', '13'], correctIndex: 2, subject: 'Mathematics', topic: 'Addition' },
        { id: '2', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1, subject: 'Science', topic: 'Astronomy' }
      ];
    }
  },

  // 2b. Generate Catchup Quiz
  generateCatchupQuiz: async (grade: string, subject: string) => {
    const prompt = `Generate a 5-question catch-up quiz for ${grade} ${subject} to restore streak. Focus on core concepts. Return JSON format.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      return JSON.parse(response.text).questions;
    } catch (e) {
      return [
        { id: '1', question: 'Quick Review: 20/4 = ?', options: ['4', '5', '6', '2'], correctIndex: 1, explanation: 'Basic division.' }
      ];
    }
  },

  // 3. Generate Syllabus Topics (OCR & Auto-generation)
  generateSyllabus: async (grade: string, subject: string, fileBase64?: string) => {
    let prompt = "";
    if (fileBase64) {
      prompt = `Analyze this image (scanned document or handwriting). Extract the main chapters/topics for ${subject}. Return a clean JSON list of topics with short descriptions. Ignore non-syllabus text.`;
    } else {
      prompt = `Generate a standard learning path (syllabus) for ${grade} ${subject}. Return 6-8 sequential topics with short descriptions.`;
    }

    const parts: any[] = [];
    if (fileBase64) {
      parts.push({ inlineData: { mimeType: 'image/png', data: fileBase64 } });
    }
    parts.push({ text: prompt });

    try {
      const response = await ai.models.generateContent({
        model: fileBase64 ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      return JSON.parse(response.text).topics;
    } catch (e) {
      console.error(e);
      return [{ name: "Basics", description: "Introduction to the subject" }, { name: "Core Concepts", description: "Fundamental principles" }];
    }
  },

  // 4. Generate Tutorial Content
  generateTopicTutorial: async (grade: string, subject: string, topic: string) => {
    const prompt = `Teach "${topic}" for ${grade} ${subject}.
    Format: Markdown.
    Sections:
    1. Concept Overview (Simple & Clear)
    2. Key Points / Formulas
    3. Example Problem
    Keep it engaging and under 400 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return response.text;
  },

  // 5. Generate Topic Quiz
  generateQuizQuestion: async (topic: string) => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate 1 MCQ for topic "${topic}". JSON format.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(response.text);
    } catch (e) { return null; }
  },

  // 6. Generate Video Search Query (Simulation of "Fast" Video generation)
  getVideoSearchQuery: async (topic: string, grade: string) => {
    // In a real app with Veo, we would generate a video. 
    // For "fast" response, we generate a youtube query link or a short visual description.
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${grade} ${topic} tutorial`)}`;
  }
};
