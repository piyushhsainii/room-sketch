export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;

    if (typeof rec.message === "string") return rec.message;
    if (typeof rec.error === "string") return rec.error;

    const nested = rec.error;
    if (nested && typeof nested === "object") {
      const nrec = nested as Record<string, unknown>;
      if (typeof nrec.message === "string") return nrec.message;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return "unknown_error";
    }
  }

  return String(err);
}
