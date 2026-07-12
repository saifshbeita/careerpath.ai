/** Sample rate (Hz) the Gemini Live API expects for microphone input. */
export const MIC_SAMPLE_RATE = 16_000;

/** Sample rate (Hz) of the PCM audio Gemini streams back to the client. */
export const OUTPUT_SAMPLE_RATE = 24_000;

/** Buffer size for the ScriptProcessorNode that captures microphone audio. */
export const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;
