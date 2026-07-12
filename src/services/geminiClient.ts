import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

/**
 * Returns the shared GoogleGenAI client, creating it on first use.
 * A module-level singleton avoids re-instantiating the client on
 * every React render.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.',
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
