# Inkling — Worker de rappels (Web Push)

Worker Cloudflare qui stocke les abonnements (KV) et envoie les notifications de
rappel quotidien (Cron Trigger), cf. spec §10.7.4. Gratuit, sans carte bancaire.

## Déploiement (une seule fois)

Tout se fait depuis ce dossier `worker/`.

```bash
cd worker
npm install
npx wrangler login          # ouvre le navigateur, connexion à ton compte Cloudflare
```

### 1. Générer les clés VAPID

```bash
npx web-push generate-vapid-keys
```

Tu obtiens une **Public Key** et une **Private Key** (base64url).

- La **publique** va dans **deux** endroits : `wrangler.toml` (`VAPID_PUBLIC_KEY`) **et**
  `src/pushConfig.ts` de l'app (`VAPID_PUBLIC_KEY`).
- La **privée** ne va **jamais** dans le code : on la met en *secret* (étape 3).

### 2. Créer le stockage KV

```bash
npx wrangler kv namespace create SUBS
```

Copie l'`id` affiché dans `wrangler.toml` (champ `id = "..."` sous `[[kv_namespaces]]`).

### 3. Configurer `wrangler.toml`

- `VAPID_PUBLIC_KEY` = ta clé publique
- `VAPID_SUBJECT` = `"mailto:ton-email@exemple.com"`
- `ALLOW_ORIGIN` = l'origine de l'app (par défaut `https://darkgoovy.github.io`)
- `id` du KV (étape 2)

Puis enregistre la clé privée en secret :

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
# colle la Private Key quand c'est demandé
```

### 4. Déployer

```bash
npm run deploy
```

Wrangler affiche l'URL du Worker, du type `https://inkling-push.<compte>.workers.dev`.

### 5. Brancher l'app

Dans `src/pushConfig.ts` (à la racine du projet, pas dans `worker/`) :

```ts
export const PUSH_API = "https://inkling-push.<compte>.workers.dev";
export const VAPID_PUBLIC_KEY = "<ta clé VAPID publique>";
```

Commit + push → GitHub Pages redéploie. À partir de là, l'app s'abonne au push
au lieu du rappel local.

## Tester

```bash
npm run tail   # logs en direct du Worker
```

1. Dans l'app (rechargée), Réglages → active le rappel, autorise les notifications,
   règle l'heure à ~6-10 min plus tard.
2. **Ferme l'app** et attends. Le cron tourne toutes les 5 min ; la notification
   doit arriver à ±5 min de l'heure choisie, même app fermée.
3. Sur Android, **installe la PWA** (écran d'accueil) pour la meilleure fiabilité.
   Sur iOS, le push n'arrive que si la PWA est installée (16.4+).

## Remarques

- L'envoi Web Push utilise `@block65/webcrypto-web-push` (compatible Workers/WebCrypto).
- Le Worker ne reçoit que : abonnement push, heure/jours/fuseau, et un résumé
  (titre de la prochaine carte + chemin). Aucune autre donnée de progression.
- Pour changer la fréquence du cron, édite `crons` dans `wrangler.toml`.
