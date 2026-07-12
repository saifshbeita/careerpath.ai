import { useCallback, useRef, useState } from 'react';
import { Modality } from '@google/genai';
import type { Blob as GenAiBlob, LiveServerMessage } from '@google/genai';

import {
  MIC_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
  SCRIPT_PROCESSOR_BUFFER_SIZE,
} from '../constants/audio';
import { COACH_VOICE, LIVE_MODEL } from '../constants/models';
import {
  INTERVIEWER_SYSTEM_INSTRUCTION,
  INTERVIEW_COMPLETE_PHRASE,
  WELCOME_MESSAGE,
} from '../constants/prompts';
import { getGeminiClient } from '../services/geminiClient';
import { synthesizeSpeech } from '../services/speech';
import {
  bytesToBase64,
  base64ToBytes,
  float32ToInt16Pcm,
  pcm16ToAudioBuffer,
} from '../utils/audio';
import { AppStatus } from '../types';
import type { TranscriptEntry } from '../types';

/** Minimal shape of the live session object returned by ai.live.connect. */
interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: { media: GenAiBlob }) => void;
}

interface UseVoiceSessionOptions {
  /**
   * Invoked once the coach signals the interview is complete.
   * Receives the full finalized transcript; the session is stopped
   * automatically before this fires.
   */
  onInterviewComplete: (transcript: TranscriptEntry[]) => void;
}

/**
 * Owns the full lifecycle of a realtime voice interview:
 * microphone capture, the Gemini Live session, streamed audio playback,
 * and transcript accumulation.
 */
export function useVoiceSession({ onInterviewComplete }: UseVoiceSessionOptions) {
  const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimUserTranscript, setInterimUserTranscript] = useState('');
  const [interimAiTranscript, setInterimAiTranscript] = useState('');

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const interimUserRef = useRef('');
  const interimAiRef = useRef('');

  // Keep the latest callback without forcing the message handler to re-bind.
  const onCompleteRef = useRef(onInterviewComplete);
  onCompleteRef.current = onInterviewComplete;

  /** Stops any queued playback and clears the audio schedule. */
  const stopPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Source may already have finished; nothing to do.
      }
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  /** Tears down the live session, microphone, and audio contexts. */
  const stopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
      try {
        (await sessionPromiseRef.current).close();
      } catch {
        // Session already closed.
      }
      sessionPromiseRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    processorRef.current?.disconnect();
    processorRef.current = null;

    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      await inputContextRef.current.close();
    }
    if (outputContextRef.current && outputContextRef.current.state !== 'closed') {
      await outputContextRef.current.close();
    }

    stopPlayback();
    setStatus(AppStatus.Idle);
    setInterimUserTranscript('');
    setInterimAiTranscript('');
    interimUserRef.current = '';
    interimAiRef.current = '';
  }, [stopPlayback]);

  /** Schedules a chunk of streamed PCM audio for gapless playback. */
  const enqueueAudioChunk = useCallback(async (base64Audio: string) => {
    const ctx = outputContextRef.current;
    if (!ctx) return;

    setStatus(AppStatus.Speaking);
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

    const audioBuffer = await pcm16ToAudioBuffer(
      base64ToBytes(base64Audio),
      ctx,
      OUTPUT_SAMPLE_RATE,
      1,
    );

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.addEventListener('ended', () => {
      activeSourcesRef.current.delete(source);
      // Only hand the floor back to the user once the queue drains.
      if (activeSourcesRef.current.size === 0) {
        setStatus(AppStatus.Listening);
      }
    });

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    activeSourcesRef.current.add(source);
  }, []);

  /** Finalizes the interim transcripts at the end of a conversational turn. */
  const commitTurn = useCallback(() => {
    const userText = interimUserRef.current.trim();
    const aiText = interimAiRef.current.trim();

    const additions: TranscriptEntry[] = [];
    if (userText) additions.push({ speaker: 'user', text: userText });
    // An empty AI turn means the coach was interrupted mid-sentence.
    if (aiText) additions.push({ speaker: 'ai', text: aiText });

    if (additions.length > 0) {
      transcriptRef.current = [...transcriptRef.current, ...additions];
      setTranscript(transcriptRef.current);
    }

    setInterimUserTranscript('');
    setInterimAiTranscript('');
    interimUserRef.current = '';
    interimAiRef.current = '';

    if (aiText.includes(INTERVIEW_COMPLETE_PHRASE)) {
      const finalTranscript = transcriptRef.current;
      void stopSession();
      onCompleteRef.current(finalTranscript);
    }
  }, [stopSession]);

  const handleSessionMessage = useCallback(
    async (message: LiveServerMessage) => {
      // The user started speaking over the coach: cut playback and reset.
      if (message.serverContent?.interrupted) {
        stopPlayback();
        interimAiRef.current = '';
        setInterimAiTranscript('');
        setStatus(AppStatus.Listening);
      }

      if (message.serverContent?.inputTranscription) {
        const text = message.serverContent.inputTranscription.text ?? '';
        interimUserRef.current += text;
        setInterimUserTranscript(interimUserRef.current);
      } else if (message.serverContent?.outputTranscription) {
        const text = message.serverContent.outputTranscription.text ?? '';
        interimAiRef.current += text;
        setInterimAiTranscript(interimAiRef.current);
      }

      const base64Audio =
        message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        await enqueueAudioChunk(base64Audio);
      }

      if (message.serverContent?.turnComplete) {
        commitTurn();
      }
    },
    [commitTurn, enqueueAudioChunk, stopPlayback],
  );

  /** Plays the synthesized welcome greeting before the live session opens. */
  const playWelcomeMessage = useCallback(async () => {
    const ctx = outputContextRef.current;
    if (!ctx) return;

    const pcmBytes = await synthesizeSpeech(WELCOME_MESSAGE);
    if (!pcmBytes) return;

    setStatus(AppStatus.Speaking);
    transcriptRef.current = [{ speaker: 'ai', text: WELCOME_MESSAGE }];
    setTranscript(transcriptRef.current);

    const audioBuffer = await pcm16ToAudioBuffer(pcmBytes, ctx, OUTPUT_SAMPLE_RATE, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const playback = new Promise<void>((resolve) => {
      source.onended = () => resolve();
    });
    activeSourcesRef.current.add(source);
    source.start();
    await playback;
    activeSourcesRef.current.delete(source);
  }, []);

  /** Streams microphone audio into the live session as 16-bit PCM. */
  const startMicrophoneCapture = useCallback(async () => {
    const ctx = inputContextRef.current;
    if (!ctx) return;

    mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const source = ctx.createMediaStreamSource(mediaStreamRef.current);
    processorRef.current = ctx.createScriptProcessor(
      SCRIPT_PROCESSOR_BUFFER_SIZE,
      1,
      1,
    );

    processorRef.current.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const pcmBlob: GenAiBlob = {
        data: bytesToBase64(float32ToInt16Pcm(inputData)),
        mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}`,
      };
      void sessionPromiseRef.current?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(processorRef.current);
    processorRef.current.connect(ctx.destination);
  }, []);

  /** Opens the audio pipeline and connects the live interview session. */
  const startSession = useCallback(async () => {
    setStatus(AppStatus.Connecting);
    try {
      outputContextRef.current = new AudioContext({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });

      await playWelcomeMessage();

      inputContextRef.current = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });

      sessionPromiseRef.current = getGeminiClient().live.connect({
        model: LIVE_MODEL,
        callbacks: {
          onopen: () => setStatus(AppStatus.Listening),
          onmessage: handleSessionMessage,
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            setStatus(AppStatus.Error);
          },
          onclose: () => {
            // Session closed by either side; stopSession handles cleanup.
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: COACH_VOICE } },
          },
          systemInstruction: INTERVIEWER_SYSTEM_INSTRUCTION,
        },
      }) as Promise<LiveSession>;

      await startMicrophoneCapture();
    } catch (error) {
      console.error('Failed to start voice session:', error);
      setStatus(AppStatus.Error);
    }
  }, [handleSessionMessage, playWelcomeMessage, startMicrophoneCapture]);

  /** Stops the session and clears the transcript for a fresh start. */
  const resetSession = useCallback(() => {
    void stopSession();
    transcriptRef.current = [];
    setTranscript([]);
  }, [stopSession]);

  return {
    status,
    transcript,
    interimUserTranscript,
    interimAiTranscript,
    startSession,
    stopSession,
    resetSession,
  };
}
