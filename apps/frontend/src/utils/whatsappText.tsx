import React from 'react';

type FormatMarker = '*' | '_' | '~';

const URL_PATTERN = /https?:\/\/[^\s]+/g;

function findClosingMarker(text: string, start: number, marker: string, markerLength = 1): number {
  for (let index = start + markerLength; index < text.length; index += 1) {
    if (text.slice(index, index + markerLength) === marker && index > start + markerLength) {
      return index;
    }
  }
  return -1;
}

function wrapFormatted(
  marker: FormatMarker,
  key: string,
  children: React.ReactNode[],
): React.ReactElement {
  const content = children.length === 1 ? children[0] : children;

  switch (marker) {
    case '*':
      return <strong key={key}>{content}</strong>;
    case '_':
      return <em key={key}>{content}</em>;
    case '~':
      return <del key={key}>{content}</del>;
    default:
      return <span key={key}>{content}</span>;
  }
}

function linkifyPlainText(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const rawUrl = match[0];
    const trailingMatch = rawUrl.match(/[),.!?;:]+$/);
    const url = trailingMatch ? rawUrl.slice(0, -trailingMatch[0].length) : rawUrl;
    const trailing = trailingMatch?.[0] ?? '';

    nodes.push(
      <a
        key={`${keyPrefix}-url-${match.index}`}
        href={url}
        className="wa-bubble__link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {url}
      </a>,
    );

    if (trailing) {
      nodes.push(trailing);
    }

    lastIndex = match.index + rawUrl.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function parseFormattedSegment(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let index = 0;
  let plain = '';

  const flushPlain = () => {
    if (!plain) return;
    nodes.push(...linkifyPlainText(plain, `${keyPrefix}-plain-${nodes.length}`));
    plain = '';
  };

  while (index < text.length) {
    if (text.startsWith('```', index)) {
      const close = text.indexOf('```', index + 3);
      if (close > index + 3) {
        flushPlain();
        const inner = text.slice(index + 3, close);
        nodes.push(
          <code key={`${keyPrefix}-mono-${index}`} className="wa-bubble__mono">
            {inner}
          </code>,
        );
        index = close + 3;
        continue;
      }
    }

    const marker = text[index] as FormatMarker;
    if (marker === '*' || marker === '_' || marker === '~') {
      const close = findClosingMarker(text, index, marker);
      if (close > index + 1) {
        flushPlain();
        const inner = text.slice(index + 1, close);
        const innerNodes = parseFormattedSegment(inner, `${keyPrefix}-${marker}-${index}`);
        nodes.push(wrapFormatted(marker, `${keyPrefix}-fmt-${index}`, innerNodes));
        index = close + 1;
        continue;
      }
    }

    plain += text[index];
    index += 1;
  }

  flushPlain();
  return nodes;
}

export function stripWhatsAppFormatting(text: string): string {
  let result = '';
  let index = 0;

  while (index < text.length) {
    if (text.startsWith('```', index)) {
      const close = text.indexOf('```', index + 3);
      if (close > index + 3) {
        result += text.slice(index + 3, close);
        index = close + 3;
        continue;
      }
    }

    const marker = text[index];
    if (marker === '*' || marker === '_' || marker === '~') {
      const close = findClosingMarker(text, index, marker);
      if (close > index + 1) {
        result += text.slice(index + 1, close);
        index = close + 1;
        continue;
      }
    }

    result += text[index];
    index += 1;
  }

  return result;
}

interface FormattedMessageTextProps {
  text: string;
  className?: string;
}

export const FormattedMessageText: React.FC<FormattedMessageTextProps> = ({ text, className }) => {
  const content = parseFormattedSegment(text, 'wa-msg');
  return <div className={className}>{content}</div>;
};
