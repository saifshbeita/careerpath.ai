interface MarkdownRendererProps {
  content: string;
}

/** Escapes HTML metacharacters so raw model/user text can't inject markup. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Lightweight renderer for the model-generated report markdown.
 * Supports the subset of markdown the analysis prompt asks for: headings,
 * bold, inline code, checklists, and ordered/unordered lists.
 *
 * The report can echo back text the user spoke during the interview, so
 * HTML is escaped first — this is not merely trusted model output.
 */
export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  const htmlContent = escapeHtml(content)
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-slate-800 mb-6">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-slate-700 mt-8 mb-4">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-slate-700 mt-6 mb-3">$1</h3>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-200 text-slate-800 font-mono text-sm px-1.5 py-0.5 rounded">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
    .replace(
      /- \[ \] (.*)/gim,
      '<li class="flex items-center gap-3 mb-2"><div class="w-4 h-4 border-2 border-slate-400 rounded"></div><span class="flex-1">$1</span></li>',
    )
    .replace(/(\d)\. (.*?)(<br \/>|$)/gim, '<li class="ml-4 list-decimal mb-2">$2</li>')
    .replace(/^- (.*?)(<br \/>|$)/gim, '<li class="ml-4 list-disc mb-2">$1</li>')
    .replace(/\n/g, '<br />');

  return (
    <div
      className="text-slate-600 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
