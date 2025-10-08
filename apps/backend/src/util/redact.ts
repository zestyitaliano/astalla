const SENSITIVE_KEYWORDS = [
  "token",
  "secret",
  "password",
  "key",
  "credential",
  "auth",
  "client",
  "bearer",
  "signature"
];

function shouldRedact(key: string) {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function maskValue(value: unknown) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 0 ? "••••" : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return "••••";
  }
  return "••••";
}

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        if (shouldRedact(key)) {
          return [key, maskValue(entry)];
        }
        return [key, redactSensitive(entry)];
      })
    );
  }

  return value;
}
