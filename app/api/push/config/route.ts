import { NextResponse } from "next/server";
import { getPushPublicConfig } from "@/modules/notifications/server/config";

export const runtime = "nodejs";

export function GET() {
  const config = getPushPublicConfig();
  return NextResponse.json(config, { status: 200 });
}
