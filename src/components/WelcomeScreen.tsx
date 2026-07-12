import { AnalyzeIcon, ChatIcon, MicrophoneIcon, RoadmapIcon } from './icons';

interface WelcomeScreenProps {
  onStart: () => void;
}

const steps = [
  {
    Icon: ChatIcon,
    title: '1. Voice Interview',
    description:
      'Engage in a natural conversation. Just talk about your interests, skills, and passions.',
  },
  {
    Icon: AnalyzeIcon,
    title: '2. Deep Analysis',
    description:
      'Our advanced AI analyzes your responses to identify your core strengths and traits.',
  },
  {
    Icon: RoadmapIcon,
    title: '3. Personalized Roadmap',
    description:
      'Receive a comprehensive report with tailored career paths and actionable next steps.',
  },
];

/** Landing screen introducing the product and starting the interview. */
export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => (
  <div className="flex flex-col h-full">
    <header className="p-4 flex items-center justify-between border-b border-slate-200/80">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-800 rounded-lg shadow-sm"></div>
        <h1 className="text-lg font-bold text-slate-800">careerpath.ai</h1>
      </div>
      <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
    </header>
    <div className="flex flex-col items-center justify-center text-center flex-1 p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
        Discover Your Perfect Career Path
      </h1>
      <p className="text-slate-600 mt-3 text-lg max-w-2xl">
        I'm here to help you discover a fulfilling career through a friendly,
        voice-based conversation.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mt-16 text-left">
        {steps.map(({ Icon, title, description }) => (
          <div key={title} className="bg-white/50 p-6 rounded-xl shadow-sm border border-slate-200/80">
            <Icon />
            <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
            <p className="text-slate-500 text-sm">{description}</p>
          </div>
        ))}
      </div>

      <div className="w-full mt-16 max-w-sm">
        <button
          onClick={onStart}
          className="w-full bg-slate-800 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-700 transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
        >
          <MicrophoneIcon />
          Start Your Career Interview
        </button>
      </div>
    </div>
  </div>
);
