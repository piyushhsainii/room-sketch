export class SaveAuthError extends Error {
  constructor() {
    super("Sign in to save. Keep this editor tab open, then return here and retry.");
    this.name = "SaveAuthError";
  }
}

// The caller already opened a recovery dialog. Save still has to stop.
export class SavePromptError extends Error {}
