export class ProductionOSError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(code: string, message: string, exitCode = 1) {
    super(message);
    this.name = "ProductionOSError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

export function assertNever(value: never): never {
  throw new ProductionOSError("INTERNAL_INVARIANT", `Unexpected value: ${String(value)}`);
}
