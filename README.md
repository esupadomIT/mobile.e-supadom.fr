# e-supadom mobile

Application mobile e-supadom (Expo SDK 58, React Native, TypeScript).
Première fonctionnalité : **chat 1-à-1 prof ↔ élève en temps réel avec notifications push**.

Backend : **`https://admin.mobile.e-supadom.fr`** (API NestJS partagée avec le site, routes sous `/api`).

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
  app/                          routes Expo Router
    _layout.tsx                 providers, ouverture d'une conversation au toucher d'une notification
    index.tsx                   redirection selon la session
    login.tsx                   connexion
    (app)/_layout.tsx           zone protégée
    (app)/conversations.tsx     conversations (non lus, dernier message) + profs / élèves à qui écrire
    (app)/chat/[partnerId].tsx  discussion avec un correspondant
  components/Avatar.tsx
  lib/
    api.ts                      client REST (jeton Bearer, préfixe /api)
    auth.tsx                    session (jeton dans expo-secure-store)
    chat.ts                     requête du chat (react-query) et helpers
    push.ts                     permissions + jeton Expo Push + enregistrement
  config.ts                     URL de l'API, rafraîchissement
  types.ts                      modèles renvoyés par l'API
```

## Routes utilisées (API `admin.mobile.e-supadom.fr`)

Jeton : `Authorization: Bearer <accessToken>` (jeton NextAuth, équivalent à une session du site, 30 jours).

| Méthode | Route | Usage |
|---|---|---|
| POST | `/api/v1/auth/token` | connexion `{ email, password }` → `{ accessToken, user }` |
| GET | `/api/v1/auth/me` | profil |
| GET | `/api/tchat/conversation?lite=1` | `{ conversations, instructors, students }` (dernier message de chaque conversation) |
| GET | `/api/tchat/messages?partnerId=&limit=` | messages d'une discussion (`{ messages, conversationIds, unreadCount, hasMore }`) |
| POST | `/api/tchat/messages` | envoi `{ receiverId, text }` → `Message` |
| POST | `/api/tchat/markAsRead` | `{ conversationId }` |
| POST / DELETE | `/api/v1/devices` | jeton Expo Push (`{ token, platform }`, `DELETE /v1/devices/:token` à la déconnexion) |

Temps réel : en attendant un Socket.IO authentifié côté API, le chat se rafraîchit
toutes les 5 s (écran de discussion, seulement ses derniers messages) et 15 s (liste, dernier message seulement). Le socket du site n'est pas
utilisé : il fait confiance au `senderId` envoyé par le client.

Push : à chaque message (envoyé depuis l'app ou depuis le site), l'API envoie une
notification Expo Push à tous les téléphones du destinataire, canal Android
`messages`, avec `data: { type: 'message', partnerId: <id de l'expéditeur> }`.
Toucher la notification ouvre la discussion ; pas de bannière si elle est déjà ouverte.

## Vérifications

```bash
npm run typecheck
npx expo-doctor
```
