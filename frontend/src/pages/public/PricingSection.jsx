import { Link } from "react-router-dom";
import { PLANS, PRICES_INCLUDE_VAT, PRICING, QUOTE_NOTE, whatsappLink } from "../../content/landing";
import {
  EMPLOYEES_PER_SHOP, annualSavingsPerShop, formatFcfa, monthlyPerShop, pricePerShop, tierFor, totalPrice,
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

/**
 * Trois cartes comme dans la maquette : une par palier de boutiques.
 * Tous les montants viennent de lib/pricing.js (aucun prix écrit en dur ici).
 */
export default function PricingSection() {
  const taxLabel = PRICES_INCLUDE_VAT ? " TTC" : "";
  const savingsPct = Math.round((annualSavingsPerShop(1) / (2 * pricePerShop("semestriel", 1))) * 100);

  return (
    <section id="tarifs" className="lp-section" aria-labelledby="tarifs-title">
      <div className="lp-center" style={{ maxWidth: 560 }}>
        <div className="lp-eyebrow">Tarifs</div>
        <h2 id="tarifs-title" className="lp-h2">{PRICING.title}</h2>
        <p className="lp-sub">{PRICING.subtitle}</p>
      </div>

      <div className="lp-plans">
        {PLANS.map((plan, i) => {
          const highlight = i === 1;
          const annual = pricePerShop("annuel", plan.shops);
          const semester = pricePerShop("semestriel", plan.shops);
          const quarter = pricePerShop("trimestriel", plan.shops);
          const tier = tierFor(plan.shops);
          const discount = tier.discountPct;
          const accounts = accountsLabel(tier);
          const hint = plan.shops === 1
            ? `soit ${formatFcfa(monthlyPerShop("annuel", plan.shops))} FCFA par mois`
            : `Exemple : ${plan.shops} boutiques = ${formatFcfa(totalPrice("annuel", plan.shops))} FCFA / an`;

          return (
            <div key={plan.name} className={`lp-plan${highlight ? " lp-plan--hl" : ""}`} data-testid="plan">
              <div className="lp-plan-head">
                <span className="lp-plan-name">{plan.name}</span>
                {discount > 0 && <span className="lp-plan-tag">-{discount} % par boutique</span>}
              </div>
              <div className="lp-plan-for">{shopsLabel(tier)}</div>
              <div className="lp-plan-price">
                <span className="lp-plan-amount mono" data-testid="plan-annual">{formatFcfa(annual)}</span>
                <span className="lp-plan-unit">FCFA{taxLabel} / an</span>
              </div>
              <div className="lp-plan-sub" data-testid="plan-semester">par boutique · ou {formatFcfa(semester)} FCFA par semestre · ou {formatFcfa(quarter)} FCFA par trimestre</div>
              <div className="lp-plan-sub" data-testid="plan-hint">{hint}</div>
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

      <p className="lp-plans-note">
        {PRICES_INCLUDE_VAT ? "Prix TTC, TVA 19,25 % incluse. " : ""}
        Payé d'avance : l'annuel revient {savingsPct} % moins cher que deux semestres.
      </p>
      <p className="lp-plans-note" data-testid="quote-note">
        {QUOTE_NOTE.text}{" "}
        <a href={whatsappLink(QUOTE_NOTE.message)} className="lp-link" target="_blank" rel="noopener noreferrer">{QUOTE_NOTE.link}</a>.
      </p>
    </section>
  );
}