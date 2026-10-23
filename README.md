# e-supadom mobile

Application mobile e-supadom (Expo SDK 58, React Native, TypeScript).
Première fonctionnalité : **chat 1-à-1 prof ↔ élève en temps réel avec notifications push**.

Backend : **`https://admin.mobile.e-supadom.fr`** (API REST + Socket.IO dédiée au mobile).

## Démarrer

```bash
npm install
cp .env.example .env        # optionnel : backend local
npx expo start
```

L'interface se teste dans **Expo Go**. Les **notifications push** demandent un build de développement sur un vrai téléphone :

```bash
npm i -g eas-cli
eas login
eas init                    # remplit extra.eas.projectId dans app.json
eas build --profile development --platform android
```

Pour Android, ajouter `google-services.json` (projet Firebase) à la racine et déclarer
`"googleServicesFile": "./google-services.json"` dans `app.json > expo.android`, puis
téléverser la clé de compte de service FCM V1 dans EAS (`eas credentials`).
Pour iOS, il faut un compte Apple Developer (clé APNs gérée par `eas credentials`).

## Structure

```
src/
  app/                       routes Expo Router
    _layout.tsx              providers, ouverture d'une conversation au toucher d'une notification
    index.tsx                redirection selon la session
    login.tsx                connexion
    (app)/_layout.tsx        zone protégée + écoute Socket.IO
    (app)/conversations.tsx  liste des conversations (non lus, dernier message)
    (app)/chat/[id].tsx      écran de discussion
  lib/
    api.ts                   client REST (token Bearer)
    auth.tsx                 session (token dans expo-secure-store)
    socket.ts                connexion Socket.IO
    push.ts                  permissions + token Expo Push + enregistrement
  config.ts                  URL de l'API
  types.ts                   modèles partagés avec le backend
```

## Contrat attendu de l'API `admin.mobile.e-supadom.fr`

Authentification : `Authorization: Bearer <token>` sur toutes les routes sauf `/auth/login`.

| Méthode | Route | Corps / réponse |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/me` | → `User` |
| GET | `/conversations` | → `Conversation[]` (triées par `updatedAt` desc) |
| GET | `/conversations/:id/messages?before=<ISO>` | → `Message[]` (ordre chronologique, pagination par `before`) |
| POST | `/conversations/:id/messages` | `{ content }` → `Message` |
| POST | `/conversations/:id/read` | → 204 |
| POST | `/devices` | `{ token, platform }` → 204 (token Expo Push) |
| DELETE | `/devices/:token` | → 204 |

Socket.IO (même hôte) : handshake `auth: { token }`. Le serveur émet
`message:new` (payload `Message`) à chaque participant connecté.

Push : quand un message est créé, le backend envoie une notification via l'API Expo Push
à tous les `DeviceToken` du destinataire, avec `data: { conversationId }` pour que le
toucher ouvre la bonne conversation.

Modèles : voir `src/types.ts` (`User`, `Conversation`, `Message`).

## Vérifications

```bash
npm run typecheck
npx expo-doctor
```
