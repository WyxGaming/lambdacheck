# LambdaCheck

Outil web **prêt à l’emploi** pour orthoptistes et ophtalmologistes : calcul de l’**angle lambda** de chaque œil à partir de photographies **monoculaires** avec **reflets cornéens** (premier Purkinje).

Inscription **e-mail + mot de passe**, avec **confirmation du lien** reçu. Les photos restent dans le navigateur : elles ne sont jamais envoyées au serveur d’identification.

## Utilisation (cliniciens)

Site en ligne : [https://lambdacheck1.vercel.app](https://lambdacheck1.vercel.app/)

Ouvrez-le dans un navigateur (ordinateur ou tablette). Créez un compte, confirmez l’e-mail, importez OD puis OS, posez les curseurs, lisez λ.

Sur tablette, le site peut être ajouté à l’écran d’accueil (application autonome).

## Compte clinicien

1. `/inscription` : e-mail professionnel et mot de passe (8 caractères minimum).
2. Ouvrez le lien de confirmation envoyé par e-mail (`/confirmation`).
3. `/connexion` : même e-mail et mot de passe. Un bouton permet de renvoyer le lien.

Tant que l’e-mail n’est pas confirmé, **le module de mesure reste verrouillé**. Sans compte, personne ne peut importer de photo ni calculer λ.

L’identification utilise [Supabase Auth](https://supabase.com) côté navigateur (clés publiques `NEXT_PUBLIC_*`). Copiez `.env.example` vers `.env.local` en local. Sur Vercel : Project Settings → Environment Variables, puis **redéployez** (les variables publiques sont injectées au build). Sans ces clés, l’inscription affiche « configuration requise » et les mesures restent fermées.

Dans le tableau de bord Supabase :

- Authentication → **Sign In / Providers** → Email : **Confirm email** activé
  (il n’y a plus un menu nommé seulement « Providers »)
- Project Settings (engrenage) → **API** : copier Project URL et la clé anon public
- Authentication → **URL Configuration** (pas le menu Sign In / Providers) :
  - Site URL : `https://lambdacheck1.vercel.app`
  - Redirect URLs :
    - `https://lambdacheck1.vercel.app/confirmation`
    - `http://127.0.0.1:43127/confirmation`
  Sans ça, le lien de confirmation ouvre `localhost:3000` et le navigateur affiche « impossible d’accéder au site ».

## Confidentialité

Les photographies ne quittent pas le navigateur. Le compte ne sert qu’à l’identification.

## Démarrage local

```bash
npm install
npm run dev
```

Ouvrez [http://127.0.0.1:43127](http://127.0.0.1:43127).

## Site statique (clé USB, intranet, hébergement)

Le build produit un dossier `out/` autonome : copiez-le tel quel.

```bash
npm install
npm run build
npm start          # sert le dossier out/ sur http://127.0.0.1:43127
```

Déposez `out/` sur n’importe quel serveur de fichiers statiques (Nginx, Apache, Netlify, dossier partagé). Pas de Node.js côté clinicien.

Sur Vercel, le projet sert `out/` en statique (`framework: null`). `cleanUrls` dans `vercel.json` mappe `/inscription` vers `inscription.html` (sinon la page renvoie 404).

```bash
npm test    # vérifie le calcul et la géométrie
```

## Mesure

1. Photographiez chaque œil en vision monoculaire (œil controlatéral occlus), patient de face, regard sur l’objectif, limbe entier visible, reflet net.
2. Importez OD puis OS, ou chargez l’exemple pédagogique.
3. Placez limbe nasal et temporal, puis limbe supérieur et inférieur (deux clics, comme LN et LT). Posez ensuite les quatre bords pupillaires un par un (PN, PT, PS, PI — la pupille n’est pas forcément ronde), puis le reflet de Purkinje.
4. Indiquez le WtW et la DAC s’ils sont connus ; sinon 11,71 mm et 3,4 mm. Sur la photo, le WtW correspond à limbe nasal → limbe temporal.
5. Lisez λ horizontal, λ vertical, λ oblique et l’élévation de P1 (angle du reflet par rapport à l’horizontale, depuis le centre pupillaire), les diamètres pupillaires et les correctopies, puis copiez le compte-rendu. λ nasal de 0 à 3° est physiologique ; jusqu’à 0,60° dans les autres directions.

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

Next.js (export statique), TypeScript, Tailwind CSS, shadcn/ui. Tout le traitement d’image est côté client.
