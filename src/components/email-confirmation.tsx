"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, MailWarning } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";

export function EmailConfirmation() {
  const router = useRouter();
  const { emailConfirmed, loading, user } = useAuth();
  const [status, setStatus] = useState<"wait" | "ok" | "error">("wait");
  const [detail, setDetail] = useState("Validation du lien de confirmation…");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setStatus("error");
      setDetail("Service d’identification indisponible.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const otpType = params.get("type");
    const errorDescription = params.get("error_description");
    if (errorDescription) {
      setStatus("error");
      setDetail(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setStatus("error");
          setDetail(error.message);
          return;
        }
      } else if (tokenHash) {
        const type: EmailOtpType =
          otpType === "signup" ||
          otpType === "invite" ||
          otpType === "magiclink" ||
          otpType === "recovery" ||
          otpType === "email_change" ||
          otpType === "email"
            ? otpType
            : "email";
        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        if (cancelled) return;
        if (error) {
          setStatus("error");
          setDetail(error.message);
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const confirmed = Boolean(
        data.session?.user.email_confirmed_at ||
          data.session?.user.confirmed_at,
      );
      if (confirmed) {
        setStatus("ok");
        setDetail("Votre e-mail est confirmé. Vous pouvez mesurer.");
        window.setTimeout(() => router.replace("/"), 1200);
        return;
      }
      setStatus("error");
      setDetail(
        "Lien invalide ou expiré. Demandez un nouvel e-mail depuis la page de connexion.",
      );
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!loading && user && emailConfirmed) {
      setStatus("ok");
    }
  }, [loading, user, emailConfirmed]);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">
          Confirmation de l’e-mail
        </CardTitle>
        <CardDescription>
          Après le clic dans votre boîte de réception, votre compte est
          activé.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 text-sm">
          {status === "wait" ? (
            <LoaderCircle className="mt-0.5 size-5 animate-spin text-primary" />
          ) : status === "ok" ? (
            <CheckCircle2 className="mt-0.5 size-5 text-teal-700" />
          ) : (
            <MailWarning className="mt-0.5 size-5 text-destructive" />
          )}
          <p className="text-muted-foreground">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/85"
          >
            Aller aux mesures
          </Link>
          <Link
            href="/connexion"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Connexion
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
