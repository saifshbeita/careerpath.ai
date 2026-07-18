import { SIDEBAR_SEPARATOR } from '../constants/prompts';
import type { AnalysisResult, CareerPaths } from '../types';

const FALLBACK_REPORT =
  'Sorry, I encountered an error while generating your career path analysis. ' +
  'The format of the response was not as expected. Please try again by starting over.';

/** Extracts the primary career direction from the markdown report. */
export function extractPrimaryPath(report: string): string | null {
  const match = report.match(/\*\*Primary Career Direction:\*\*\s*(.*)/);
  return match?.[1]?.trim() || null;
}

/** Extracts the numbered alternative career paths from the markdown report. */
export function extractAlternativePaths(report: string): string[] {
  const alternatives: string[] = [];
  // Stop only at the next markdown heading (a line starting with '#'), not
  // any bare '#' — a recommended path can itself contain one, e.g. "C#".
  const sectionMatch = report.match(
    /\*\*Alternative Paths for Consideration:\*\*\s*([\s\S]*?)(?=\n#|$)/,
  );
  if (!sectionMatch?.[1]) return alternatives;

  // Split each numbered line on " - " (the title/rationale separator from
  // the prompt spec), not on any hyphen — titles like "Full-Stack Developer"
  // contain one themselves.
  for (const match of sectionMatch[1].matchAll(/^\s*\d+\.\s*(.+?)(?=\s-\s|$)/gm)) {
    if (match[1]) alternatives.push(match[1].trim());
  }
  return alternatives;
}

/** Extracts both primary and alternative career paths from the report. */
export function extractCareerPaths(report: string): CareerPaths {
  return {
    primary: extractPrimaryPath(report),
    alternatives: extractAlternativePaths(report),
  };
}

/**
 * Splits the raw model response into the sidebar summary and the full
 * report, then extracts the structured career paths from the report.
 */
export function parseAnalysisResponse(responseText: string): AnalysisResult {
  const [rawSummary, rawReport] = responseText.split(SIDEBAR_SEPARATOR);
  const summary = rawSummary?.trim() ?? '';
  const report = rawReport?.trim() || FALLBACK_REPORT;

  return { summary, report, careerPaths: extractCareerPaths(report) };
}
