import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  if (!url.startsWith("https://") || anonKey.length < 20) return null;
  return { url, anonKey };
}

export function isAuthConfigured(): boolean {
  return getSupabaseConfig() != null;
}

let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  if (browserClient) return browserClient;
  browserClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return browserClient;
}

export function confirmationRedirectUrl(): string {
  if (typeof window === "undefined") return "/confirmation";
  return `${window.location.origin}/confirmation`;
}

export function authErrorMessage(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "Un compte existe déjà avec cet e-mail. Connectez-vous, ou réinitialisez le mot de passe.";
  }
  if (text.includes("invalid login") || text.includes("invalid credentials")) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirmez d’abord votre e-mail via le lien reçu à l’inscription.";
  }
  if (text.includes("password") && text.includes("least")) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  if (text.includes("signup is disabled")) {
    return "Les inscriptions sont temporairement fermées.";
  }
  return message;
}
