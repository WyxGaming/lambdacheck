"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mail } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authErrorMessage,
  confirmationRedirectUrl,
  getSupabase,
  isAuthConfigured,
} from "@/lib/supabase";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { emailConfirmed, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const configured = isAuthConfigured();
  const title = mode === "signup" ? "Créer un compte" : "Connexion";
  const description =
    mode === "signup"
      ? "Inscrivez-vous avec votre e-mail professionnel. Un lien de confirmation vous sera envoyé."
      : "Connectez-vous pour accéder aux mesures. Les photos restent dans votre navigateur.";

  useEffect(() => {
    if (user && emailConfirmed) {
      router.replace("/");
    }
  }, [user, emailConfirmed, router]);

  if (!configured) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            L’identification n’est pas encore branchée sur ce déploiement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Configuration requise</AlertTitle>
            <AlertDescription>
              Créez un projet sur supabase.com, puis ouvrez Project Settings
              (engrenage) → API. Copiez l’URL et la clé <code>anon public</code>.
              Confirmation d’e-mail : Authentication → Sign In / Providers →
              Email → Confirm email. Redirect URL :{" "}
              <code>https://lambdacheck1.vercel.app/confirmation</code>. Collez{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans Vercel, puis
              redéployez. Les photos restent locales.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Indiquez une adresse e-mail valide.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError("Service d’identification indisponible.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signError } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: {
            emailRedirectTo: confirmationRedirectUrl(),
          },
        });
        if (signError) {
          setError(authErrorMessage(signError.message));
          return;
        }
        if (data.user && !data.session) {
          setInfo(
            "Un e-mail de confirmation a été envoyé. Ouvrez le lien pour activer votre compte, puis connectez-vous.",
          );
          return;
        }
        if (data.session) {
          router.replace("/");
          return;
        }
        setInfo("Vérifiez votre boîte de réception pour confirmer l’inscription.");
        return;
      }

      const { error: signError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (signError) {
        setError(authErrorMessage(signError.message));
        return;
      }
      router.replace("/");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? authErrorMessage(caught.message)
          : "Une erreur est survenue.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const supabase = getSupabase();
    const trimmed = email.trim().toLowerCase();
    if (!supabase || !trimmed.includes("@")) {
      setError("Indiquez l’e-mail utilisé à l’inscription pour renvoyer le lien.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: trimmed,
      options: { emailRedirectTo: confirmationRedirectUrl() },
    });
    setBusy(false);
    if (resendError) {
      setError(authErrorMessage(resendError.message));
      return;
    }
    setInfo("Si un compte existe pour cet e-mail, un nouveau lien a été envoyé.");
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="prenom.nom@cabinet.fr"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Au moins 8 caractères"
            />
          </div>
          {mode === "signup" && (
            <div className="grid gap-1.5">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Impossible de continuer</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {info && (
            <Alert>
              <Mail />
              <AlertTitle>Vérifiez votre e-mail</AlertTitle>
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={busy} className="mt-1">
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            {mode === "signup" ? "S’inscrire" : "Se connecter"}
          </Button>
        </form>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {mode === "signup" ? (
            <p>
              Déjà un compte ?{" "}
              <Link href="/connexion" className="text-primary underline-offset-4 hover:underline">
                Connexion
              </Link>
            </p>
          ) : (
            <>
              <p>
                Pas encore de compte ?{" "}
                <Link href="/inscription" className="text-primary underline-offset-4 hover:underline">
                  Inscription
                </Link>
              </p>
              <button
                type="button"
                className="text-left text-primary underline-offset-4 hover:underline"
                onClick={() => void resend()}
                disabled={busy}
              >
                Renvoyer l’e-mail de confirmation
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AuthPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      {children}
    </main>
  );
}
