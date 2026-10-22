import { useState } from "react";
import { Link } from "react-router-dom";
import { PLANS, PRICES_INCLUDE_VAT, PRICING, QUOTE_NOTE, whatsappLink } from "../../content/landing";
import {
  EMPLOYEES_PER_SHOP, PERIODS, formatFcfa, monthlyPerShop, periodSavingsPct, pricePerShop, tierFor, totalPrice,
} from "../../lib/pricing";

/** « 1 boutique », « 2 à 3 boutiques », « 4 à 10 boutiques » — dérivé des bornes du palier. */
function shopsLabel({ min, max }) {
  return min === max ? `${min} boutique${min > 1 ? "s" : ""}` : `${min} à ${max} boutiques`;
}

/** Comptes employés inclus (le propriétaire n'est pas compté) : « 3 comptes employés » / « 6 à 9 comptes employés, partagés entre vos boutiques ». */
function accountsLabel({ min, max }) {
  const lo = EMPLOYEES_PER_SHOP * min;
  const hi = EMPLOYEES_PER_SHOP * max;
  if (min === 1 && max === 1) return `${lo} comptes employés`;
  return `${lo} à ${hi} comptes employés, partagés entre vos boutiques`;
}

/** Phrase d'économie adaptée à la durée choisie (pourcentages calculés, jamais écrits en dur). */
function savingsSentence(periodKey) {
  const sem = periodSavingsPct("semestriel", "trimestriel");
  const yearVsSem = periodSavingsPct("annuel", "semestriel");
  const yearVsQuarters = periodSavingsPct("annuel", "trimestriel");
  if (periodKey === "annuel") {
    return `l'année revient ${yearVsSem} % moins cher que deux semestres et ${yearVsQuarters} % moins cher que quatre trimestres.`;
  }
  if (periodKey === "semestriel") {
    return `le semestre revient ${sem} % moins cher que deux trimestres, et l'année ${yearVsSem} % moins cher que deux semestres.`;
  }
  return `le semestre revient ${sem} % moins cher que deux trimestres, et l'année ${yearVsQuarters} % moins cher que quatre trimestres.`;
}

/**
 * Trois cartes (une par palier de boutiques) et un sélecteur de durée : les prix affichés suivent la durée choisie.
 * Tous les montants viennent de lib/pricing.js (aucun prix écrit en dur ici).
 */
export default function PricingSection() {
  const [periodKey, setPeriodKey] = useState(PRICING.defaultPeriod);
  const period = PERIODS.find((p) => p.key === periodKey);
  const taxLabel = PRICES_INCLUDE_VAT ? " TTC" : "";

  return (
    <section id="tarifs" className="lp-section" aria-labelledby="tarifs-title">
      <div className="lp-center" style={{ maxWidth: 560 }}>
        <div className="lp-eyebrow">Tarifs</div>
        <h2 id="tarifs-title" className="lp-h2">{PRICING.title}</h2>
        <p className="lp-sub">{PRICING.subtitle}</p>
      </div>

      <div className="lp-center" style={{ marginTop: 28 }}>
        <div className="lp-toggle" role="group" aria-label="Durée de paiement">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" aria-pressed={periodKey === p.key} onClick={() => setPeriodKey(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lp-plans">
        {PLANS.map((plan, i) => {
          const highlight = i === 1;
          const tier = tierFor(plan.shops);
          const discount = tier.discountPct;
          const price = pricePerShop(periodKey, plan.shops);
          const monthly = monthlyPerShop(periodKey, plan.shops);
          const example = plan.shops > 1
            ? `Exemple : ${plan.shops} boutiques = ${formatFcfa(totalPrice(periodKey, plan.shops))} FCFA / ${period.unit}`
            : null;
          const accounts = accountsLabel(tier);

          return (
            <div key={plan.name} className={`lp-plan${highlight ? " lp-plan--hl" : ""}`} data-testid="plan">
              <div className="lp-plan-head">
                <span className="lp-plan-name">{plan.name}</span>
                {discount > 0 && <span className="lp-plan-tag">-{discount} % par boutique</span>}
              </div>
              <div className="lp-plan-for">{shopsLabel(tier)}</div>
              <div className="lp-plan-price">
                <span className="lp-plan-amount mono" data-testid="plan-price">{formatFcfa(price)}</span>
                <span className="lp-plan-unit" data-testid="plan-unit">FCFA{taxLabel} / {period.unit} / boutique</span>
              </div>
              <div className="lp-plan-sub" data-testid="plan-sub">soit {formatFcfa(monthly)} FCFA par mois</div>
              {example && <div className="lp-plan-sub" data-testid="plan-hint">{example}</div>}
              <Link to="/signup" className="lp-plan-btn">Commencer</Link>
              <ul className="lp-plan-items">
                {plan.items.map((item) => {
                  const label = item.replace("{accounts}", accounts);
                  return <li key={item}><span className="icon">check</span>{label}</li>;
                })}
                {plan.soonItems.map((item) => (
                  <li key={item} className="lp-plan-soon">
                    <span className="icon">schedule</span>{item}<span className="lp-soon-tag">Bientôt</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="lp-plans-note" data-testid="plans-note">
        {PRICES_INCLUDE_VAT ? "Prix TTC, TVA 19,25 % incluse. " : ""}
        Payé d'avance : {savingsSentence(periodKey)}
      </p>
      <p className="lp-plans-note" data-testid="quote-note">
        {QUOTE_NOTE.text}{" "}
        <a href={whatsappLink(QUOTE_NOTE.message)} className="lp-link" target="_blank" rel="noopener noreferrer">{QUOTE_NOTE.link}</a>.
      </p>
    </section>
  );
}