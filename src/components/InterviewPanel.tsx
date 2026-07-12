import { useEffect, useRef } from 'react';

import { AppStatus } from '../types';
import type { TranscriptEntry } from '../types';
import { MicrophoneIcon, StopIcon } from './icons';

interface ChatBubbleProps {
  entry: TranscriptEntry;
  interim?: boolean;
}

const ChatBubble = ({ entry, interim = false }: ChatBubbleProps) => {
  const isUser = entry.speaker === 'user';
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 shadow-sm ${interim ? 'opacity-60' : ''}`}></div>
      )}
      <div
        className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-indigo-500 text-white rounded-br-none'
            : 'bg-slate-200 text-slate-800 rounded-bl-none'
        } ${interim ? 'opacity-60' : ''}`}
      >
        <p className="whitespace-pre-wrap">{entry.text}</p>
      </div>
    </div>
  );
};

interface InterviewPanelProps {
  status: AppStatus;
  transcript: TranscriptEntry[];
  interimUserTranscript: string;
  interimAiTranscript: string;
  onToggleConversation: () => void;
}

/** Live chat transcript plus the microphone start/stop control. */
export const InterviewPanel = ({
  status,
  transcript,
  interimUserTranscript,
  interimAiTranscript,
  onToggleConversation,
}: InterviewPanelProps) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimUserTranscript, interimAiTranscript]);

  const isActive = status === AppStatus.Listening || status === AppStatus.Speaking;
  const isConnecting = status === AppStatus.Connecting;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {transcript.map((entry, index) => (
          <ChatBubble key={index} entry={entry} />
        ))}
        {interimUserTranscript && (
          <ChatBubble entry={{ speaker: 'user', text: interimUserTranscript }} interim />
        )}
        {interimAiTranscript && (
          <ChatBubble entry={{ speaker: 'ai', text: interimAiTranscript }} interim />
        )}
        <div ref={transcriptEndRef} />
      </div>
      <div className="p-4 border-t border-slate-200/80">
        <div className="flex items-center justify-center">
          <button
            onClick={onToggleConversation}
            disabled={isConnecting}
            className={`rounded-full w-14 h-14 text-white flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-indigo-500/50 shadow-lg
            ${isActive ? 'bg-red-500 hover:bg-red-600 animate-pulse-glow' : 'bg-indigo-500 hover:bg-indigo-600'}
            ${isConnecting ? 'bg-slate-400 cursor-not-allowed' : ''}
            `}
            aria-label={isActive ? 'Stop conversation' : 'Start conversation'}
          >
            {isActive ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </>
  );
};
