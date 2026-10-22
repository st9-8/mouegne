/**
 * Moteur de prix de Mouegne — source UNIQUE des montants affichés sur la page d'accueil.
 * Tous les prix sont en FCFA, TTC, pour UNE boutique et par période de paiement.
 */

export const TVA_RATE = 0.1925; // 17,5 % + 10 % de centimes additionnels communaux

// Au-delà de ce nombre de boutiques : sur devis (pas de prix affiché).
export const MAX_SHOPS = 10;

// Comptes EMPLOYÉS (gérants, caissiers) autorisés par boutique. Le propriétaire est unique par compte et n'est compté nulle part ;
// la limite est MUTUALISÉE : un compte de N boutiques a 3 × N comptes employés, répartis librement entre ses boutiques.
// Valeur à porter aussi dans la vérification côté serveur (add_employee) : elle doit rester identique.
export const EMPLOYEES_PER_SHOP = 3;

// Prix d'une boutique selon la durée payée d'avance. L'annuel est 20 % moins cher que deux semestres ;
// le trimestriel coûte 10 % de plus par mois que le semestriel (il incite à payer plus long).
// Ordre = ordre d'affichage du sélecteur (du plus court au plus long) ; `label` est le texte du bouton.
export const PERIODS = [
  { key: "trimestriel", label: "Trimestre", unit: "trimestre", months: 3, base: 33000 },
  { key: "semestriel", label: "Semestre", unit: "semestre", months: 6, base: 60000 },
  { key: "annuel", label: "Année", unit: "an", months: 12, base: 96000 },
];

// Remise PAR BOUTIQUE selon le nombre de boutiques du compte (en %, entiers : pas d'arrondi flottant).
// Le TOTAL ne baisse jamais quand on ajoute une boutique : seul le prix unitaire diminue.
export const VOLUME_TIERS = [
  { min: 1, max: 1, discountPct: 0 },
  { min: 2, max: 3, discountPct: 20 },
  { min: 4, max: MAX_SHOPS, discountPct: 30 },
];

function period(key) {
  const found = PERIODS.find((p) => p.key === key);
  if (!found) throw new Error(`Période inconnue : ${key}`);
  return found;
}

export function clampShops(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_SHOPS);
}

/** Palier tarifaire d'un compte : { min, max, discountPct }. */
export function tierFor(shops) {
  const n = clampShops(shops);
  return VOLUME_TIERS.filter((t) => n >= t.min).at(-1);
}

export function discountPctFor(shops) {
  return tierFor(shops).discountPct;
}

/** Nombre maximal de comptes employés actifs (propriétaire non compté) pour un compte de `shops` boutiques. */
export function maxEmployees(shops) {
  return EMPLOYEES_PER_SHOP * clampShops(shops);
}

/** Prix d'UNE boutique pour la période, remise de volume incluse. */
export function pricePerShop(periodKey, shops) {
  const { base } = period(periodKey);
  return Math.round((base * (100 - discountPctFor(shops))) / 100);
}

/** Total payé par le compte pour la période. */
export function totalPrice(periodKey, shops) {
  return pricePerShop(periodKey, shops) * clampShops(shops);
}

/** Équivalent mensuel par boutique. */
export function monthlyPerShop(periodKey, shops) {
  return Math.round(pricePerShop(periodKey, shops) / period(periodKey).months);
}

/** Économie, en %, de payer `longKey` plutôt que plusieurs `shortKey` pour la même durée (ex. année vs 4 trimestres). */
export function periodSavingsPct(longKey, shortKey) {
  const long = period(longKey);
  const short = period(shortKey);
  const shortTotal = short.base * (long.months / short.months);
  return Math.round((1 - long.base / shortTotal) * 100);
}

/** Économie par boutique et par an en payant à l'année plutôt que deux semestres. */
export function annualSavingsPerShop(shops) {
  return 2 * pricePerShop("semestriel", shops) - pricePerShop("annuel", shops);
}

/** Décompose un montant TTC en HT et TVA (la somme redonne toujours le TTC). */
export function vatBreakdown(ttc) {
  const ht = Math.round(ttc / (1 + TVA_RATE));
  return { ttc, ht, tva: ttc - ht };
}

export function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount));
}