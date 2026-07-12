import { useCallback, useState } from 'react';

import { AnalysisPanel } from './components/AnalysisPanel';
import { InterviewPanel } from './components/InterviewPanel';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useVoiceSession } from './hooks/useVoiceSession';
import { generateCareerAnalysis } from './services/analysis';
import { AppStatus } from './types';
import type { AnalysisResult, AppMode, TranscriptEntry } from './types';

const ANALYSIS_ERROR_RESULT: AnalysisResult = {
  summary: '',
  report:
    'Sorry, I encountered an error while analyzing your career path. ' +
    'Please try again by starting over.',
  careerPaths: { primary: null, alternatives: [] },
};

const App = () => {
  const [mode, setMode] = useState<AppMode>('WELCOME');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleInterviewComplete = useCallback(async (finalTranscript: TranscriptEntry[]) => {
    setMode('ANALYSIS');
    setIsAnalyzing(true);
    try {
      setAnalysis(await generateCareerAnalysis(finalTranscript));
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis(ANALYSIS_ERROR_RESULT);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const {
    status,
    transcript,
    interimUserTranscript,
    interimAiTranscript,
    startSession,
    stopSession,
    resetSession,
  } = useVoiceSession({ onInterviewComplete: handleInterviewComplete });

  const startInterview = () => {
    setMode('INTERVIEW');
    void startSession();
  };

  const toggleConversation = () => {
    if (status === AppStatus.Idle || status === AppStatus.Error) {
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

  return (
    <div className="flex flex-col h-full w-full bg-white/70 backdrop-blur-xl overflow-hidden rounded-2xl border border-slate-200/60">
      {mode === 'WELCOME' ? (
        <WelcomeScreen onStart={startInterview} />
      ) : (
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
      )}
    </div>
  );
};

export default App;
