/**
 * Textes de la page d'accueil — structure et ton de la maquette « Mouegne Site », informations mises à jour.
 *
 * RÈGLE : une fonctionnalité n'est dans FEATURES_AVAILABLE que si elle existe réellement dans l'application.
 * Quand une fonctionnalité de FEATURES_SOON est livrée, déplacez-la dans FEATURES_AVAILABLE.
 * Les prix ne sont PAS ici : ils viennent de src/lib/pricing.js.
 */

export const CONTACT = {
  phoneDisplay: "+237 698 94 88 36", // provisoire (indiqué par AEME)
  whatsapp: "237698948836",
};

export function whatsappLink(message) {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

// false tant qu'AEME n'est pas assujettie à la TVA : les prix s'affichent alors sans la mention « TTC ».
// À passer à true dès que l'assujettissement est effectif.
export const PRICES_INCLUDE_VAT = false;

export const HERO = {
  badge: "Encaissez en moins de 15 secondes",
  title: "La caisse qui tient le rythme de votre comptoir.",
  text: "Mouegne gère la vente, le stock, les clients et les réceptions de vos boutiques — espèces, Mobile Money ou paiement mixte.",
  note: "30 jours gratuits · sans carte bancaire · installation en une heure",
};

export const STATS = [
  { value: "14 s", label: "pour boucler un ticket au comptoir" },
  { value: "3", label: "moyens de paiement, dont le mixte" },
  { value: "100 %", label: "des montants en francs CFA" },
  { value: "1 h", label: "pour installer et former une équipe" },
];

export const FEATURES_AVAILABLE = [
  { icon: "point_of_sale", title: "Vente comptoir", desc: "Recherche par nom, prix modifiable à la volée, quantité en un geste. Un article manque ? Créez-le sans quitter l'écran." },
  { icon: "smartphone", title: "Espèces, Mobile Money, mixte", desc: "MTN et Orange Money encaissés comme les espèces, avec calcul automatique de la monnaie à rendre." },
  { icon: "receipt_long", title: "Reçus PDF à votre image", desc: "Votre logo, votre NIU et un numéro de ticket propre à chaque boutique. Impression automatique à la validation." },
  { icon: "inventory_2", title: "Stock et historique", desc: "Le stock se décrémente à chaque vente et chaque mouvement est journalisé : qui, quand, combien. Les seuils bas remontent sur le tableau de bord." },
  { icon: "photo_library", title: "Produits avec photos", desc: "Jusqu'à 5 photos par article, catégories, recherche et tri : vos caissiers reconnaissent l'article d'un coup d'œil." },
  { icon: "local_shipping", title: "Réceptions de stock", desc: "Plusieurs articles et plusieurs fournisseurs en une seule saisie, avec un bon de réception PDF." },
  { icon: "storefront", title: "Multi-boutiques", desc: "Basculez d'un point de vente à l'autre depuis le menu en haut à droite, sans vous déconnecter." },
  { icon: "groups", title: "Clients", desc: "Fiches clients partagées entre vos boutiques, ou simple nom sur le reçu pour un client de passage." },
  { icon: "space_dashboard", title: "Tableau de bord", desc: "Chiffre d'affaires, bénéfice, articles les plus et les moins vendus, stock d'alerte — sur la période de votre choix." },
];

// Présentes dans la maquette ou promises, pas encore livrées.
export const FEATURES_SOON = [
  { icon: "account_balance", title: "Comptabilité de gestion", desc: "Dépenses, résultat net, caisse du jour et TVA, prêts pour votre comptable." },
  { icon: "undo", title: "Annulation et retour de vente", desc: "Corrigez une erreur de caisse en gardant une trace." },
  { icon: "download", title: "Exports Excel", desc: "Ventes, stock et dépenses dans un tableur." },
];

export const STEPS = [
  { num: "1", title: "Cherchez l'article", desc: "Deux ou trois lettres du nom suffisent. Introuvable ? Créez-le sans quitter la vente." },
  { num: "2", title: "Ajustez la quantité", desc: "Boutons + / − dimensionnés pour un écran tactile, prix modifiable à la volée." },
  { num: "3", title: "Encaissez", desc: "Espèces, Mobile Money ou les deux — la monnaie est calculée, le reçu PDF s'imprime." },
];

export const MULTI = {
  text: "Le propriétaire bascule d'un point de vente à l'autre depuis un simple menu. Chaque boutique garde son stock, ses prix et ses vendeurs.",
  points: [
    "Stock, prix et vendeurs séparés par boutique",
    "Catégories, fournisseurs et clients communs à toutes vos boutiques",
    "Droits par rôle : propriétaire, gérant, caissier",
    "Ajout d'une nouvelle boutique en quelques minutes",
  ],
};

export const PRICING = {
  defaultPeriod: "annuel", // durée présélectionnée dans le sélecteur : "trimestriel" | "semestriel" | "annuel"
  title: "Payé à l'année ou au semestre.",
  subtitle: "Un prix par boutique, en francs CFA. Toutes les fonctionnalités incluses, 3 comptes employés par boutique.",
};

// Un plan par palier de boutiques. Les montants et remises sont calculés par src/lib/pricing.js.
export const PLANS = [
  {
    name: "Comptoir",
    shops: 1, // nombre de boutiques représentatif du palier (prix, bornes et comptes sont calculés par pricing.js)
    items: [
      "Vente et encaissement",
      "Stock et historique des mouvements",
      "Produits, photos et réceptions de stock",
      "Clients et tableau de bord",
      "{accounts}, avec rôles",
      "Support WhatsApp",
    ],
    soonItems: ["Comptabilité de gestion"],
  },
  {
    name: "Boutique",
    shops: 2,
    items: [
      "Tout le plan Comptoir",
      "{accounts}",
      "Plusieurs boutiques, un seul compte",
      "Catégories, fournisseurs et clients partagés",
      "Changement de boutique en un clic",
    ],
    soonItems: [],
  },
  {
    name: "Réseau",
    shops: 4,
    items: [
      "Tout le plan Boutique",
      "{accounts}",
      "Remise maximale sur chaque boutique",
      "Nouvelle boutique en quelques minutes",
    ],
    soonItems: [],
  },
];

export const QUOTE_NOTE = {
  text: "Plus de 10 boutiques ?",
  link: "Demandez un devis",
  message: "Bonjour, j'ai plus de 10 boutiques et je souhaite un devis Mouegne.",
};

export const CTA = {
  title: "Installons Mouegne dans votre boutique cette semaine.",
  text: "Formation des vendeurs incluse.",
};

// Texte sur la reprise du catalogue (affiché sous le titre du bloc final). Une équipe d'AEME s'en charge après une
// évaluation sur le terrain : le client ne saisit rien. Passer `enabled` à false pour retirer ce texte de la page.
export const CATALOG_ONBOARDING = {
  enabled: true,
  text: "Reprise de votre catalogue incluse : notre équipe évalue votre situation sur le terrain et s'en charge pour vous, à partir de votre fichier Excel ou de votre cahier manuscrit. Vous n'avez rien à saisir.",
};