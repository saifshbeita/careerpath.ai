import { ANALYSIS_MODEL } from '../constants/models';
import { ANALYSIS_SYSTEM_INSTRUCTION } from '../constants/prompts';
import { parseAnalysisResponse } from '../utils/reportParser';
import type { AnalysisResult, TranscriptEntry } from '../types';
import { getGeminiClient } from './geminiClient';

/** Formats the interview transcript as plain text for the analysis model. */
function formatTranscript(transcript: TranscriptEntry[]): string {
  return transcript
    .map((entry) => `${entry.speaker === 'user' ? 'User' : 'Coach'}: ${entry.text}`)
    .join('\n\n');
}

/**
 * Sends the finished interview transcript to the analysis model and
 * returns the parsed career report.
 */
export async function generateCareerAnalysis(
  transcript: TranscriptEntry[],
): Promise<AnalysisResult> {
  const response = await getGeminiClient().models.generateContent({
    model: ANALYSIS_MODEL,
    contents: formatTranscript(transcript),
    config: { systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION },
  });

  return parseAnalysisResponse(response.text ?? '');
}
