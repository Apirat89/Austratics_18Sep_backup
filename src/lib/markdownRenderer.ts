// Simple markdown renderer for AI responses
export function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = text;

  // Handle bold text **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Handle italic text *text* -> <em>text</em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Handle code `text` -> <code>text</code>
  html = html.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

  // Handle line breaks
  html = html.replace(/\n/g, '<br>');

  // Handle numbered lists (simple version)
  html = html.replace(/^(\d+)\.\s/gm, '<strong>$1.</strong> ');

  // Handle bullet points
  html = html.replace(/^[•\-\*]\s/gm, '• ');

  return html;
} 