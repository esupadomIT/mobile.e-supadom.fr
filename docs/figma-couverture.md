# Couverture des maquettes Figma — app mobile e-Supadom

Maquettes exportées dans `new_Esup/figma/` (une page Figma = un PDF, variantes claire et sombre).
Dernier export complet : `figma/_export_figma_2026-11-22/` (22/11/2026). Par rapport au 19/11, seules les pages Aide & contact et Trouver un prof sont nouvelles ; les autres sont inchangées.
Suffixe `-done` = tous les écrans du PDF existent dans l'app avec des données réelles de l'API.
Aucune donnée ni confirmation fictive n'est affichée : quand l'API ne fournit pas l'information, l'élément est omis.

## État par PDF

Règle retenue : l'app reprend **les mêmes fonctionnalités que le site e-supadom.fr**. Les éléments des maquettes qui n'existent pas sur le site (suivi multi-enfants, reçus, carte enregistrée, virements prof…) ne sont pas ajoutés : aucun changement du schéma Prisma partagé.

| PDF | État | Écrans de l'app | Équivalent site |
|---|---|---|---|
| `e-Supadom-Launch-Intro-done.pdf` | Couvert | `StartupScreen`, `intro` | — |
| `e-Supadom-Inscription-Professeur-done.pdf` | Couvert | `inscription/index`, `inscription/professeur` | `postuler-en-ligne` |
| `e-Supadom-Connexion-Inscription-Eleve-Parent-done.pdf` | Couvert | `login`, `inscription/eleve` | `connexion`, `inscription` |
| `e-Supadom-Planning-Eleve-Parent-done.pdf` | Couvert | `planning`, `cours/[id]`, `reserver` | `student-agenda`, `student-mes-seances` |
| `e-Supadom-Planning-Professeur-done.pdf` | Couvert | `planning`, `cours/[id]`, `dispos` | `instructor-agenda`, `instructor-mes-seances` |
| `e-Supadom-Messages-Professeur-done.pdf` | Couvert | `messages`, `chat/[partnerId]` | `instructor-message` |
| `e-Supadom-Messages-Eleve-done.pdf` | Couvert | `messages`, `chat/[partnerId]` | `student-message` (un compte élève, pas d'espace parent séparé) |
| `e-Supadom-Profil-done.pdf`, `e-Supadom-Profil-2-done.pdf` | Couvert | `profil`, `profil-modifier` (dont e-mail / téléphone du parent), `reglages`, `securite` | `student-profile`, `instructor-profile`, `*-settings` |
| `e-Supadom-Accueil-Notifications-done.pdf` | Couvert | `accueil`, `notifications` | `student-dashboard`, `instructor-dashboard` |
| `e-Supadom-Mot-de-passe-oublie-done.pdf` | Couvert | `forgot-password` (5 états) | `forgot-password` ; le lien de l'e-mail ouvre `reset-password` sur le site, comme pour le web |
| `e-Supadom-Paiements-done.pdf` | Couvert | `paiements` (solde, date d'échéance, historique, export du relevé PDF), `recharge` | `mes-reglements` (dont « Export PDF »), `nos-formules`, solde / échéance du menu |
| `e-Supadom-OTP.pdf` | Hors périmètre | — | Maquette « on hold », absente du site |
| `_export_figma_2026-11-22/Aide-contact.pdf` | Couvert | `aide-contact` (accueil, Rappelez-moi, demande de devis, confirmation) | formulaire « Rappelez-moi », demande de devis |
| `_export_figma_2026-11-22/Trouver-un-prof.pdf` | Couvert | `trouver-prof` (`FindTeacherWizard`) | `findTeacher` |

Éléments de maquette volontairement non repris (absents du site) : « Échange parent–professeur » séparé, carte enregistrée, rémunération et virements prof (carte « Rémunération » du profil professeur), « +2 ce mois », notifications de paiement ; dans Aide & contact, la question « cours en visio » et le choix des jours / créneau de rappel du devis, ainsi que l'e-mail et le code postal du formulaire « Rappelez-moi ».

## Routes ajoutées au backend mobile (admin.mobile.e-supadom.fr)

- `POST /api/v1/auth/signup` : inscription élève depuis l'app, sans reCAPTCHA, 3 essais / min / IP.
- `POST /api/v1/contact/rappel` et `POST /api/devis/v1/submit` : « Rappelez-moi » et demande de devis depuis l'app, sans reCAPTCHA, 3 essais / min / IP ; mêmes e-mails et enregistrement que les routes du site.
- `POST /api/seance/v1/reserver` : réservation par l'élève, sur un créneau entièrement inclus dans les disponibilités d'un prof qui lui a déjà donné cours, au moins 2 h à l'avance. Type de cours et matière repris du dernier cours ensemble ; création via les mêmes règles que `seance/create` (conflits, solde, débit, lien Meet, e-mails). 409 = avertissements (férié, vacances, disponibilités élève) confirmables avec `force`.

Tests : `npm test` (77 tests, dont ces deux routes).

## Choix faits côté app (sans changement d'API)

- « Le bon rythme pour vous » : les créneaux choisis à l'inscription sont gardés sur le téléphone, puis envoyés (`POST /student-availability`) à la première connexion du compte.
- Statut de séance terminée : lu dans les champs `seance_effectuee*` (cron Google Meet), même règle « prof seul » que le site ; lien d'enregistrement s'il existe.
