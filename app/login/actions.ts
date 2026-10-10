"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type DemoActionState = {
  error: string | null;
};

export async function signInDemo(
  previousState: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  void previousState;
  void formData;

  const supabase = await createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.signInAnonymously();

    if (error || !user) {
      return { error: "Gagal memulai akun demo. Silakan coba lagi." };
    }
  } catch {
    return { error: "Gagal memulai akun demo. Silakan coba lagi." };
  }

  try {
    const { error } = await supabase.rpc("seed_demo_data");

    if (error) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore cleanup failures and return the friendly seed error below.
      }

      return { error: "Gagal menyiapkan data demo. Silakan coba lagi." };
    }
  } catch {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore cleanup failures and return the friendly seed error below.
    }

    return { error: "Gagal menyiapkan data demo. Silakan coba lagi." };
  }

  redirect("/dashboard");
}
