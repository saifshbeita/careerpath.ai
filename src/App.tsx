import React, { useCallback, useState } from 'react';

import { AnalysisPanel } from './components/AnalysisPanel';
import { InterviewPanel } from './components/InterviewPanel';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useVoiceSession } from './hooks/useVoiceSession';
import { generateCareerAnalysis } from './services/analysis';
import { AppStatus } from './types';
import type { AnalysisResult, AppMode, TranscriptEntry } from './types';

// Structural default error layout fallback constant
const ANALYSIS_ERROR_RESULT: AnalysisResult = {
  summary: '',
  report: [
    'Sorry, I encountered an error while analyzing your career path.',
    'Please try again by starting over.'
  ].join(' '),
  careerPaths: { primary: null, alternatives: [] },
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('WELCOME');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Core callback trigger for post-interview pipeline processing
  const handleInterviewComplete = useCallback(async (finalTranscript: TranscriptEntry[]) => {
    setMode('ANALYSIS');
    setIsAnalyzing(true);
    
    try {
      const generatedAnalysis = await generateCareerAnalysis(finalTranscript);
      setAnalysis(generatedAnalysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis(ANALYSIS_ERROR_RESULT);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Voice engine hook subscription
  const voiceSession = useVoiceSession({ 
    onInterviewComplete: handleInterviewComplete 
  });

  const {
    status,
    transcript,
    interimUserTranscript,
    interimAiTranscript,
    startSession,
    stopSession,
    resetSession,
  } = voiceSession;

  // UI Event Handlers
  const startInterview = () => {
    setMode('INTERVIEW');
    void startSession();
  };

  const toggleConversation = () => {
    const isSessionInactive = status === AppStatus.Idle || status === AppStatus.Error;
    if (isSessionInactive) {
      void startSession();
    } else {
      void stopSession();
    }
  };

  const resetApp = () => {
    resetSession();
    setMode('WELCOME');
    setAnalysis(null);
    setIsAnalyzing(false);
  };

  // Pre-compiled inner layout structure for main interaction screen
  const mainWorkspaceLayout = (
    <div className="flex-1 flex overflow-hidden">
      <Sidebar
        mode={mode}
        isAnalyzing={isAnalyzing}
        profileSummary={analysis?.summary ?? ''}
        onReset={resetApp}
      />
      <div className="w-2/3 flex flex-col bg-white/60">
        {mode === 'INTERVIEW' ? (
          <InterviewPanel
            status={status}
            transcript={transcript}
            interimUserTranscript={interimUserTranscript}
            interimAiTranscript={interimAiTranscript}
            onToggleConversation={toggleConversation}
          />
        ) : (
          <AnalysisPanel isAnalyzing={isAnalyzing} analysis={analysis} />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-white/70 backdrop-blur-xl overflow-hidden rounded-2xl border border-slate-200/60">
      {mode === 'WELCOME' ? (
        <WelcomeScreen onStart={startInterview} />
      ) : (
        mainWorkspaceLayout
      )}
    </div>
  );
};

export default App;
