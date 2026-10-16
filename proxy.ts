import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/kategori/:path*",
    "/transaksi/:path*",
    "/ocr/:path*",
    "/profil/:path*",
    "/budget/:path*",
    "/recurring/:path*",
    "/auth/callback",
  ],
};
