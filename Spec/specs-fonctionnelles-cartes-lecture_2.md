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
      "estimatedMinutes": 10,
      "questions": [
        {
          "id": "ah-c01-q1",
          "question": "Quelle est l'idée centrale des habitudes atomiques ?",
          "choices": [
            "De petits progrès répétés produisent de grands résultats",
            "Il faut un changement radical pour progresser",
            "La motivation est la clé du succès",
            "Les objectifs comptent plus que les systèmes"
          ],
          "answerIndex": 0,
          "explanation": "1 % de mieux chaque jour se compose dans le temps."
        }
      ]
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
| `questions` | object[] | oui | **4 à 5** questions de quiz QCM (voir §4.4) |

### 4.4 Contraintes d'une question de quiz

Les questions sont **intégrées à la carte** (pas de fichier séparé) : le lien carte ↔ questions est ainsi automatique, et le script d'index (§4.1, Annexe B) n'a rien de plus à faire — il continue de simplement compter les cartes.

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `id` | string | oui | Unique dans le livre, format `<cardId>-qN` (ex. `ah-c01-q1`) |
| `question` | string | oui | Énoncé de la question |
| `choices` | string[] | oui | **Exactement 4** propositions (1 correcte, 3 fausses) |
| `answerIndex` | number | oui | Index (0–3) de la bonne réponse dans `choices` |
| `explanation` | string | non | Courte explication affichée après réponse |

> **Règle de validation.** Si une carte ne respecte pas ses contraintes (ex. ≠ 3 tags, champ manquant), elle est ignorée au chargement et l'anomalie est journalisée. Une **question** invalide (≠ 4 choix, `answerIndex` hors bornes) est ignorée individuellement ; si une carte se retrouve sans aucune question valide, son quiz est simplement sauté (la carte reste lisible).

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
8. **Validation** : bouton **« J'ai lu cette carte »**. C'est le **seul** moyen de marquer une carte comme terminée ; il **déclenche immédiatement le quiz** (§7.5) puis les gains de gamification (voir §9). **Le swipe ne valide jamais** : il sert uniquement à naviguer d'une carte à l'autre. Une carte peut donc être consultée (vue) sans être validée.

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

### 7.5 Quiz QCM (après chaque carte)

**But.** Ancrer ce qu'on vient de lire et réviser ce qui a été lu les jours précédents, selon le principe de la **courbe d'Ebbinghaus** (révision espacée, §7.6).

**Déclenchement & enchaînement.**

- L'appui sur **« J'ai lu cette carte »** lance le quiz. Le quiz est **obligatoire** (non « skippable ») : il fait partie de la validation de la carte.
- Une fois le quiz terminé, un **écran de résultat** récapitule le score et les points gagnés, puis on **enchaîne automatiquement sur la carte suivante** (ou l'écran de fin de livre si c'était la dernière).

**Composition d'un quiz** (4 à 5 questions au total) :

- **2 à 3 questions sur la carte courante** (première exposition), tirées de son tableau `questions`.
- **2 à 3 questions de révision** issues des cartes **déjà lues**, sélectionnées par le moteur de révision espacée (§7.6), en **priorisant les questions ratées / les plus « dues »**.
- **Cas du début.** Tant qu'aucune carte antérieure n'a été lue (carte 1, et tant que le réservoir de révision est vide), le quiz ne contient que les questions de la carte courante. Le nombre de questions de révision croît à mesure qu'on avance dans les livres.

**Déroulé d'une question.**

1. Énoncé + **4 propositions** (1 correcte, 3 fausses), ordre mélangé à l'affichage.
2. L'utilisateur tape une réponse → **feedback immédiat** : bonne réponse mise en valeur (vert), mauvaise réponse signalée (le bon choix est **toujours révélé**), `explanation` affichée si présente.
3. On passe à la question suivante (bouton « Continuer »).
4. Chaque réponse met à jour l'état de la question (boîte Leitner, date, juste/faux — §7.6, §9.6) et les points (§9).

> Conformément à la décision retenue : une mauvaise réponse **révèle la bonne** puis on continue (pas de nouvelle tentative immédiate). La question ratée reviendra plus tôt grâce au système de boîtes.

### 7.6 Moteur de révision espacée (système de Leitner)

Chaque question possède un état de progression personnel, géré en **boîtes** à intervalles croissants. Plus une question est « maîtrisée », plus elle est revue rarement ; dès qu'on se trompe, elle revient vite.

**Boîtes et intervalles** (jours avant la prochaine échéance) :

| Boîte | Intervalle | Signification |
|---|---|---|
| 1 | 1 jour | À revoir très vite (nouvelle ou ratée) |
| 2 | 2 jours | En cours d'ancrage |
| 3 | 4 jours | Plutôt acquise |
| 4 | 7 jours | Bien acquise |
| 5 | 15 jours | Maîtrisée (révision rare) |

**Règles de transition.**

- **Bonne réponse** → la question **monte d'une boîte** (max boîte 5) ; sa prochaine échéance = aujourd'hui + intervalle de la nouvelle boîte.
- **Mauvaise réponse** → la question **redescend en boîte 1** ; échéance = demain.
- Une question d'une carte tout juste lue **entre dans le système** au moment de la première réponse (boîte 1 → 2 si correcte, reste boîte 1 si fausse).

**Sélection des questions de révision** (pour les 2–3 emplacements « révision » d'un quiz), parmi les questions des cartes déjà lues :

1. Ne considérer que les questions **dues** (échéance ≤ aujourd'hui).
2. Trier par **boîte croissante** (boîte 1 d'abord → priorité aux questions ratées / fragiles), puis par **échéance la plus ancienne**.
3. Prendre les 2–3 premières. S'il y a moins de questions dues que d'emplacements, on prend ce qui est disponible (le quiz est alors plus court côté révision).

> Ce mécanisme réalise concrètement la courbe d'Ebbinghaus : on revoit chaque notion juste avant de l'oublier, et les notions mal sues reviennent en priorité.

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
- **+5 XP** par bonne réponse au quiz.
- **Bonus quiz parfait** : **+10 XP** si toutes les questions d'un quiz sont justes.
- **Bonus de complétion** : **+50 XP** quand un livre est terminé.
- **Bonus de série** : petit bonus quotidien croissant tant que la série tient (ex. +2 XP × jour de série, plafonné).
- Relire une carte déjà lue ne redonne pas d'XP de lecture. En revanche, les **bonnes réponses au quiz rapportent toujours de l'XP** (y compris en révision), pour récompenser la mémorisation dans la durée.

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
| 🎯 Sans-faute | Un quiz réussi à 100 % |
| 🧠 Mémoire d'éléphant | Faire passer une question en boîte 5 (maîtrisée) |
| 🔁 Réviseur | *n* questions de révision répondues correctement |
| 💯 En feu | *n* bonnes réponses d'affilée (toutes sessions confondues) |

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
  "quiz": {
    "questionStates": {
      "ah-c01-q1": {
        "box": 3,
        "dueDate": "2026-06-09",
        "lastAnsweredDate": "2026-06-05",
        "lastCorrect": true,
        "timesSeen": 2,
        "timesCorrect": 2,
        "history": [
          { "date": "2026-06-01", "correct": false },
          { "date": "2026-06-05", "correct": true }
        ]
      }
    },
    "bestCorrectStreak": 7
  },
  "settings": { "dailyGoal": 1, "theme": "system" }
}
```

- `activeDays` : liste des jours où ≥ 1 carte a été validée → alimente le **calendrier à tampons** (indépendant de la série).
- `progress` : progression **par livre** (cartes lues + dernière position), cohérent avec le découpage 1 JSON par livre.
- `quiz.questionStates` : état **par question** pour le système de Leitner (§7.6) — `box` (1–5), `dueDate` (prochaine échéance), `lastAnsweredDate`, `lastCorrect`, compteurs et **historique complet** des réponses (date + juste/faux). C'est ce qui permet de retenir quand on a répondu, et si c'était juste, pour prioriser les révisions.
- `quiz.bestCorrectStreak` : meilleure série de bonnes réponses (pour le badge « En feu »).
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

### 10.6 Style du quiz (ludique et énergique)

Le quiz contraste volontairement avec la lecture (calme et pastel) par une ambiance **plus pétillante**, sans rompre la cohérence :

- **Couleurs avec du peps** : versions plus saturées et vives de la palette (l'accent du livre poussé en intensité), vert franc pour le juste, corail/rose pour le faux.
- **Boutons-réponses gros et tactiles**, avec retour visuel immédiat au tap (enfoncement, halo), donnant envie de cliquer.
- **Animations fluides et modernes** : apparition des questions, points qui « pop » à chaque bonne réponse, jauge de progression du quiz qui se remplit, petite célébration (confettis légers) en cas de quiz parfait. Vibration discrète si supportée.
- **Lisibilité du feedback** : bonne réponse en vert, mauvaise signalée et **bonne réponse révélée**, `explanation` affichée sobrement.
- Respect de `prefers-reduced-motion` : effets remplacés par de simples transitions de couleur.

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

1. **Rituel du matin.** J'ouvre l'app → bloc « Reprendre » → je lis la carte du jour → je valide (« J'ai lu ») → **le quiz se lance** (questions sur la carte + révisions espacées) → je vois mon score et mes points → XP + série + boîtes de Leitner mis à jour → j'enchaîne sur la carte suivante.
2. **Changer de livre.** Depuis la Lecture → retour Bibliothèque → je choisis un autre livre → reprise à sa dernière position.
3. **Naviguer dans un livre.** Swipe gauche/droite pour avancer/reculer entre les cartes, avec animation de slide.
4. **Consulter ma progression.** Profil : niveau, XP, série, **calendrier mensuel à tampons**, badges débloqués (lecture **et** quiz), livres terminés.
5. **Terminer un livre.** Dernière carte lue + quiz fait → écran de félicitations + récompenses.

---

## 13. Décisions arrêtées

1. **Validation d'une carte** : uniquement via le bouton « J'ai lu ». Le swipe ne fait que naviguer.
2. **Réinitialisation** : bouton discret en bas des Réglages (zone Données), avec confirmation.
3. **Série** : perdue si un jour est manqué (pas de jeton de grâce), **mais** chaque jour actif conserve son **tampon** dans le calendrier mensuel.
4. **Objectif quotidien** : réglable depuis l'écran Réglages (1 à 5 cartes/jour).
5. **Thème** : clair **et** sombre dès la v1 (Système / Clair / Sombre).
6. **Contenu** : 1 fichier JSON par livre dans `books/` + un index `books.json` **généré au build** par script (jamais édité à la main).
7. **Niveaux & badges** : seuils proposés (§9.2, §9.4) validés.
8. **Quiz QCM** (§7.5) : déclenché après « J'ai lu », **obligatoire** ; 4–5 questions (2–3 carte courante + 2–3 révision) ; 4 choix par question (1 correcte). Réponse fausse → **bonne réponse révélée** puis on continue.
9. **Révision espacée** (§7.6) : **système de Leitner** (boîtes 1→5, intervalles 1/2/4/7/15 j) ; bonne réponse monte d'une boîte, mauvaise renvoie en boîte 1 ; les questions ratées / les plus dues sont **prioritaires**.
10. **Questions** : **intégrées à chaque carte** dans le JSON du livre (pas de fichier séparé) ; ~5 par carte ; le script d'index reste inchangé.

---

## Annexe A — Prompt de génération du JSON d'un livre (pleine longueur)

> À lancer dans une **session dédiée** (modèle à grande capacité de sortie de préférence) pour produire `books/<id>.json`. Remplacer `{{TITRE}}` et `{{AUTEUR}}`. L'IA rédige **chaque carte à pleine longueur** (~10 min) avec ses **questions de quiz** intégrées, carte par carte, et renvoie **uniquement** le JSON conforme aux §4.2 et §4.4.
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
- questions : un tableau de 5 questions de quiz à choix multiple portant sur le contenu de CETTE carte. Chaque question contient :
    - id : "<idDeLaCarte>-qN" (ex. "atomic-habits-c01-q1").
    - question : l'énoncé, clair et sans ambiguïté.
    - choices : EXACTEMENT 4 propositions plausibles (1 seule correcte, 3 fausses mais crédibles).
    - answerIndex : l'index (0 à 3) de la bonne réponse dans "choices".
    - explanation : une courte phrase expliquant pourquoi c'est la bonne réponse.
  Les questions doivent tester la COMPRÉHENSION (idées, mécanismes, applications), pas des détails anecdotiques. Varie les formulations. Ne révèle pas la bonne réponse par sa longueur ou sa position.

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
      "estimatedMinutes": 10,
      "questions": [
        {
          "id": "<slug>-c01-q1",
          "question": "…",
          "choices": ["…", "…", "…", "…"],
          "answerIndex": 0,
          "explanation": "…"
        }
      ]
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
- Chaque carte a 5 questions ; chaque question a EXACTEMENT 4 "choices" et un "answerIndex" valide (0–3).
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

*Document de spécifications fonctionnelles — v1.4. Ajout du quiz QCM après chaque carte avec révision espacée (système de Leitner) ; questions intégrées aux cartes ; gamification et prompt (Annexe A) mis à jour en conséquence.*
