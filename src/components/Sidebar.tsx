import type { AppMode } from '../types';
import { CheckCircleIcon, RestartIcon } from './icons';

interface SidebarProps {
  mode: AppMode;
  isAnalyzing: boolean;
  profileSummary: string;
  onReset: () => void;
}

/** Extracts the bullet lines from the model's sidebar summary. */
function summaryBullets(summary: string): string[] {
  return summary
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.replace(/^- /, ''));
}

/** Branding, session status, key insights, and the reset control. */
export const Sidebar = ({ mode, isAnalyzing, profileSummary, onReset }: SidebarProps) => (
  <div className="w-1/3 p-6 flex flex-col bg-slate-50/50 border-r border-slate-200/80 overflow-y-auto">
    <div className="flex justify-between items-center mb-8 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-800 rounded-lg shadow-sm"></div>
        <h2 className="text-lg font-bold text-slate-800">careerpath.ai</h2>
      </div>
      <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
    </div>
    <p className="text-slate-500 mb-8 flex-shrink-0">
      {mode === 'INTERVIEW' ? 'Interview in progress...' : 'Your personalized report.'}
    </p>

    {mode === 'ANALYSIS' && !isAnalyzing && profileSummary && (
      <div className="mb-8 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Key Insights
        </h3>
        <ul className="text-slate-600 text-sm space-y-2.5">
          {summaryBullets(profileSummary).map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircleIcon className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    <div className="mt-auto flex-shrink-0">
      <button
        onClick={onReset}
        className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm border border-slate-200"
      >
        <RestartIcon />
        Start Over
      </button>
    </div>
  </div>
);
