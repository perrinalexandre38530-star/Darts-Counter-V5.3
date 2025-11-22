// ============================================
// src/lib/supabaseClient.ts
// Client Supabase unique pour toute l'app
// ============================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabaseClient] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants. " +
      "Vérifie ton fichier .env / variables StackBlitz."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
