"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <div className="leading-tight">
            <p className="font-heading text-lg tracking-tight">LambdaCOR</p>
            <p className="text-[11px] text-muted-foreground">
              Angle lambda photographique
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#protocole" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Protocole
          </a>
          <a href="#formule" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Formule
          </a>
          <a
            href="#mesure"
            className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/85"
          >
            Nouvelle mesure
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p>
          LambdaCOR est un outil d’aide à la mesure pour orthoptistes et
          ophtalmologistes. Il ne remplace pas l’examen clinique. Les
          photographies restent dans le navigateur et ne sont pas transmises à
          un serveur.
        </p>
        <p>
          Formule KappaView (Hôpital Necker-Enfants malades). Les photographies
          restent dans le navigateur.
        </p>
      </div>
    </footer>
  );
}

function LogoMark() {
  return (
    <svg
      viewBox="0 0 40 40"
      className="size-9"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" className="fill-primary" />
      <ellipse cx="20" cy="20" rx="13" ry="8" className="fill-primary-foreground/15" />
      <circle cx="20" cy="20" r="5.5" className="fill-primary-foreground/90" />
      <circle cx="20" cy="20" r="2.6" className="fill-primary" />
      <circle cx="23.2" cy="17.6" r="1.4" className="fill-white" />
    </svg>
  );
}
