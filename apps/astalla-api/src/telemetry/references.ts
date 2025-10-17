interface SuggestionAcceptedEvent {
  type: 'suggestionAccepted';
  kind: string;
  editDistance: number | null;
  timestamp: string;
}

interface QuickFixAppliedEvent {
  type: 'quickFixApplied';
  codeSnippet: string;
  timestamp: string;
}

interface ParseErrorEvent {
  type: 'parseError';
  message: string | null;
  timestamp: string;
}

interface ExecErrorEvent {
  type: 'execError';
  message: string | null;
  timestamp: string;
}

export type ReferenceTelemetryEvent =
  | SuggestionAcceptedEvent
  | QuickFixAppliedEvent
  | ParseErrorEvent
  | ExecErrorEvent;

const events: ReferenceTelemetryEvent[] = [];

const MAX_SNIPPET_LENGTH = 200;

function sanitizeSnippet(snippet: string): string {
  return snippet.replace(/\s+/g, ' ').slice(0, MAX_SNIPPET_LENGTH);
}

function sanitizeMessage(message?: string): string | null {
  if (!message) {
    return null;
  }
  return message.slice(0, 200);
}

export const referencesTelemetry = {
  suggestionAccepted(kind: string, editDistance: number | null) {
    events.push({
      type: 'suggestionAccepted',
      kind,
      editDistance,
      timestamp: new Date().toISOString(),
    });
  },
  quickFixApplied(code: string) {
    events.push({
      type: 'quickFixApplied',
      codeSnippet: sanitizeSnippet(code),
      timestamp: new Date().toISOString(),
    });
  },
  parseError(details?: { message?: string }) {
    events.push({
      type: 'parseError',
      message: sanitizeMessage(details?.message),
      timestamp: new Date().toISOString(),
    });
  },
  execError(details?: { message?: string }) {
    events.push({
      type: 'execError',
      message: sanitizeMessage(details?.message),
      timestamp: new Date().toISOString(),
    });
  },
  drain(): ReferenceTelemetryEvent[] {
    const copy = [...events];
    events.length = 0;
    return copy;
  },
};
