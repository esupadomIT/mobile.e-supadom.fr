# e-Supadom mobile

Documentation actualisée le **30/10/2026** à partir du code local.

Application Expo SDK 58, React Native 0.88, React 19.3 et TypeScript, avec
Expo Router et TanStack Query. Backend : `admin.mobile.e-supadom.fr`
(NestJS, préfixe `/api`), partageant la base du site.

## Fonctionnalités présentes

- Connexion email/mot de passe, Google pour un compte existant, mot de passe oublié.
- Accueil : profil, solde, prochaines séances et liens Meet disponibles.
- Messages : conversations prof/élève, non lus, historique, envoi de texte et push.
- Disponibilités : créneaux prof et disponibilités hebdomadaires élève.
- Profil : consultation, modification et changement de mot de passe.
- Recharge élève : formules, matières, vacances scolaires, PayPal et Alma,
  retour de paiement et notification des profs.

Ces fonctions sont présentes dans le code ; leur validation sur appareil et les
services externes restent distincts de cette mise à jour documentaire.

## Démarrage et configuration

`npm install`, puis `npm run start` (Expo). Créer au besoin un fichier `.env`
local : aucun `.env.example` n'est actuellement fourni dans ce dépôt.

| Variable publique | Usage / défaut |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend, défaut `https://admin.mobile.e-supadom.fr` |
| `EXPO_PUBLIC_FILES_URL` | Site et fichiers, défaut `https://e-supadom.fr` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Client OAuth iOS |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Client OAuth Android |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client OAuth web |

Ces valeurs sont publiques et embarquées dans l'application : aucun secret.
Pour un environnement de test, aligner l'API et le site/fichiers de test.
Sur un téléphone, l'URL locale doit être joignable depuis celui-ci.

## Identité visuelle mobile

La refonte du 30/10/2026 reprend la palette du site : bleu `#2F80ED`,
vert menthe `#6EE7B7` et jaune `#FFD814` pour les actions mises en avant.
Les couleurs et rayons partagés sont définis dans `src/theme.ts`, avec une
variante sombre. `ScreenHeader` fournit un en-tête clair avec zone sûre ;
les champs, boutons et sections sont mutualisés dans `src/components/`.
La connexion, l'accueil, les onglets, les messages et le profil utilisent
cette même identité. La validation visuelle finale se fait sur appareil.

Le démarrage utilise `expo-splash-screen` (logo natif sur fond blanc), puis
`StartupScreen` avec le logo complet et une barre animée indéterminée pendant
la restauration de session. L'introduction reste visible au moins une seconde
après le chargement du logo, même si la session est déjà prête ; aucun pourcentage
de progression fictif. Un nouveau build est nécessaire après la configuration native
du splash. Les logos des en-têtes et de la connexion sont agrandis en tenant
compte des marges blanches de l'image source.

Les rafraîchissements automatiques restent silencieux : `useManualRefresh`
réserve l'indicateur de rafraîchissement au geste manuel dans l'accueil,
les conversations et les disponibilités.

`BrandHeader` reste fixe au-dessus du contenu défilant sur l'accueil, le profil
et l'agenda. `ScreenHeader embedded` affiche l'introduction dans le contenu
sans répéter le logo ni la zone sûre. Le logo affiché est
`assets/logo-transparent.png` ; `assets/logo.png` conserve l'original fourni.

Navigation mobile : `MessagesButton` est fixe en haut à droite des pages
connectées, avec badge non lu : en-têtes communs des onglets/parcours,
en-têtes natifs des formulaires et conversations, et en-tête de recharge.
Les onglets sont Accueil, Un prof (uniquement `STUDENT`), Dispos, Alertes et Profil ;
la cloche est immédiatement à droite de Dispos. Les badges non lus utilisent
`notification` (rouge `#E41E3F`) et `onNotification` (blanc) du thème.
la route Messages est un écran de la pile connectée (`src/app/(app)/messages.tsx`),
ouvert par un `Link` explicite depuis l'en-tête, avec retour à l'écran précédent.
Un prof reproduit nativement
les six étapes du site : matière, besoin, professeur, disponibilités, budget,
récapitulatif. Les autres rôles sont aussi redirigés en cas d'accès direct à la route.
Alertes liste les conversations avec messages non lus, pas un historique de push.

Le parcours « Trouver un prof » est dans `src/components/find-teacher/` ; les
règles pures et le payload sont dans `src/lib/find-teacher.ts`. Source :
`e-supadom.fr/src/components/sections/trouver-un-prof/Step1Matiere.js` à
`Step6Recap.js`. Les dates sont calculées dans `PLATFORM_TZ`, avec un instantané
des trois premiers jours disponibles des sept prochains jours. Trois jours
distincts et des créneaux d'au moins une heure sont requis (option publique
`EXPO_PUBLIC_ALLOW_SHORT_SLOTS`, même usage que l'option du site).

Le budget indicatif utilise la classe exacte et le type de cours visible, puis
quatre heures par mois et l'écart Excellence/Coup de Pouce. L'objectif libre
« Autre » est conservé dans la liste des objectifs, le DTO mobile n'exposant pas
de champ `otherObjective`. Les demandes, l'envoi aux professeurs et les emails
sont gérés par les routes existantes du backend, sans modification de celui-ci.
Les documents respectent les limites du site (5 fichiers, 10 Mo chacun, 20 Mo
au total), avec `expo-document-picker` : refaire un build natif pour disposer de
ce module sur appareil. Tests : `node --test tests/find-teacher.test.cjs`.

## Structure

| Emplacement | Rôle |
|---|---|
| `src/app/_layout.tsx` | Providers, notifications et navigation depuis un push |
| `src/app/login.tsx`, `forgot-password.tsx` | Authentification |
| `src/app/(app)/(tabs)/` | Accueil, messages, disponibilités, profil |
| `src/app/(app)/chat/[partnerId].tsx` | Discussion |
| `src/app/(app)/profil-modifier.tsx`, `dispos-ajout.tsx` | Formulaires |
| `src/app/(app)/recharge.tsx`, `src/app/paiement-retour.tsx` | Recharge et retour navigateur |
| `src/lib/api.ts`, `auth.tsx` | REST Bearer et session SecureStore |
| `src/lib/chat.ts`, `push.ts` | Cache des messages et notifications |
| `src/lib/home.ts`, `pricing.ts`, `recharge.ts`, `tz.ts` | Séances, calculs et dates |
| `src/components/`, `src/theme.ts` | Interface et thème |

## Échanges avec le backend

Toutes les routes ci-dessous sont préfixées par `/api`.
Le jeton NextAuth dure 30 jours ; une réponse 401 avec session déclenche sa suppression.

| Méthode | Route | Usage |
|---|---|---|
| POST | `/v1/auth/token` | Connexion email/mot de passe |
| POST | `/v1/auth/google` | Échange d'un idToken Google |
| POST | `/findTeacher/verify-id`, `/findTeacher/upload`, `/findTeacher/reservation` | Vérification du prof, pièces jointes, demande de premier cours |
| POST | `/v1/auth/forgot-password` | Lien de réinitialisation |
| GET | `/v1/auth/me`, `/auth/user` | Profils |
| GET | `/seance/getAllSeancesInstructorById` ou `getAllSeancesStudentById` | Prochaines séances selon le rôle |
| GET | `/tchat/conversation?lite=1` | Conversations et contacts |
| GET / POST | `/tchat/messages` | Historique / envoi |
| POST | `/tchat/markAsRead` | Lecture |
| POST / DELETE | `/v1/devices` / `/v1/devices/:token` | Appareil push |
| GET / POST / DELETE | `/disponibilites` (DELETE `/:id`) | Créneaux prof |
| GET / POST | `/student-availability` | Disponibilités élève |
| POST | `/auth/update-profile`, `/auth/update-profile-instructor`, `/auth/update-password` | Profil et mot de passe |
| POST | `/formule` | Offres et paramètres |
| POST | `/paiement/createOrder`, `/paiement/captureOrderPaiementFormule` | PayPal |
| POST | `/paiement/alma/createPaymentFormule` | Alma |
| GET | `/v1/mobile/return` | Relais web vers le retour de paiement de l'app |

Le client complet et les routes de référence complémentaires sont dans
`src/lib/api.ts`. Les paiements passent par un navigateur intégré puis un lien
vers `paiement-retour` ; le backend assure les échanges avec les prestataires.

## Chat et push

Le chat utilise REST : discussion rafraîchie toutes les 5 s, liste toutes les
15 s. Le Socket.IO du site n'est pas utilisé par le mobile.
Un push reçu invalide immédiatement le cache du chat. Toucher la notification
ouvre le correspondant ; sa bannière est masquée si sa discussion est ouverte.

Le backend enregistre les jetons Expo dans `DeviceToken` et envoie les push des
messages mobiles. Le site transmet les messages web au backend via une route
interne protégée. Voir le DEPLOIEMENT.md du backend pour cette configuration.

## Builds

`app.json` contient déjà l'identifiant de projet EAS et les identifiants natifs.
`eas.json` définit development et preview vers l'API de test, production vers
l'API de production. Ces profils ne fixent pas `EXPO_PUBLIC_FILES_URL` : vérifier
cette valeur pour les fichiers et liens du site dans les builds de test.

Utiliser un build installé sur un téléphone pour valider Google et les push.
Les identifiants FCM/APNs doivent être configurés dans EAS ; la présence du
projectId ne prouve pas que ces identifiants ou les push sont opérationnels.
Le backend doit accepter les client IDs OAuth configurés dans l'application.

## Vérifications

- Audit du 30/10/2026 : override ciblé de Zod 4.6.7 pour `@expo/cli`.
  Ne pas retirer cet override avant que la CLI utilise une version corrigée.
  L'alerte faible deepmerge (GHSA-gcqx-w48m-w2h4) reste sans correctif publié ;
  ne pas lancer `npm audit fix --force`, qui propose une rétrogradation Expo 51.
- `npm run typecheck` et `npm run lint` pour les modifications de code.
- Diagnostic Expo : `npx expo-doctor`.
- Sur appareil : connexion, réception et ouverture des push, disponibilités,
  modification de profil et paiements dans l'environnement approprié.

Lire AGENTS.md avant de modifier les API Expo/React Native : il impose de
consulter la documentation correspondant à la version du SDK.
