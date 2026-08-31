"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";

export function AccountNav() {
  const pathname = usePathname();
  const { configured, loading, user, emailConfirmed } = useAuth();
  const onHome = pathname === "/";

  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    window.location.href = "/connexion";
  };

  if (!configured) {
    return (
      <>
        {onHome && (
          <>
            <a
              href="#protocole"
              className="hidden text-muted-foreground hover:text-foreground sm:inline"
            >
              Protocole
            </a>
            <a
              href="#mesure"
              className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/85"
            >
              Mesurer
            </a>
          </>
        )}
      </>
    );
  }

  if (loading) {
    return <span className="text-xs text-muted-foreground">Session…</span>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {emailConfirmed && onHome && (
          <a
            href="#mesure"
            className="hidden rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/85 sm:inline"
          >
            Mesurer
          </a>
        )}
        <span
          className="hidden max-w-44 truncate text-xs sm:inline"
          title={user.email ?? undefined}
        >
          {emailConfirmed ? (
            <span className="text-muted-foreground">{user.email}</span>
          ) : (
            <span className="text-amber-800">Confirmez {user.email}</span>
          )}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
          <LogOut />
          Déconnexion
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/connexion"
        className="text-muted-foreground hover:text-foreground"
      >
        Connexion
      </Link>
      <Link
        href="/inscription"
        className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/85"
      >
        Inscription
      </Link>
    </div>
  );
}
