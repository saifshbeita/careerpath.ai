import type { AnalysisResult } from '../types';
import { CareerPathGraph } from './CareerPathGraph';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AnalysisPanelProps {
  isAnalyzing: boolean;
  analysis: AnalysisResult | null;
}

/** Shows the analysis progress spinner, then the full career report. */
export const AnalysisPanel = ({ isAnalyzing, analysis }: AnalysisPanelProps) => (
  <div className="flex-1 overflow-y-auto p-4 md:p-8">
    {isAnalyzing || !analysis ? (
      <div className="flex flex-col items-center justify-center h-full text-slate-600">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-700"></div>
        <p className="mt-4 text-lg font-medium">Analyzing your profile...</p>
        <p className="text-sm">This may take a moment.</p>
      </div>
    ) : (
      <>
        <MarkdownRenderer content={analysis.report} />
        <CareerPathGraph paths={analysis.careerPaths} />
      </>
    )}
  </div>
);
