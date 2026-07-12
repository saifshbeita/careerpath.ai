<div align="center">

# careerpath.ai

### An AI career coach that interviews you by voice and builds your personalized career roadmap

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?logo=tailwindcss&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-blue?logo=google)

</div>

---

## What it does

careerpath.ai holds a natural, spoken interview with you — no forms, no quizzes. A warm AI coach asks 5–7 adaptive questions about what energizes you, what you're naturally good at, and what you value. When the interview ends, a second model analyzes the full transcript and produces a structured report:

- A **profile summary** of your traits and strengths
- A **primary career direction** with rationale, plus alternatives
- Recommended **university majors**
- A **skills development plan** (technical + soft skills, each with a concrete starting point)
- A phased **6–12 month learning roadmap** with checklists
- **Starter projects** and **action items for this week**

A visual "career constellation" maps your profile to the primary and alternative paths.

## How it works

The app uses three Gemini models, each for the job it's best at:

| Stage | Model | Role |
|---|---|---|
| Greeting | `gemini-2.5-flash-preview-tts` | Synthesizes the spoken welcome message |
| Interview | `gemini-2.5-flash-native-audio` (Live API) | Realtime bidirectional voice conversation with live transcription |
| Analysis | `gemini-2.5-pro` | Deep reasoning over the transcript to generate the career report |

Microphone audio is captured with the Web Audio API, converted to 16-bit PCM, and streamed to the Gemini Live API over a websocket session. The model's audio replies stream back as PCM chunks that are scheduled gaplessly for playback, with barge-in support — start talking and the coach stops mid-sentence.

## Getting started

**Prerequisites:** Node.js 20+, a browser with microphone access, and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/saifshbeita/careerpath.ai.git
cd careerpath.ai
npm install
cp .env.example .env   # then paste your GEMINI_API_KEY into .env
npm run dev            # http://localhost:3000
```

Other scripts:

```bash
npm run build       # typecheck + production build
npm run preview     # serve the production build locally
npm run typecheck   # strict TypeScript check only
```

> **Note:** This is a client-side demo, so the API key is embedded in the browser bundle. Use a restricted key, and put the calls behind a small backend proxy before deploying publicly.

## Project structure

```
src/
├── App.tsx                  # Composition layer: mode switching + analysis flow
├── main.tsx                 # Entry point
├── components/              # Presentational components
│   ├── WelcomeScreen.tsx
│   ├── InterviewPanel.tsx   # Live chat transcript + mic control
│   ├── AnalysisPanel.tsx    # Report rendering
│   ├── Sidebar.tsx
│   ├── CareerPathGraph.tsx  # Career constellation visualization
│   ├── MarkdownRenderer.tsx
│   └── icons.tsx
├── hooks/
│   └── useVoiceSession.ts   # Mic capture, live session, audio playback, transcript
├── services/
│   ├── geminiClient.ts      # Shared client singleton
│   ├── speech.ts            # Text-to-speech
│   └── analysis.ts          # Career report generation
├── utils/
│   ├── audio.ts             # PCM encoding/decoding
│   └── reportParser.ts      # Structured extraction from the report
└── constants/               # Prompts, model ids, audio config
```

## Tech stack

- **React 19 + TypeScript (strict)** — UI and type safety
- **Vite 6** — dev server and bundling
- **Tailwind CSS 4** — styling via the first-party Vite plugin
- **@google/genai** — Gemini Live API, TTS, and text generation
- **Web Audio API** — realtime PCM capture and gapless playback
