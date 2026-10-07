import { NextResponse } from "next/server";
import type { ApiError } from "./types";

export function fail(status: number, code: string, message: string, headers?: HeadersInit) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status, headers });
}
