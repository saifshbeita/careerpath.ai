/** Lifecycle state of the voice session. */
export enum AppStatus {
  Idle = 'IDLE',
  Connecting = 'CONNECTING',
  Listening = 'LISTENING',
  Speaking = 'SPEAKING',
  Error = 'ERROR',
}

/** Top-level screen the application is currently showing. */
export type AppMode = 'WELCOME' | 'INTERVIEW' | 'ANALYSIS';

export type Speaker = 'user' | 'ai';

/** A single finalized utterance in the interview transcript. */
export interface TranscriptEntry {
  speaker: Speaker;
  text: string;
}

/** Career directions extracted from the generated analysis report. */
export interface CareerPaths {
  primary: string | null;
  alternatives: string[];
}

/** Fully parsed result of the post-interview career analysis. */
export interface AnalysisResult {
  /** Short bulleted profile summary shown in the sidebar. */
  summary: string;
  /** Full markdown career report. */
  report: string;
  careerPaths: CareerPaths;
}
