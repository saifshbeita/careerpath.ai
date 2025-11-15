import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: Removed LiveSession from import as it is not an exported member.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AppStatus, TranscriptEntry } from './types';
import { encode, decode, decodeAudioData } from './utils/audioUtils';

// FIX: Define LiveSession interface locally as it's not exported from @google/genai
interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: { media: Blob }) => void;
}

type AppMode = 'WELCOME' | 'INTERVIEW' | 'ANALYSIS';

const MIC_SAMPLE_RATE = 16000;
const GEMINI_SAMPLE_rate = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;


const MicrophoneIcon = ({className = "w-6 h-6"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 1 1-13.5 0v-1.5A.75.75 0 0 1 6 10.5Z" />
    </svg>
);

const StopIcon = ({className = "w-6 h-6"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3-3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
    </svg>
);

const RestartIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-4.518a.75.75 0 0 0-.75.75v4.518l1.903-1.903a5.997 5.997 0 0 0-10.096 2.787.75.75 0 0 1-1.445-.387a7.5 7.5 0 0 1-1.562-3.364Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M19.245 13.941a7.5 7.5 0 0 1-12.548 3.364l-1.903-1.903h4.518a.75.75 0 0 0 .75-.75v-4.518l-1.903 1.903a5.997 5.997 0 0 0 10.096-2.787.75.75 0 0 1 1.445.387a7.5 7.5 0 0 1 1.562 3.364Z" clipRule="evenodd" />
    </svg>
);

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const AnalyzeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const RoadmapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13V7m0 13a2 2 0 002-2V9a2 2 0 00-2-2m-2 4h.01M15 20l5.447-2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m0 13V7m0 13a2 2 0 01-2-2V9a2 2 0 012-2m2 4h-.01" />
    </svg>
);


const MarkdownRenderer = ({ content }: { content: string }) => {
    const htmlContent = content
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-slate-800 mb-6">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-slate-700 mt-8 mb-4">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-slate-700 mt-6 mb-3">$1</h3>')
        .replace(/`([^`]+)`/g, '<code class="bg-slate-200 text-slate-800 font-mono text-sm px-1.5 py-0.5 rounded">$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
        .replace(/- \[ \] (.*)/gim, '<li class="flex items-center gap-3 mb-2"><div class="w-4 h-4 border-2 border-slate-400 rounded"></div><span class="flex-1">$1</span></li>')
        .replace(/(\d)\. (.*?)(<br \/>|$)/gim, '<li class="ml-4 list-decimal mb-2">$2</li>')
        .replace(/^- (.*?)(<br \/>|$)/gim, '<li class="ml-4 list-disc mb-2">$1</li>')
        .replace(/\n/g, '<br />');

    return <div className="text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

const CareerPathGraph = ({ paths }: { paths: { primary: string | null; alternatives: string[] } }) => {
    if (!paths.primary) return null;

    return (
        <div className="mt-12 p-6 bg-slate-50/70 rounded-xl border border-slate-200/80">
            <h2 className="text-2xl font-semibold text-slate-700 mb-8 text-center">Your Career Constellation</h2>
            <div className="flex flex-col items-center text-center">
                {/* User Profile Node */}
                <div className="px-6 py-3 bg-white rounded-lg shadow-md border border-slate-200">
                    <p className="font-bold text-slate-800 text-lg">Your Profile</p>
                </div>

                {/* Connector */}
                <div className="w-1 h-8 bg-slate-300 my-2 rounded-full"></div>

                {/* Primary Path Node */}
                <div className="px-6 py-4 bg-indigo-600 text-white rounded-lg shadow-lg">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Primary Path</p>
                    <p className="font-bold text-xl mt-1">{paths.primary}</p>
                </div>

                {/* Alternatives Section */}
                {paths.alternatives.length > 0 && (
                    <>
                        {/* Connector */}
                        <div className="w-1 h-8 bg-slate-300 my-2 rounded-full"></div>
                        {/* T-junction */}
                        <div className="w-1/2 h-1 bg-slate-300 rounded-full"></div>
                        
                        <div className="flex justify-center w-full gap-4 mt-2">
                            {paths.alternatives.map((alt, index) => (
                                <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                                    {/* Vertical Connector */}
                                    <div className="w-1 h-8 bg-slate-300 rounded-full"></div>
                                    {/* Alternative Node */}
                                    <div className="px-4 py-3 bg-white rounded-lg shadow-md border border-slate-200 w-full">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Alternative</p>
                                        <p className="font-semibold text-slate-700 mt-1 truncate">{alt}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [mode, setMode] = useState<AppMode>('WELCOME');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [interimUserTranscript, setInterimUserTranscript] = useState('');
    const [interimAiTranscript, setInterimAiTranscript] = useState('');
    const [analysisResult, setAnalysisResult] = useState('');
    const [userProfileSummary, setUserProfileSummary] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [careerPaths, setCareerPaths] = useState<{primary: string | null, alternatives: string[]}>({ primary: null, alternatives: [] });
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextAudioStartTimeRef = useRef<number>(0);
    
    const interimUserTranscriptRef = useRef('');
    const interimAiTranscriptRef = useRef('');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const scrollToBottom = () => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [transcript, interimUserTranscript, interimAiTranscript]);

    const stopConversation = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                // Ignore errors if session is already closed
            }
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close();
        }
        
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextAudioStartTimeRef.current = 0;

        setStatus(AppStatus.IDLE);
        setInterimUserTranscript('');
        setInterimAiTranscript('');
    }, []);

    const startAnalysis = useCallback(async (finalTranscript: TranscriptEntry[]) => {
        setIsAnalyzing(true);
        setMode('ANALYSIS');
        await stopConversation();

        const conversationHistory = finalTranscript.map(entry => `${entry.speaker === 'user' ? 'User' : 'Coach'}: ${entry.text}`).join('\n\n');

        const analysisPrompt = `
First, generate a concise summary of the user's key traits and interests for a sidebar display. Use a bulleted list with no more than 4-5 key points. Then, on a new line, add the separator "---SIDEBAR---". After the separator, generate the full career analysis report as specified below.

EXAMPLE OUTPUT FORMAT:
- Core Trait: Enjoys creative problem-solving and tangible outcomes.
- Key Interest: Fascinated by technology and how things work.
- Strength: Demonstrates strong analytical and logical thinking.
---SIDEBAR---
# Career Path Analysis
...[rest of the report]...

---

FULL REPORT SPECIFICATION:
You are a professional career analyst. Your task is to analyze the provided conversation transcript and generate a comprehensive, actionable, and formal career roadmap. The beginning of the transcript may contain the user's name, age, and location. Use this context to personalize the analysis.

OUTPUT STRUCTURE (use clear and professional markdown formatting, DO NOT use emojis):

# Career Path Analysis

## Profile Summary
[Provide a 3-4 sentence summary of the user's core personality traits, expressed interests, and apparent natural abilities based on the conversation. If the user provided their name, use it. The tone should be objective and insightful.]

## Recommended Career Path
**Primary Career Direction:** [Specific career title]
**Rationale for Recommendation:** [Provide a 2-3 sentence analysis connecting the user's specific statements to the demands and rewards of this career.]

**Alternative Paths for Consideration:**
1. [Alternative 1] - [Rationale for this alternative path.]
2. [Alternative 2] - [Rationale for this alternative path.]

## Recommended University Majors
**Primary Major Recommendation:** [Specific major]
- Rationale: [Explain the connection to their interests, goals, and the primary recommended career path.]

**Alternative Majors:**
- [Major 2]: [Brief explanation]
- [Major 3]: [Brief explanation]

## Skills Development Plan

### Key Technical Skills to Acquire
1. **[Skill 1]** - Priority: High
   - Relevance: [Explain relevance to the primary career path.]
   - Starting Point: [Provide a specific, actionable resource, e.g., "Complete the 'Data Science Specialization' on Coursera" or "Develop a web application using Node.js and Express."]

2. **[Skill 2]** - Priority: High/Medium
   - Relevance: [Explain relevance.]
   - Starting Point: [Provide a specific resource or action.]

3. **[Skill 3]** - Priority: Medium
   - Relevance: [Explain relevance.]
   - Starting Point: [Provide a specific resource or action.]

### Essential Soft Skills to Cultivate
- **[Skill 1]**: [Explain its importance for the recommended path, referencing the user's conversation.]
- **[Skill 2]**: [Explain its importance for the recommended path, referencing the user's conversation.]
- **[Skill 3]**: [Explain its importance for the recommended path, referencing the user's conversation.]

## Learning Roadmap (Next 6-12 Months)

### Phase 1: Foundational Knowledge (Months 1-3)
- [ ] [Specific, small action item, e.g., "Read 'The Pragmatic Programmer' and complete the first three chapters."]
- [ ] [Specific action item, e.g., "Master CSS Flexbox and Grid via online tutorials."]
- [ ] [Course or resource recommendation]

### Phase 2: Practical Application (Months 4-6)
- [ ] [Specific action item, e.g., "Build and deploy a personal portfolio website."]
- [ ] [Project recommendation]
- [ ] [Course or resource recommendation]

### Phase 3: Specialization and Networking (Months 7-12)
- [ ] [Specific action item, e.g., "Contribute to a relevant open-source project on GitHub."]
- [ ] [Portfolio/experience building activity, e.g., "Offer to build a simple website for a local non-profit organization."]
- [ ] [Networking or real-world application, e.g., "Attend a local industry meetup or virtual conference."]

## Recommended Starter Projects
1. **[Project Title]**
   - Description: [Brief, professional description of the project.]
   - Skills Utilized: [List key skills.]
   - Estimated Duration: [e.g., "20-30 hours"]
   - Rationale: [Explain why this project is a good starting point for their goals.]

2. **[Project Title]**
   - Description: [Brief description.]
   - Skills Utilized: [List skills.]
   - Estimated Duration: [Duration]
   - Rationale: [Connection to goals.]

## Immediate Action Items (This Week)
1. [Specific, actionable step, e.g., "Enroll in the previously mentioned Coursera course."]
2. [Specific, actionable step, e.g., "Outline the features for your personal portfolio website."]
3. [Specific, actionable step, e.g., "Research and identify three companies in the [recommended industry] field that align with your interests."]`

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: conversationHistory,
                config: {
                    systemInstruction: analysisPrompt
                }
            });

            const fullResponseText = response.text;
            const parts = fullResponseText.split('---SIDEBAR---');
            const summary = parts[0]?.trim() || '';
            const report = parts[1]?.trim() || "Sorry, I encountered an error while generating your career path analysis. The format of the response was not as expected. Please try again by starting over.";
            
            let primaryPath: string | null = null;
            const primaryMatch = report.match(/\*\*Primary Career Direction:\*\*\s*(.*)/);
            if (primaryMatch && primaryMatch[1]) {
                primaryPath = primaryMatch[1].trim();
            }

            const alternatives: string[] = [];
            const alternativesSectionMatch = report.match(/\*\*Alternative Paths for Consideration:\*\*\s*([\s\S]*?)(?=\n##|#|$)/);
            if (alternativesSectionMatch && alternativesSectionMatch[1]) {
                const section = alternativesSectionMatch[1];
                const alternativeMatches = section.matchAll(/^\s*\d\.\s*([^-]+)/gm);
                for (const match of alternativeMatches) {
                    if (match[1]) {
                        alternatives.push(match[1].trim());
                    }
                }
            }
            
            setCareerPaths({ primary: primaryPath, alternatives });
            setUserProfileSummary(summary);
            setAnalysisResult(report);

        } catch (error) {
            console.error("Analysis failed:", error);
            setAnalysisResult("Sorry, I encountered an error while analyzing your career path. Please try again by starting over.");
        } finally {
            setIsAnalyzing(false);
        }
    }, [ai.models, stopConversation]);

    const handleSessionMessage = useCallback(async (message: LiveServerMessage) => {
        // Handle interruption from the server when the user starts speaking.
        if (message.serverContent?.interrupted) {
            // Stop all currently playing audio and clear the queue.
            audioSourcesRef.current.forEach(source => {
                try {
                    source.stop();
                } catch(e) { /* Ignore errors if source already stopped */ }
            });
            audioSourcesRef.current.clear();
            nextAudioStartTimeRef.current = 0;

            // The AI was cut off, so clear its interim transcript.
            interimAiTranscriptRef.current = '';
            setInterimAiTranscript('');
            
            // The user is talking, so we are now listening.
            setStatus(AppStatus.LISTENING);
        }

        // Process transcription data.
        if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            setInterimUserTranscript(prev => prev + text);
            interimUserTranscriptRef.current += text;
        } else if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            setInterimAiTranscript(prev => prev + text);
            interimAiTranscriptRef.current += text;
        }

        // Process and play audio data from the AI.
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            setStatus(AppStatus.SPEAKING);
            const outputAudioContext = outputAudioContextRef.current;
            if (outputAudioContext) {
                nextAudioStartTimeRef.current = Math.max(
                    nextAudioStartTimeRef.current,
                    outputAudioContext.currentTime,
                );
                
                const decodedAudio = decode(base64Audio);
                const audioBuffer = await decodeAudioData(decodedAudio, outputAudioContext, GEMINI_SAMPLE_rate, 1);

                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);

                source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                    // Switch to listening only if the audio queue is empty.
                    if (audioSourcesRef.current.size === 0) {
                        setStatus(AppStatus.LISTENING);
                    }
                });

                source.start(nextAudioStartTimeRef.current);
                nextAudioStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }
        }

        // Handle the end of a conversational turn.
        if (message.serverContent?.turnComplete) {
            const fullUserInput = interimUserTranscriptRef.current.trim();
            const fullAiOutput = interimAiTranscriptRef.current.trim();
            
            setTranscript(prev => {
                const newTranscript = [...prev];
                if (fullUserInput) newTranscript.push({ speaker: 'user', text: fullUserInput });
                // Only add the AI's response if it wasn't empty (i.e., not interrupted).
                if (fullAiOutput) newTranscript.push({ speaker: 'ai', text: fullAiOutput });

                if (fullAiOutput.includes("Switching to analysis mode now.")) {
                    startAnalysis(newTranscript);
                }
                return newTranscript;
            });
            
            // Reset interim transcripts for the next turn.
            setInterimUserTranscript('');
            setInterimAiTranscript('');
            interimUserTranscriptRef.current = '';
            interimAiTranscriptRef.current = '';
        }
    }, [startAnalysis]);
    
    const startConversation = useCallback(async () => {
        setMode('INTERVIEW');
        setStatus(AppStatus.CONNECTING);
        try {
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: GEMINI_SAMPLE_rate });
            const welcomeMessage = "Hello! I'm your AI Career Coach. To get started, what's your name?";

            const ttsResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: welcomeMessage }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                },
            });

            const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                setStatus(AppStatus.SPEAKING);
                setTranscript([{ speaker: 'ai', text: welcomeMessage }]);
                
                const decodedAudio = decode(base64Audio);
                const audioBuffer = await decodeAudioData(decodedAudio, outputAudioContextRef.current, GEMINI_SAMPLE_rate, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                
                const playbackPromise = new Promise<void>(resolve => { source.onended = () => resolve(); });
                audioSourcesRef.current.add(source);
                source.start();
                await playbackPromise;
                audioSourcesRef.current.delete(source);
            }

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: MIC_SAMPLE_RATE });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => setStatus(AppStatus.LISTENING),
                    onmessage: handleSessionMessage,
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setStatus(AppStatus.ERROR);
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Session closed');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: `YOUR PERSONALITY:
- You are a warm, empathetic, and deeply curious career coach.
- Your tone is conversational and encouraging, not robotic or formal.
- You actively listen, showing you understand by referencing what the user has said.
- You validate their experiences (e.g., "That's fascinating," "It sounds like you're really skilled at that.").

YOUR INTERVIEW GOAL:
Your goal is to understand the user's core identity—their passions, natural talents, and what truly motivates them—through a short, insightful conversation. You are not just a question-asker; you are a conversation partner.

INTERVIEW PROCESS:
Your first goal is to gather some basic information in a friendly, conversational way. The interview will proceed in two phases.

**Phase 1: Introduction (Your current phase)**
You have already introduced yourself and asked for the user's name. Your immediate task is to:
1.  Listen for the user's name.
2.  Once they provide their name, greet them personally (e.g., "Nice to meet you, [Name]!").
3.  Then, ask for their age (e.g., "And how old are you?").
4.  After they respond, ask where they are from (e.g., "And where are you from?").
5.  Once you have this information, smoothly transition to the main interview. A good transition would be: "Great, thanks for sharing that. Now, let's dive in. To get started, could you tell me what activities make you lose track of time?"

**Phase 2: Core Interview**
After you've asked the "lose track of time" question, your goal is to understand the user's core identity—their passions, natural talents, and what truly motivates them—through a short, insightful conversation. You are not just a question-asker; you are a conversation partner.

Instead of following a rigid script, you will dynamically create questions based on what the user tells you. Use the following themes as a mental guide, but do not simply ask these example questions. Weave them into the conversation naturally if they fit.

THEMES TO EXPLORE:
1.  **Flow & Passion:**
    *   *Goal:* What energizes them?
    *   *Inspiration:* "That sounds really interesting. What about that activity makes it so engaging for you?" or "If you had a free weekend with no obligations, how would you spend it?"

2.  **Natural Talents & Strengths:**
    *   *Goal:* What are they naturally good at, even if they don't see it as a "skill"?
    *   *Inspiration:* "Tell me about a time you solved a problem that you were proud of." or "What do friends or family say you're great at?"

3.  **Work & Collaboration Style:**
    *   *Goal:* What environment helps them thrive?
    *   *Inspiration:* "Do you get more energy from brainstorming with a group or from diving deep into a project by yourself?" or "Describe a perfect work day for you."

4.  **Core Values:**
    *   *Goal:* What is fundamentally important to them in work and life?
    *   *Inspiration:* "When you think about your future, what's more important: stability, creativity, or making a big impact?"

CONVERSATION RULES:
- **Be Creative:** Your primary directive is to ask insightful questions that stem directly from the user's previous answer. Don't just move to the next theme.
- **Stay Curious:** Dig deeper. If they say they like "problem-solving," ask "What kind of problems? Are they puzzles, people problems, technical challenges?"
- **Keep it Concise:** Ask ONE question at a time. Aim for a total of 5-7 thoughtful questions to get a complete picture.
- **Concluding the Interview:** Once you feel you have a rich understanding of the user, conclude gracefully by saying: "Thank you so much for sharing all of that with me. I have a much clearer picture now. Let me analyze this and create your personalized career path. Switching to analysis mode now."

DO NOT:
- Ask generic questions like "Where do you see yourself in 5 years?".
- Ask more than 7-8 questions in total.
- Ask multiple questions in one turn.
- Give any career advice during this interview phase.`,
                },
            });

            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob: Blob = {
                    data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                    mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}`,
                };
                
                sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            };

            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

        } catch (error) {
            console.error('Failed to start conversation:', error);
            setStatus(AppStatus.ERROR);
        }
    }, [ai, handleSessionMessage]);

    const resetApp = () => {
        stopConversation();
        setTranscript([]);
        setMode('WELCOME');
        setAnalysisResult('');
        setUserProfileSummary('');
        setCareerPaths({ primary: null, alternatives: [] });
        setIsAnalyzing(false);
        setStatus(AppStatus.IDLE);
    }

    const toggleConversation = () => {
        if (status === AppStatus.IDLE || status === AppStatus.ERROR) {
            startConversation();
        } else {
            stopConversation();
        }
    };
    
    const renderWelcomeMode = () => (
        <div className="flex flex-col h-full">
            <header className="p-4 flex items-center justify-between border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg shadow-sm"></div>
                    <h1 className="text-lg font-bold text-slate-800">AI Career Coach</h1>
                </div>
                 <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
            </header>
            <div className="flex flex-col items-center justify-center text-center flex-1 p-8">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800">Discover Your Perfect Career Path</h1>
                <p className="text-slate-600 mt-3 text-lg max-w-2xl">I'm here to help you discover a fulfilling career through a friendly, voice-based conversation.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-12 text-left">
                    <div className="bg-white/50 p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <ChatIcon />
                        <h3 className="font-semibold text-slate-800 mb-1">1. Voice Interview</h3>
                        <p className="text-slate-500 text-sm">Engage in a natural conversation. Just talk about your interests, skills, and passions.</p>
                    </div>
                    <div className="bg-white/50 p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <AnalyzeIcon />
                        <h3 className="font-semibold text-slate-800 mb-1">2. Deep Analysis</h3>
                        <p className="text-slate-500 text-sm">Our advanced AI analyzes your responses to identify your core strengths and traits.</p>
                    </div>
                    <div className="bg-white/50 p-6 rounded-xl shadow-sm border border-slate-200/80">
                        <RoadmapIcon />
                        <h3 className="font-semibold text-slate-800 mb-1">3. Personalized Roadmap</h3>
                        <p className="text-slate-500 text-sm">Receive a comprehensive report with tailored career paths and actionable next steps.</p>
                    </div>
                </div>

                <div className="w-full mt-12 max-w-sm">
                    <button 
                        onClick={startConversation}
                        className="w-full bg-slate-800 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-700 transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
                    >
                        <MicrophoneIcon />
                        Start Your Career Interview
                    </button>
                </div>
            </div>
        </div>
    );
    
    const renderInterviewMode = () => (
        <>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {transcript.map((entry, index) => (
                    <div key={index} className={`flex items-end gap-2.5 ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                         {entry.speaker === 'ai' && <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 shadow-sm"></div>}
                        <div className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${entry.speaker === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
                           <p className="whitespace-pre-wrap">{entry.text}</p>
                        </div>
                    </div>
                ))}
                {interimUserTranscript && (
                    <div className="flex justify-end">
                        <div className="max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl bg-indigo-500 text-white opacity-60 rounded-br-none shadow-sm">
                            <p className="whitespace-pre-wrap">{interimUserTranscript}</p>
                        </div>
                    </div>
                )}
                {interimAiTranscript && (
                    <div className="flex items-end gap-2.5 justify-start">
                         <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 opacity-60 shadow-sm"></div>
                        <div className="max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl bg-slate-200 text-slate-800 opacity-60 rounded-bl-none shadow-sm">
                            <p className="whitespace-pre-wrap">{interimAiTranscript}</p>
                        </div>
                    </div>
                )}
                <div ref={transcriptEndRef} />
            </div>
            <div className="p-4 border-t border-slate-200/80">
                <div className="flex items-center justify-center">
                    <button
                        onClick={toggleConversation}
                        disabled={status === AppStatus.CONNECTING}
                        className={`rounded-full w-14 h-14 text-white flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-indigo-500/50 shadow-lg
                        ${status === AppStatus.LISTENING || status === AppStatus.SPEAKING ? 'bg-red-500 hover:bg-red-600 animate-pulse-glow' : 'bg-indigo-500 hover:bg-indigo-600'}
                        ${status === AppStatus.CONNECTING ? 'bg-slate-400 cursor-not-allowed' : ''}
                        `}
                        aria-label={status === AppStatus.LISTENING || status === AppStatus.SPEAKING ? 'Stop conversation' : 'Start conversation'}
                    >
                        {status === AppStatus.LISTENING || status === AppStatus.SPEAKING ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>
        </>
    );

    const renderAnalysisMode = () => (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-700"></div>
                    <p className="mt-4 text-lg font-medium">Analyzing your profile...</p>
                    <p className="text-sm">This may take a moment.</p>
                </div>
            ) : (
                <>
                    <MarkdownRenderer content={analysisResult} />
                    <CareerPathGraph paths={careerPaths} />
                </>
            )}
        </div>
    );
    
    const renderInterviewAnalysisLayout = () => (
        <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-1/3 p-6 flex flex-col bg-slate-50/50 border-r border-slate-200/80 overflow-y-auto">
                <div className="flex justify-between items-center mb-8 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg shadow-sm"></div>
                        <h2 className="text-lg font-bold text-slate-800">AI Career Coach</h2>
                    </div>
                    <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                </div>
                <p className="text-slate-500 mb-8 flex-shrink-0">
                    {mode === 'INTERVIEW' ? 'Interview in progress...' : 'Your personalized report.'}
                </p>

                {mode === 'ANALYSIS' && !isAnalyzing && userProfileSummary && (
                    <div className="mb-8 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Insights</h3>
                         <ul className="text-slate-600 text-sm space-y-2.5">
                            {userProfileSummary.split('\n').filter(line => line.trim().startsWith('-')).map((item, index) => (
                                <li key={index} className="flex items-start gap-2.5">
                                    <svg className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>{item.replace(/^- /, '')}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-auto flex-shrink-0">
                    <button
                        onClick={resetApp}
                        className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm border border-slate-200"
                    >
                        <RestartIcon />
                        Start Over
                    </button>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="w-2/3 flex flex-col bg-white/60">
                {mode === 'INTERVIEW' ? renderInterviewMode() : renderAnalysisMode()}
            </div>
        </div>
    )
    
    return (
        <div className="flex flex-col h-full max-h-[95vh] h-[800px] w-full max-w-6xl bg-white/70 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
           {mode === 'WELCOME' ? renderWelcomeMode() : renderInterviewAnalysisLayout()}
        </div>
    );
};

export default App;