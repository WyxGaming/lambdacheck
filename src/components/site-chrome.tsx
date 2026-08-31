import Link from "next/link";

import { cn } from "@/lib/utils";

const AFFILIATIONS = [
  {
    href: "https://hopital-necker.aphp.fr",
    src: "/affiliations/necker.png",
    alt: "Hôpital Necker-Enfants malades, hôpital universitaire",
    className: "h-14 sm:h-16",
  },
  {
    href: "https://www.aphp.fr",
    src: "/affiliations/aphp-centre.png",
    alt: "AP-HP. Centre — Université Paris Cité",
    className: "h-10 sm:h-12",
  },
  {
    href: "https://u-paris.fr",
    src: "/affiliations/universite-paris-cite.png",
    alt: "Université Paris Cité",
    className: "h-12 sm:h-14",
  },
  {
    href: "https://maladiesrares-necker.aphp.fr/ophtara/",
    src: "/affiliations/ophtara.png",
    alt: "OPHTARA — Centre de maladies rares en ophtalmologie",
    className: "h-14 sm:h-16",
  },
  {
    href: "https://centreborelli.ens-paris-saclay.fr",
    src: "/affiliations/centre-borelli.png",
    alt: "Centre Borelli",
    className: "h-12 sm:h-14",
  },
] as const;

export const LAMBDA_ARTICLE = {
  authors: "Rateaux M, Bremond-Gignac D, Robert MP",
  title:
    "From monocular photograph to angle lambda: A new clinical approach for quantitative assessment",
  journal: "J Binocul Vis Ocul Motil",
  date: "22 juin 2022",
  pages: "1‑7",
  pmid: "35731900",
  pubmedUrl: "https://pubmed.ncbi.nlm.nih.gov/35731900/",
} as const;

const CC_LICENSE = {
  href: "https://creativecommons.org/licenses/by-nc-nd/4.0/deed.fr",
  src: "/affiliations/cc-by-nc-nd.png",
  label: "Licence Creative Commons Attribution – Pas d’utilisation commerciale – Pas de modification 4.0 International",
} as const;

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <div className="leading-tight">
            <p className="font-heading text-lg tracking-tight">LambdaCheck</p>
            <p className="text-[11px] text-muted-foreground">
              Photos locales · aucun compte
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <a
            href="#affiliations"
            className="hidden text-muted-foreground hover:text-foreground sm:inline"
          >
            Affiliations
          </a>
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
        </nav>
      </div>
    </header>
  );
}

export function AffiliationLogos({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-8",
        className,
      )}
    >
      {AFFILIATIONS.map((logo) => (
        <li key={logo.src}>
          <a
            href={logo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block opacity-95 transition-opacity hover:opacity-100"
          >
            <img
              src={logo.src}
              alt={logo.alt}
              className={cn(
                "w-auto max-w-[9.5rem] object-contain object-center sm:max-w-[11rem]",
                compact ? "h-10 sm:h-12" : logo.className,
              )}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer id="affiliations" className="scroll-mt-24 border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-center text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Institutions
          </p>
          <AffiliationLogos className="mt-4" />
        </div>

        <blockquote className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
          <cite className="not-italic">
            {LAMBDA_ARTICLE.authors}. {LAMBDA_ARTICLE.title}.{" "}
            <span className="text-foreground">{LAMBDA_ARTICLE.journal}</span>.{" "}
            {LAMBDA_ARTICLE.date};{LAMBDA_ARTICLE.pages}. PubMed PMID:{" "}
            <a
              href={LAMBDA_ARTICLE.pubmedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {LAMBDA_ARTICLE.pmid}
            </a>
            .
          </cite>
        </blockquote>

        <div className="flex flex-col items-center gap-4 border-t border-border pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <a
            href={CC_LICENSE.href}
            rel="license noopener noreferrer"
            target="_blank"
            className="shrink-0"
          >
            <img
              src={CC_LICENSE.src}
              alt={CC_LICENSE.label}
              className="h-10 w-auto"
            />
          </a>
          <div className="space-y-2 text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
            <p>
              © {LAMBDA_ARTICLE.authors}. AP-HP — Hôpital Necker-Enfants
              malades, centre de maladies rares en ophtalmologie OPHTARA,
              Université Paris Cité, Centre Borelli. Tous droits réservés.
            </p>
            <p>
              LambdaCheck et ses contenus sont protégés par la{" "}
              <a
                href={CC_LICENSE.href}
                rel="license noopener noreferrer"
                target="_blank"
                className="text-foreground underline-offset-2 hover:underline"
              >
                licence CC BY-NC-ND 4.0
              </a>
              {" "}
              : attribution obligatoire, pas d’usage commercial, pas de
              modification. Toute reproduction hors de ces conditions est
              interdite.
            </p>
            <p>
              LambdaCheck est un outil d’aide à la mesure. Il ne remplace pas
              l’examen clinique. Les photographies restent dans le navigateur.
            </p>
          </div>
        </div>
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
