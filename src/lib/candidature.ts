// Listes de la candidature professeur : copie de e-supadom.fr/src/commons/condidature.js
// (mêmes valeurs que le formulaire du site, enregistrées telles quelles par POST /api/postuler).

export const EDUCATION_LEVELS = ["BAC", "BAC+1", "BAC+2", "BAC+3", "BAC+4", "BAC+5", "BAC+8"] as const;

export const PROFESSIONAL_SITUATIONS = [
  "Doctorant(e)",
  "Etudiant(e)",
  "Prof au collège",
  "Prof au lycée",
  "Assistant contractuel à l’université",
  "Maitre-Assistant à l’université",
  "Maitre de conférences à l’université",
  "Professeur à l’université",
  "Vacataire à l’université",
  "Retraité(e)",
  "Salarié(e) dans une entreprise",
  "En recherche d’emploi"
] as const;

/** Matières enseignables, par domaine. */
export const MATIERES_PAR_DOMAINE: { domaine: string; matieres: string[] }[] = [
  {
    "domaine": "Économie-Gestion",
    "matieres": [
      "Analyse des données",
      "Analyse financière",
      "Calcul stochastique",
      "Comptabilité analytique",
      "Comptabilité approfondie",
      "Comptabilité générale",
      "Comptabilité IFRS-IAS",
      "Contrôle de gestion",
      "Économétrie",
      "Économie",
      "Finance de marché",
      "Finance d'entreprise",
      "Fiscalité",
      "Gestion",
      "Gestion de portefeuille",
      "Macroéconomie",
      "Marketing",
      "Mathématiques financières",
      "Microéconomie",
      "Probabilité",
      "Recherche opérationnelle",
      "SES",
      "Statistiques",
      "Théorie de jeux"
    ]
  },
  {
    "domaine": "Sciences",
    "matieres": [
      "Algèbre",
      "Analyse",
      "Anatomie",
      "Biochimie",
      "Biologie",
      "Biologie animale",
      "Biologie cellulaire",
      "Biologie du développement",
      "Biologie marine",
      "Biologie moléculaire",
      "Biologie végétale",
      "Biophysique",
      "Biostatistique",
      "Chimie analytique",
      "Chimie générale",
      "Chimie inorganique",
      "Chimie organique",
      "Génétique",
      "Géologie",
      "Immunologie",
      "Mathématiques",
      "Microbiologie",
      "Neurologie",
      "Pharmacologie",
      "Physiologie",
      "SVT"
    ]
  },
  {
    "domaine": "Techniques",
    "matieres": [
      "Architecture",
      "Automatique et Robotique",
      "Big Data",
      "Biomécanique",
      "Data mining",
      "Eléctricité",
      "Électrocinétique",
      "Électromagnétisme",
      "Électronique",
      "Informatique",
      "Intelligence artificielle",
      "Mécanique",
      "Optique",
      "Physique",
      "Physique ondulatoire",
      "Physique quantique",
      "Physique-Chimie",
      "Réseaux et télécoms",
      "Supply chain",
      "Systèmes embarqués",
      "Thermodynamique"
    ]
  },
  {
    "domaine": "Langues",
    "matieres": [
      "Allemand",
      "Anglais",
      "Arabe",
      "Chinois",
      "Espagnol",
      "Français",
      "Italien"
    ]
  },
  {
    "domaine": "Littéraires",
    "matieres": [
      "Culture générale",
      "Droit",
      "Géographie",
      "Histoire",
      "Histoire-Géo",
      "Philosophie"
    ]
  }
];

export const DISPONIBILITES = [
  "Le matin dans la semaine",
  "L’après-midi dans la semaine",
  "Le soir dans la semaine",
  "Le samedi matin",
  "Le samedi après-midi",
  "Le dimanche"
] as const;

/** Niveaux d'études enseignables (champ niveauEtude). */
export const NIVEAUX_ENSEIGNES = ['Primaire', 'Collège', 'Lycée', 'CPGE', 'Supérieur'] as const;

/** Volume d'enseignement visé (ajouté au message de la candidature). */
export const VOLUMES = [
  { value: '2 à 5h / semaine', hint: 'Idéal pour démarrer' },
  { value: '5 à 10h / semaine', hint: 'Recommandé', badge: 'Recommandé' },
  { value: 'Plus de 10h / semaine', hint: 'Profil intensif' },
] as const;

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export const PLAGES = [
  { value: 'Matin', hint: '8h–12h' },
  { value: 'Après-midi', hint: '13h–18h' },
  { value: 'Soir', hint: '18h–21h' },
] as const;
