export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    message: string,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export class DependencyError extends Error {
  constructor(
    public readonly dependency: string,
    public readonly endpoint: string,
    message = "Dependency unavailable"
  ) {
    super(message);
  }
}
