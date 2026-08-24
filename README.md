# LambdaCOR

Outil web pour **orthoptistes** et **ophtalmologistes** : calcul de l’**angle lambda** de chaque œil à partir de photographies **monoculaires** avec **reflets cornéens** (premier Purkinje).

Formule **KappaView** (Hôpital Necker-Enfants malades). Les photos restent dans le navigateur.

## Démarrage

```bash
npm install
npm run dev
```

Ouvrez [http://127.0.0.1:43127](http://127.0.0.1:43127).

```bash
npm test    # vérifie la formule KappaView et la géométrie
npm run build
```

## Mesure

1. Photographiez chaque œil en vision monoculaire (œil controlatéral occlus), patient de face, regard sur l’objectif, limbe entier visible, reflet net.
2. Importez OD puis OS, ou chargez l’exemple pédagogique.
3. Placez cinq curseurs : limbe nasal, limbe temporal, bord pupillaire nasal, bord pupillaire temporal, reflet de Purkinje.
4. Indiquez le WtW et la DAC s’ils sont connus ; sinon 11,71 mm et 3,4 mm. Sur la photo, le WtW correspond à limbe nasal → limbe temporal.
5. Lisez λ, le diamètre pupillaire et la correctopie, puis copiez le compte-rendu.

## Formule (KappaView4)

```
ratio_λ     = NPPI / pupil_NPTP
Ø pupille   = (WtW × pupil_NPTP / cornee_NLTL) × 0.86
correctopie = ((cornee_NLTL/2) − (pupil_NPTP/2 + iris_nasal)) × (WtW / cornee_NLTL)
λ           = 1.0455 × atan((Øp/2 − ratio_λ × Øp) / DAC) − 0.0329
```

(`atan` en degrés.)

| Grandeur photo | Curseurs |
| --- | --- |
| `cornee_NLTL` (WtW) | limbe nasal → limbe temporal |
| `pupil_NPTP` | bord pupillaire nasal → bord pupillaire temporal |
| `NPPI` | bord pupillaire nasal → reflet de Purkinje |
| `iris_nasal` | limbe nasal → bord pupillaire nasal |

Le WtW et la DAC sont saisis par le clinicien. S’ils sont inconnus : **11,71 mm** et **3,4 mm**. Sur la photo, le WtW correspond à la distance limbe nasal – limbe temporal.

Implémentation : `src/lib/lambda.ts` (`computeAngleLambda`).

Convention d’image : patient de face, photo non retournée. Nasal à droite pour l’OD, à gauche pour l’OS.

## Pile

Next.js, TypeScript, Tailwind CSS, shadcn/ui. Tout le traitement d’image est côté client.
