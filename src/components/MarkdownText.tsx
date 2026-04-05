'use client';

// ============================================================
// MarkdownText -- lightweight markdown renderer for chat
// Handles: **bold**, *italic*, `code`, lists, line breaks
// No external dependency needed
// ============================================================

interface MarkdownTextProps {
  text: string;
  className?: string;
}

export function MarkdownText({ text, className }: MarkdownTextProps) {
  const lines = text.split('\n');

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Empty line = spacing
        if (!trimmed) return <div key={i} className="h-2" />;

        // List items
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-primary">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-primary font-bold">{numberedMatch[1]}.</span>
              <span>{renderInline(numberedMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

// Render inline markdown: **bold**, *italic*, `code`, "quotes"
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
      }
      parts.push(<strong key={key++} className="font-bold text-primary">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // *italic*
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, italicMatch.index)}</span>);
      }
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // `code`
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>);
      }
      parts.push(
        <code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // "quoted text"
    const quoteMatch = remaining.match(/"(.+?)"/);
    if (quoteMatch && quoteMatch.index !== undefined) {
      if (quoteMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, quoteMatch.index)}</span>);
      }
      parts.push(
        <span key={key++} className="text-primary font-medium">&ldquo;{quoteMatch[1]}&rdquo;</span>
      );
      remaining = remaining.slice(quoteMatch.index + quoteMatch[0].length);
      continue;
    }

    // No more patterns, push the rest
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return <>{parts}</>;
}
