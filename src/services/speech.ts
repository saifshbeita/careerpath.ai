import { Modality } from '@google/genai';

import { COACH_VOICE, TTS_MODEL } from '../constants/models';
import { base64ToBytes } from '../utils/audio';
import { getGeminiClient } from './geminiClient';

/**
 * Synthesizes speech for the given text using the coach voice.
 * Returns the raw 16-bit PCM bytes, or null if the model returned no audio.
 */
export async function synthesizeSpeech(text: string): Promise<Uint8Array | null> {
  const response = await getGeminiClient().models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: COACH_VOICE } },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio ? base64ToBytes(base64Audio) : null;
}
