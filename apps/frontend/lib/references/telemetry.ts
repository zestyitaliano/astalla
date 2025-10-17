import { apiBaseUrl } from "@/lib/utils";

type SuggestionAcceptedPayload = {
  event: "suggestionAccepted";
  kind: string;
  editDistance: number | null;
};

type QuickFixAppliedPayload = {
  event: "quickFixApplied";
  code: string;
};

type ParseErrorPayload = {
  event: "parseError";
  message?: string;
};

type ExecErrorPayload = {
  event: "execError";
  message?: string;
};

type TelemetryPayload =
  | SuggestionAcceptedPayload
  | QuickFixAppliedPayload
  | ParseErrorPayload
  | ExecErrorPayload;

async function sendTelemetry(payload: TelemetryPayload) {
  try {
    await fetch(`${apiBaseUrl}/api/references/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[references] Failed to send telemetry", error);
    }
  }
}

export function logSuggestionAccepted(kind: string, editDistance: number | null) {
  void sendTelemetry({ event: "suggestionAccepted", kind, editDistance });
}

export function logQuickFixApplied(code: string) {
  void sendTelemetry({ event: "quickFixApplied", code });
}

export function logParseError(message?: string) {
  void sendTelemetry({ event: "parseError", message });
}

export function logExecError(message?: string) {
  void sendTelemetry({ event: "execError", message });
}
