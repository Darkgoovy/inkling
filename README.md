# Inkling — Cartes de lecture

Application web **mobile-first** pour réviser des livres sous forme de petites **cartes de lecture** (~10 min), avec suivi de progression et gamification. Lecture seule : le contenu est fourni en JSON, l'app n'écrit que la progression (localement).

> Voir les spécifications fonctionnelles complètes dans [`Spec/specs-fonctionnelles-cartes-lecture_2.md`](Spec/specs-fonctionnelles-cartes-lecture_2.md).

## Stack

- **React 18 + Vite + TypeScript**
- **CSS Modules + variables CSS** (thèmes clair/sombre pastels, `prefers-reduced-motion`)
- **Framer Motion** (swipe entre cartes, transitions, animations de récompense)
- **react-router-dom** (HashRouter — compatible hébergement statique)
- Persistance **locale** (`localStorage`), aucun backend.
- **PWA / hors ligne** (`vite-plugin-pwa`) : installable sur l'écran d'accueil, et
  tout (app + contenu des livres) est mis en cache pour fonctionner **sans réseau**.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173 (régénère l'index avant de lancer)
```

> `npm run dev` et `npm run build` lancent automatiquement `build:index` (étape `predev`/`prebuild`) qui exécute `build_books_index.py`. **Python 3 est requis.**

```bash
npm run build      # type-check + build de production dans dist/
npm run preview     # prévisualise le build
```

## Contenu : ajouter un livre

1. Déposez un fichier `public/books/<id>.json` conforme à la spec §4.2
   (champs `id`, `title`, `author`, `cover`, `accentColor`, `cards[]` ; chaque carte a **exactement 3 tags**).
2. Régénérez l'index : `npm run build:index` (ou laissez `predev`/`prebuild` le faire).
3. Le livre apparaît automatiquement dans la Bibliothèque.

L'index `public/books.json` est **généré** (jamais édité à la main) et ignoré par git.
Le prompt IA pour produire un livre est en Annexe A de la spec.

## Hors ligne & installation (PWA)

Après une première visite en ligne, l'app et le contenu des livres sont mis en cache :
elle se relance et se lit **entièrement hors connexion**. Sur mobile, le navigateur
propose « Ajouter à l'écran d'accueil » → elle s'ouvre alors comme une appli plein écran.

> Le service worker n'est actif que sur le **build de production** (`npm run build` puis
> `npm run preview`), pas en `npm run dev`.

## Déployer & partager le lien

C'est un site **100 % statique** (dossier `dist/`) : il faut juste l'héberger sur n'importe
quel hébergeur statique, puis partager l'URL. Aucun serveur ni base de données.

```bash
npm run build      # produit dist/
```

Options gratuites les plus simples (glisser-déposer `dist/` ou brancher le dépôt git) :

| Hébergeur | Comment |
|---|---|
| **Netlify** | netlify.com → « Add new site » → glisser le dossier `dist/`. URL immédiate. |
| **Vercel** | vercel.com → importer le dépôt git → build `npm run build`, output `dist`. |
| **GitHub Pages** | Pousser le dépôt, activer Pages sur le dossier publié (ou via une action). |
| **Cloudflare Pages** | Build `npm run build`, dossier `dist`. |

Tu obtiens une URL du type `https://inkling.netlify.app` que tu envoies par message à un ami :
il l'ouvre dans son navigateur (mobile ou desktop), peut l'installer, et toute **sa**
progression reste sur **son** appareil (le `localStorage` n'est pas partagé entre utilisateurs).

> ⚠️ La base relative est déjà configurée (`base: "./"`), donc l'app marche aussi bien à la
> racine d'un domaine que dans un sous-dossier (ex. GitHub Pages `/inkling/`).

## Structure

```
build_books_index.py        Génère public/books.json en scannant public/books/
public/books/               Fichiers de livres (1 JSON = 1 livre, lecture seule)
src/
  types.ts                  Modèle de données (contenu + état persisté)
  lib/
    books.ts                Chargement + validation des cartes (cf. §4.3)
    gamification.ts          XP, niveaux, badges, série, validation d'une carte
    storage.ts               Lecture/écriture de l'état dans localStorage
    selectors.ts             Dérivations (statut/progression d'un livre, tri…)
    useAsync.ts              Petit hook de chargement async
  state/GameContext.tsx      Store global (état, actions, application du thème)
  components/                BookCover, ProgressBar, icônes
  screens/
    Library/                 Bibliothèque (reprise, liste, progression globale)
    Reader/                  Lecture (swipe, validation, récompenses, fin de livre)
    Profile/                 Niveau, XP, série, calendrier à tampons, badges
    Settings/                Objectif quotidien, thème, réinitialisation
  styles/global.css          Design system (variables, thèmes clair/sombre)
```

## Règles de gamification (résumé)

- **+10 XP** par première lecture d'une carte ; **+50 XP** à la fin d'un livre ;
  bonus de série quotidien (`+2 XP × jour`, plafonné à 20).
- **Niveaux** : Curieux (0) → Lecteur (100) → Penseur (300) → Mentor (700) → Sage (1500).
- **Série** : jours consécutifs avec ≥1 carte validée ; remise à zéro si un jour est manqué.
- **Calendrier à tampons** : indépendant de la série — chaque jour actif garde son tampon.
- **Badges** : Premier pas, Premier livre, Régulier (7 j), Assidu (30 j), Lève-tôt, Bibliophile, Marathon.
- Seul le bouton **« J'ai lu cette carte »** valide une carte ; le swipe ne fait que naviguer.
