"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

const ExamWorkspace = dynamic(
  () =>
    import("@/components/exam-workspace").then((mod) => mod.ExamWorkspace),
  {
    ssr: false,
    loading: () => (
      <p
        id="mesure"
        className="scroll-mt-24 rounded-xl border border-border/80 bg-card px-4 py-8 text-center text-sm text-muted-foreground"
      >
        Chargement du module de mesure…
      </p>
    ),
  },
);

export function ExamGate() {
  const { loading, session, emailConfirmed } = useAuth();

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
        <h2 className="font-heading text-lg font-semibold">
          Connexion obligatoire
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Le module de mesure n’est accessible qu’avec un compte clinicien
          confirmé. Inscrivez-vous avec votre e-mail professionnel, ouvrez le
          lien reçu, puis connectez-vous. Les photos restent dans le
          navigateur.
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
