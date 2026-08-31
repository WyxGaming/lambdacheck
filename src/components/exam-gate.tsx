"use client";

import Link from "next/link";
import { ExamWorkspace } from "@/components/exam-workspace";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export function ExamGate() {
  const { configured, loading, session, emailConfirmed } = useAuth();

  if (!configured) {
    return <ExamWorkspace />;
  }

  if (loading) {
    return (
      <p
        id="mesure"
        className="scroll-mt-24 rounded-xl border border-border/80 bg-card px-4 py-8 text-center text-sm text-muted-foreground"
      >
        Vérification du compte…
      </p>
    );
  }

  if (!session || !emailConfirmed) {
    return (
      <div
        id="mesure"
        className="scroll-mt-24 rounded-xl border border-border/80 bg-card px-5 py-8 text-center shadow-sm"
      >
        <h2 className="font-heading text-lg font-semibold">Compte clinicien requis</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Les mesures LambdaCheck sont réservées aux comptes confirmés. Créez un accès
          avec votre e-mail professionnel, confirmez le lien reçu, puis connectez-vous.
          Les photos restent locales au navigateur.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button nativeButton={false} render={<Link href="/inscription" />}>
            Créer un compte
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/connexion" />}
          >
            Connexion
          </Button>
        </div>
      </div>
    );
  }

  return <ExamWorkspace />;
}
