
export enum AppStatus {
  IDLE,
  CONNECTING,
  LISTENING,
  SPEAKING,
  ERROR,
}

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
}
