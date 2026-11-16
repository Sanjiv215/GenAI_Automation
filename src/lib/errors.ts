import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface StandardErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown[],
  headers?: HeadersInit
): NextResponse<StandardErrorPayload> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    },
    { status, headers }
  );
}

export function handleZodError(err: ZodError): NextResponse<StandardErrorPayload> {
  const details = err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  return createErrorResponse(400, "VALIDATION_ERROR", "Invalid request payload", details);
}
