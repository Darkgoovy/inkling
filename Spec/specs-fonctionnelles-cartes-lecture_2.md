# Spécifications fonctionnelles — Application « Cartes de lecture »

> Application web responsive **mobile-first** permettant de réviser des livres (souvent du développement personnel) sous forme de petites cartes de lecture de ~10 minutes, avec suivi de progression et gamification.

---

## 1. Vision & objectifs

**Problème adressé.** Je lis beaucoup mais je retiens peu. J'ai besoin de réactiver le contenu des livres dans le temps, par petites doses, sans avoir à relire l'ouvrage entier.

**Solution.** Chaque livre est découpé en **cartes** (un résumé par chapitre ou sous-chapitre). Chaque matin (ou quand je le souhaite), je lis une carte en ~10 minutes. L'application m'aide à :

- consulter des résumés clairs et actionnables ;
- suivre ma progression dans chaque livre et globalement ;
- reprendre exactement là où je m'étais arrêté ;
- rester motivé grâce à une mécanique de jeu (points, niveaux, badges, série).

**Principes directeurs.**

1. **Lecture, pas saisie.** L'app est en lecture seule : le contenu est fourni, je ne le crée pas dans l'app.
2. **Une carte à la fois.** L'expérience par défaut est focalisée sur une seule carte.
3. **Frictionless.** Reprendre la lecture doit prendre 1 tap.
4. **Beau et calme.** Tons pastels et chaleureux, moderne, épuré, animations fluides.

---

## 2. Utilisateur cible

Lecteur régulier, autodidacte, qui veut transformer sa lecture passive en révision active et en passage à l'action. Usage principal **sur mobile**, le matin, en quelques minutes. Un seul utilisateur par appareil (pas de comptes pour le moment).

---

## 3. Périmètre

### Inclus (v1)

- Chargement du contenu depuis un **fichier JSON** embarqué dans l'app.
- Liste des livres avec progression.
- Lecture des cartes une par une, navigation par **swipe** gauche/droite.
- Animations de transition entre cartes.
- Suivi de progression (par livre + global) et reprise au bon endroit.
- Gamification riche : points (XP), niveaux, badges, série (streak).
- Persistance **locale** de la progression sur l'appareil.

### Exclu (v1) — pistes pour plus tard

- Création / édition de cartes dans l'app.
- Comptes utilisateurs et synchronisation multi-appareils.
- Téléchargement de packs de cartes supplémentaires depuis l'app *(prévu architecturalement, voir §11)*.
- Notifications push / rappels.
- Partage social, mode hors-ligne avancé, recherche, favoris.

---

## 4. Modèle de données

Le contenu est généré **en amont par une IA** et fourni sous forme de JSON. L'app ne modifie jamais ces fichiers ; elle ne les lit que pour le contenu, et écrit séparément la **progression** de l'utilisateur (voir §9.6).

**Principe : 1 fichier JSON = 1 livre.** Chaque livre est un fichier autonome. Un fichier **index** léger (`books.json`) liste les livres disponibles et permet d'afficher la Bibliothèque sans charger tout le contenu (les cartes ne sont chargées qu'à l'ouverture d'un livre). Cette découpe prépare aussi le téléchargement futur de livres à l'unité (voir §11).

**L'index `books.json` n'est jamais écrit à la main** : il est **généré automatiquement par un script de build** qui scanne le dossier `books/`, lit chaque fichier de livre et en extrait les métadonnées (voir §4.1 et §11).

### 4.1 Fichier index des livres (`books.json`, généré)

Produit par le script de build à partir des fichiers de livres. À ne pas éditer manuellement.

```json
{
  "version": 1,
  "books": [
    {
      "id": "atomic-habits",
      "title": "Un rien peut tout changer",
      "author": "James Clear",
      "cover": "atomic-habits.jpg",
      "accentColor": "#F4C7AB",
      "cardCount": 18,
      "file": "books/atomic-habits.json"
    }
  ]
}
```

### 4.2 Fichier d'un livre (ex. `books/atomic-habits.json`, lecture seule)

```json
{
  "version": 1,
  "id": "atomic-habits",
  "title": "Un rien peut tout changer",
  "author": "James Clear",
  "cover": "atomic-habits.jpg",
  "accentColor": "#F4C7AB",
  "cards": [
    {
      "id": "ah-c01",
      "order": 1,
      "title": "Le pouvoir des habitudes atomiques",
      "subtitle": "Pourquoi les petits changements comptent",
      "tags": ["Habitudes", "Progrès", "Systèmes"],
      "summary": "Texte du résumé du chapitre (plusieurs paragraphes possibles, ~10 min de lecture).",
      "keyIdea": "Une seule phrase qui résume l'idée clé du passage.",
      "action": "Une seule phrase décrivant l'action concrète à appliquer.",
      "estimatedMinutes": 10
    }
  ]
}
```

> L'`id` du livre dans l'index **doit** correspondre à l'`id` dans le fichier du livre.

### 4.3 Contraintes de contenu par carte

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `id` | string | oui | Unique dans le livre |
| `order` | number | oui | Détermine l'ordre de lecture dans le livre |
| `title` | string | oui | Titre de la carte |
| `subtitle` | string | oui | Sous-titre |
| `tags` | string[] | oui | **Exactement 3** tags |
| `summary` | string | oui | Le résumé (corps de la carte) |
| `keyIdea` | string | oui | **Une** phrase « idée clé » |
| `action` | string | oui | **Une** phrase « action à appliquer » |
| `estimatedMinutes` | number | non | Défaut : 10 |

> **Règle de validation.** Si une carte ne respecte pas ces contraintes (ex. ≠ 3 tags, champ manquant), elle est ignorée au chargement et l'anomalie est journalisée (console) ; l'app n'affiche jamais une carte incomplète.

---

## 5. Architecture de l'expérience (écrans)

```
┌─────────────────────┐      tap livre       ┌─────────────────────┐
│  Écran « Bibliothèque » │ ───────────────────▶ │   Écran « Lecture »    │
│  (liste des livres)     │ ◀─────────────────── │  (carte plein écran)   │
└─────────────────────┘   retour / changer    └─────────────────────┘
        │       │                                        │
 profil │       │ réglages                       swipe ←/→ (navigation)
        ▼       ▼                                        ▼
┌──────────────────┐ ┌──────────────────┐      bouton « J'ai lu » (validation)
│ Écran « Profil »    │ │ Écran « Réglages »  │
│ XP, niveau, badges, │ │ objectif quotidien, │
│ calendrier mensuel  │ │ thème clair/sombre… │
└──────────────────┘ └──────────────────┘
```

Quatre écrans : **Bibliothèque**, **Lecture**, **Profil**, **Réglages**.

---

## 6. Écran « Bibliothèque » (liste des livres)

**But.** Choisir un livre et voir d'un coup d'œil où j'en suis.

**Contenu et comportement.**

- En-tête léger avec un résumé motivant : série en cours (🔥 *n* jours), niveau actuel, et un point d'accès au **Profil**.
- Mise en avant d'un bloc **« Reprendre »** : grande carte cliquable qui ramène directement à la dernière carte non terminée du dernier livre consulté. C'est le chemin le plus rapide vers la lecture du jour.
- Liste/grille des livres. Chaque vignette de livre affiche :
  - couverture (ou bloc coloré `accentColor` + initiales si pas de couverture) ;
  - titre + auteur ;
  - **barre de progression** (cartes lues / total) et pourcentage ;
  - état : *Non commencé* / *En cours* / *Terminé* (badge ✓).
- Tri par défaut : livres *en cours* en haut, puis *non commencés*, puis *terminés*.
- Tap sur un livre → ouvre l'écran **Lecture** à la première carte non lue de ce livre (ou la première carte si tout est lu / rien lu).

**États.**

- *Vide* (aucun livre dans le JSON) : message d'accueil expliquant qu'aucun contenu n'est disponible.
- *Premier lancement* : le bloc « Reprendre » invite à démarrer le premier livre.

---

## 7. Écran « Lecture » (cœur de l'app)

**But.** Lire une carte de façon immersive, puis passer à la suivante.

### 7.1 Disposition d'une carte (mobile-first, plein écran)

De haut en bas :

1. **Barre supérieure discrète** : bouton retour (← vers Bibliothèque), titre court du livre, et indicateur de position dans le livre (ex. `4 / 18` ou points/segments). Optionnel : mini-barre de progression du livre.
2. **Tags** : les 3 tags sous forme de petites pastilles pastel.
3. **Titre** de la carte.
4. **Sous-titre**.
5. **Résumé** : zone de lecture principale, scrollable si le texte est long.
6. **Idée clé** : encadré visuellement distinct (ex. fond accentué, icône ampoule 💡) — *« L'idée clé »*.
7. **Action à appliquer** : encadré « call-to-action » (ex. icône ✓ / flèche) — *« À appliquer aujourd'hui »*.
8. **Validation** : bouton **« J'ai lu cette carte »**. C'est le **seul** moyen de marquer une carte comme terminée ; il déclenche les gains de gamification (voir §9). **Le swipe ne valide jamais** : il sert uniquement à naviguer d'une carte à l'autre. Une carte peut donc être consultée (vue) sans être validée.

### 7.2 Navigation par swipe

> Le swipe **ne fait que naviguer** entre les cartes ; il ne valide jamais une carte (la validation passe uniquement par le bouton « J'ai lu », §7.1).

- **Swipe vers la gauche** → carte **suivante** (la nouvelle carte entre par la droite).
- **Swipe vers la droite** → carte **précédente** (la nouvelle carte entre par la gauche).
- Alternative tactile/accessibilité : zones ou flèches « précédent / suivant » discrètes ; flèches clavier ← → sur desktop.
- **Bornes** : sur la première carte, swipe droite n'a pas d'effet (léger rebond). Sur la dernière carte d'un livre, swipe gauche déclenche l'**écran de fin de livre** (voir §7.4).
- Le swipe doit suivre le doigt (la carte se déplace en temps réel) et se « caler » à la carte suivante au-delà d'un seuil, sinon revenir en place.

### 7.3 Animations de transition

- **Slide directionnel** : la carte sortante glisse dans le sens du swipe pendant que l'entrante arrive de l'autre côté, avec léger *fade* et *scale*.
- Transitions fluides (≈ 250–350 ms), courbe douce (*ease-out*).
- Micro-animations sur la validation d'une carte (ex. coche animée, légère pluie de points/XP, vibration discrète si supportée).
- Respect de la préférence système **« réduire les animations »** (`prefers-reduced-motion`) : transitions simplifiées en *fade* court.

### 7.4 Fin de livre

Quand la dernière carte d'un livre est lue : écran de félicitations (livre **terminé**), affichant les récompenses obtenues (badge éventuel, XP, série), avec deux actions : **« Revoir le livre »** (retour carte 1) et **« Retour à la bibliothèque »**.

---

## 8. Reprise & progression

- **Reprise globale.** L'app retient le **dernier livre ouvert** et la **dernière carte vue**. Le bloc « Reprendre » de la Bibliothèque y ramène en 1 tap.
- **Reprise par livre.** Chaque livre mémorise sa dernière position ; rouvrir un livre revient à sa première carte non lue.
- **Progression par livre.** `cartes lues / cartes totales` + pourcentage.
- **Progression globale.** Pourcentage de cartes lues tous livres confondus, et nombre de livres terminés.
- Une carte lue le reste (même si on la relit). La progression d'un livre (et la progression globale) peut être **réinitialisée** via un bouton **volontairement discret/caché** : placé en bas de l'écran **Réglages** (zone « Données »), il demande une **confirmation explicite** avant d'effacer, pour éviter tout reset accidentel.

---

## 9. Gamification (riche)

Objectif : entretenir l'habitude quotidienne sans transformer l'app en machine à anxiété. Le ton reste **doux et encourageant**.

### 9.1 Points d'expérience (XP)

- **+10 XP** par carte lue (première lecture validée uniquement).
- **Bonus de complétion** : **+50 XP** quand un livre est terminé.
- **Bonus de série** : petit bonus quotidien croissant tant que la série tient (ex. +2 XP × jour de série, plafonné).
- Relire une carte déjà lue ne redonne pas d'XP.

### 9.2 Niveaux

- Le cumul d'XP fait monter de **niveau**. Chaque niveau a un **nom chaleureux** (ex. *Curieux → Lecteur → Penseur → Mentor → Sage*) et un seuil croissant.
- Passage de niveau = animation de célébration + éventuel badge.
- Le niveau et la barre de progression vers le niveau suivant sont visibles dans l'en-tête de la Bibliothèque et sur le Profil.

### 9.3 Série (streak) & calendrier mensuel

- **Série = nombre de jours consécutifs** où au moins **une carte a été validée** (bouton « J'ai lu »).
- Affichage 🔥 *n* jours dans l'en-tête et au Profil.
- **Perte de la série** : si une journée passe sans aucune carte validée, la série **repart à zéro** (basé sur la date locale de l'appareil). Pas de « jeton de grâce ».
- **Calendrier mensuel à tampons.** Le Profil affiche un calendrier du mois : chaque jour où au moins une carte a été validée reçoit un **tampon** (pastille/sceau coloré). Ce calendrier est **indépendant de la série** : même si la série est perdue, **chaque journée active garde son tampon** dans le calendrier. Il offre ainsi une vue d'ensemble bienveillante de l'assiduité, sans punir un jour manqué.
- Le calendrier permet de naviguer entre les mois (mois précédent / suivant).

### 9.4 Badges

Récompenses débloquables, affichées au Profil. Exemples (liste indicative, extensible) :

| Badge | Condition |
|---|---|
| 🌱 Premier pas | Première carte lue |
| 📖 Premier livre | Premier livre terminé |
| 🔥 Régulier | Série de 7 jours |
| 🌟 Assidu | Série de 30 jours |
| 🦉 Lève-tôt | *n* cartes lues le matin |
| 🏆 Bibliophile | *n* livres terminés |
| ⚡ Marathon | *n* cartes lues dans la journée |

Un badge débloqué déclenche une animation/notification in-app non intrusive.

### 9.5 Objectif quotidien

- Objectif par défaut : **1 carte / jour** (« la carte du jour »).
- **Réglable depuis l'écran Réglages** (voir §10.5), par ex. de 1 à 5 cartes/jour.
- Atteindre l'objectif coche la journée (tampon dans le calendrier) et, si les jours s'enchaînent, alimente la série.

### 9.6 Données de gamification persistées (local)

Stockées **localement** sur l'appareil (clé-valeur), séparées du contenu JSON :

```json
{
  "version": 1,
  "lastBookId": "atomic-habits",
  "lastCardId": "ah-c04",
  "totalXp": 320,
  "level": 3,
  "streak": { "count": 5, "lastReadDate": "2026-06-05" },
  "activeDays": ["2026-06-01", "2026-06-02", "2026-06-04", "2026-06-05"],
  "progress": {
    "atomic-habits": { "readCards": ["ah-c01", "ah-c02", "ah-c03"], "lastCardId": "ah-c04" }
  },
  "completedBooks": [],
  "unlockedBadges": ["first-step"],
  "settings": { "dailyGoal": 1, "theme": "system" }
}
```

- `activeDays` : liste des jours où ≥ 1 carte a été validée → alimente le **calendrier à tampons** (indépendant de la série).
- `progress` : progression **par livre** (cartes lues + dernière position), cohérent avec le découpage 1 JSON par livre.
- `settings` : préférences modifiables depuis l'écran Réglages (`theme` ∈ `system` | `light` | `dark`).

> Aucune donnée n'est envoyée à un serveur en v1. Tout reste sur l'appareil.

---

## 10. Direction artistique & UI

- **Palette** : tons **pastels et chaleureux** (sable, pêche, terracotta doux, vert sauge, bleu brume), fonds clairs et crémeux, contrastes maîtrisés pour la lisibilité.
- **Style** : **moderne, épuré**, beaucoup d'air (whitespace), coins arrondis, ombres très douces, profondeur subtile.
- **Typographie** : titres avec une typo à caractère (chaleureuse mais lisible), corps de texte très lisible, hiérarchie claire (titre / sous-titre / corps / encadrés idée & action).
- **Iconographie** : minimale, ligne fine.
- **Mobile-first** : tout est pensé pour le pouce (zones de tap larges, navigation par swipe, boutons en bas d'écran atteignables). L'affichage s'adapte ensuite aux écrans plus larges (la carte reste centrée et limitée en largeur sur desktop).
- **Accessibilité** : contrastes suffisants, tailles de texte confortables, support `prefers-reduced-motion`, navigation au clavier sur desktop.
- **Thème clair & sombre** (v1). Deux thèmes complets, tous deux en tons pastels chaleureux (le sombre = version « tamisée », fonds profonds mais doux, pas de noir pur ni de contrastes agressifs). Choix dans Réglages : **Système** (défaut) / **Clair** / **Sombre**.

### 10.5 Écran « Réglages »

Accessible depuis la Bibliothèque (et/ou le Profil). Contient :

- **Objectif quotidien** : sélecteur du nombre de cartes/jour (1 à 5).
- **Thème** : Système / Clair / Sombre.
- **Données** (bas de page, zone discrète) : bouton **« Réinitialiser ma progression »** (avec confirmation), conformément au §8.
- Optionnel : à propos / version de l'app.

---

## 11. Contraintes & choix techniques (orientations)

- Application **web responsive**, mobile-first.
- Contenu chargé depuis des **fichiers JSON** embarqués : **1 fichier par livre** dans `books/`, et un fichier **index** `books.json` qui les liste (voir §4). La Bibliothèque s'affiche à partir de l'index ; les cartes d'un livre ne sont chargées qu'à son ouverture.
- **Index généré au build, pas à la main.** Un **script de build** (`build_books_index.py`, voir Annexe B) scanne `books/`, lit chaque fichier de livre, compte ses cartes et régénère `books.json`. Il est lancé avant chaque déploiement (par ex. via une étape `prebuild`). Conséquence : ajouter un livre = déposer son JSON dans `books/` puis relancer le build ; aucun index à maintenir manuellement.
  - *Remarque :* le navigateur ne pouvant pas lister un dossier sur un hébergement statique, la découverte des livres se fait au build et non au runtime.
- Persistance de la progression en **local** (sur l'appareil), sans backend.
- **Évolutivité prévue** : le chargement de contenu est abstrait derrière une « source de livres ». En v1 cette source = JSON locaux ; demain elle pourra pointer vers des **livres téléchargeables** à l'unité depuis l'app sans refonte, le découpage 1 JSON/livre s'y prêtant directement.

---

## 12. Parcours utilisateur clés (récap)

1. **Rituel du matin.** J'ouvre l'app → bloc « Reprendre » → je lis la carte du jour → je valide → XP + série mis à jour → animation d'encouragement.
2. **Changer de livre.** Depuis la Lecture → retour Bibliothèque → je choisis un autre livre → reprise à sa dernière position.
3. **Naviguer dans un livre.** Swipe gauche/droite pour avancer/reculer entre les cartes, avec animation de slide.
4. **Consulter ma progression.** Profil : niveau, XP, série, **calendrier mensuel à tampons**, badges débloqués, livres terminés.
5. **Terminer un livre.** Dernière carte lue → écran de félicitations + récompenses.

---

## 13. Décisions arrêtées

1. **Validation d'une carte** : uniquement via le bouton « J'ai lu ». Le swipe ne fait que naviguer.
2. **Réinitialisation** : bouton discret en bas des Réglages (zone Données), avec confirmation.
3. **Série** : perdue si un jour est manqué (pas de jeton de grâce), **mais** chaque jour actif conserve son **tampon** dans le calendrier mensuel.
4. **Objectif quotidien** : réglable depuis l'écran Réglages (1 à 5 cartes/jour).
5. **Thème** : clair **et** sombre dès la v1 (Système / Clair / Sombre).
6. **Contenu** : 1 fichier JSON par livre dans `books/` + un index `books.json` **généré au build** par script (jamais édité à la main).
7. **Niveaux & badges** : seuils proposés (§9.2, §9.4) validés.

---

## Annexe A — Prompt de génération du JSON d'un livre (pleine longueur)

> À lancer dans une **session dédiée** (modèle à grande capacité de sortie de préférence) pour produire `books/<id>.json`. Remplacer `{{TITRE}}` et `{{AUTEUR}}`. L'IA rédige **chaque carte à pleine longueur** (~10 min), carte par carte, et renvoie **uniquement** le JSON conforme au §4.2.
>
> Si la réponse est coupée par une limite de longueur, écrire « continue » : l'IA reprend à la carte suivante, et la **concaténation** des réponses forme un seul JSON valide (voir « Protocole de continuation » dans le prompt).

```
Tu es un expert en synthèse de livres de développement personnel. Ta mission : produire des FICHES DE LECTURE complètes et approfondies, qui permettent de réviser un livre et d'en retenir l'essentiel sans avoir à le relire.

LIVRE À TRAITER
- Titre : {{TITRE}}
- Auteur : {{AUTEUR}}

PROCÉDURE (à suivre dans cet ordre)
1. Établis d'abord, pour toi-même, le PLAN COMPLET du deck : la liste ordonnée de toutes les cartes nécessaires pour couvrir l'INTÉGRALITÉ du livre (une carte = un chapitre ou un sous-chapitre cohérent). Ne montre pas ce plan ; il sert à cadrer ton travail.
2. Rédige ensuite les cartes UNE PAR UNE, dans l'ordre, chacune entièrement développée, de la première à la toute dernière. Traite chaque carte comme un travail indépendant et complet.
3. Ne t'arrête pas tant que le livre n'est pas couvert en entier. Ne saute aucun chapitre, ne tronque pas la fin du livre.

EXIGENCE DE LONGUEUR — IMPÉRATIVE
- Chaque "summary" doit faire ENVIRON 1500 mots, et JAMAIS MOINS DE 1200 mots. C'est une fiche de ~10 minutes de lecture : développe pleinement.
- Ne condense pas, ne résume pas en accéléré, n'écris jamais de raccourcis du type « etc. », « et ainsi de suite » ou « (à développer) » pour éviter d'écrire le contenu.
- Le fait qu'il y ait beaucoup de cartes n'est JAMAIS une raison de raccourcir : chaque carte garde sa pleine longueur, même la dixième ou la vingtième.
- Développe chaque résumé avec : le contexte, les concepts clés, les mécanismes expliqués, des exemples concrets, les nuances de l'auteur, et la mise en application. Paragraphes lisibles.

LANGUE
Rédige tout le contenu en français, dans un ton clair, chaleureux et concret.

FIDÉLITÉ
Appuie-toi sur le contenu réel du livre. Reformule avec tes propres mots (ne recopie pas de passages). Reste fidèle aux idées de l'auteur, sans en inventer.

POUR CHAQUE CARTE, produis :
- title : un titre court et parlant.
- subtitle : un sous-titre qui précise l'angle de la carte.
- tags : EXACTEMENT 3 mots-clés (thèmes de la carte), courts.
- summary : le résumé approfondi du passage (~1500 mots, 1200 minimum).
- keyIdea : UNE seule phrase résumant l'idée clé du passage.
- action : UNE seule phrase décrivant une action concrète à appliquer après cette lecture.
- estimatedMinutes : 10.
- order : numéro d'ordre de lecture (1, 2, 3, …), sans trou ni doublon.
- id : identifiant unique, au format "<slug>-cNN" où <slug> est dérivé du titre du livre (minuscules, mots séparés par des tirets), et NN le numéro d'ordre sur 2 chiffres (ex. "atomic-habits-c01").

CHAMPS DU LIVRE :
- id : le <slug> du livre (minuscules, tirets).
- title : {{TITRE}}.
- author : {{AUTEUR}}.
- cover : "<slug>.jpg".
- accentColor : un code hexadécimal d'une teinte PASTEL et CHALEUREUSE (pêche, sable, terracotta doux, sauge…), cohérente avec l'ambiance du livre.

FORMAT DE SORTIE — RÈGLES STRICTES
- Réponds UNIQUEMENT par du JSON valide, RIEN d'autre : aucune phrase d'introduction, aucun commentaire, AUCUN bloc de code Markdown (pas de triple accent grave), aucun texte après le JSON.
- Échappe correctement les caractères spéciaux dans les chaînes (guillemets, retours à la ligne).
- Respecte EXACTEMENT cette structure :

{
  "version": 1,
  "id": "<slug>",
  "title": "{{TITRE}}",
  "author": "{{AUTEUR}}",
  "cover": "<slug>.jpg",
  "accentColor": "#RRGGBB",
  "cards": [
    {
      "id": "<slug>-c01",
      "order": 1,
      "title": "…",
      "subtitle": "…",
      "tags": ["…", "…", "…"],
      "summary": "… (~1500 mots) …",
      "keyIdea": "…",
      "action": "…",
      "estimatedMinutes": 10
    }
  ]
}

PROTOCOLE DE CONTINUATION (si la réponse atteint une limite de longueur)
- Ne réduis JAMAIS la longueur ni la qualité des cartes pour « faire tenir » tout le deck dans une seule réponse.
- Si tu approches de la limite, termine ta réponse JUSTE APRÈS un objet-carte complet : après l'accolade fermante de la carte « } » suivie d'une virgule, sans aucun autre texte, sans fermer le tableau ni l'objet racine.
- Ne ferme le JSON (« ] » puis « } ») QUE dans la réponse contenant la toute dernière carte.
- Quand je répondrai « continue », reprends EXACTEMENT à la carte suivante (un nouvel objet-carte), sans préambule, sans répéter ce qui précède, sans rouvrir l'objet racine. La simple concaténation de tes réponses, dans l'ordre, doit former un seul JSON valide.

CONTRÔLES AVANT D'ENVOYER
- Le deck couvre tout le livre, dans l'ordre, sans trou dans "order".
- Chaque "summary" fait au moins 1200 mots.
- Chaque carte a EXACTEMENT 3 tags ; "keyIdea" et "action" font chacune UNE phrase.
- Le JSON (une fois les éventuelles continuations concaténées) est valide et parsable.
```

---

## Annexe B — Génération de l'index `books.json`

L'index est produit par le script `build_books_index.py` (livré séparément). Il scanne le dossier `books/`, lit chaque fichier de livre, compte ses cartes et écrit `books.json` (§4.1).

```bash
# Défaut : scanne ./books/ et écrit ./books.json
python build_books_index.py

# Chemins personnalisés (ex. projet avec dossier public/)
python build_books_index.py --books-dir public/books --output public/books.json
```

Comportement clé : ignore les fichiers JSON invalides ou incomplets (avec avertissement), détecte les doublons d'`id`, et trie les entrées de façon déterministe. À brancher comme étape `prebuild` avant chaque déploiement.

---

*Document de spécifications fonctionnelles — v1.3. Index `books.json` généré au build ; prompt de génération de livre en pleine longueur, carte par carte, avec protocole de continuation (Annexe A).*
