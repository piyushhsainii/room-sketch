export class McpToolError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'McpToolError';
  }
}

export function publicError(error: unknown) {
  if (error instanceof McpToolError) return { code: error.code, message: error.message, details: error.details };
  return { code: 'internal_error', message: 'RoomSketch could not complete this operation. Try again with the same request_id.' };
}
