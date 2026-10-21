import { useState } from "react";
import { Link } from "react-router-dom";
import PricingSection from "./PricingSection";
import {
  CATALOG_ONBOARDING, CONTACT, CTA, FEATURES_AVAILABLE, FEATURES_SOON, HERO, MULTI, STATS, STEPS, whatsappLink,
} from "../../content/landing";
import "./landing.css";

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Capture d'écran : affiche l'image si elle existe dans /public/landing, sinon un emplacement repérable. */
function Shot({ src, caption, dark = false }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img className="lp-shot-img" src={src} alt={caption} loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div className={`lp-shot${dark ? " lp-shot--dark" : ""}`} role="img" aria-label={`Capture d'écran : ${caption}`}>
      capture — {caption}
    </div>
  );
}

function NavLink({ id, children }) {
  return (
    <a href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollToId(id); }}>
      {children}
    </a>
  );
}

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand">
            <div className="lp-logo">M</div>
            <div>
              <div className="lp-brand-name">Mouegne</div>
              <div className="lp-brand-sub">par AEME Consulting</div>
            </div>
          </div>
          <nav className="lp-nav" aria-label="Sections">
            <NavLink id="fonctionnalites">Fonctionnalités</NavLink>
            <NavLink id="multiboutique">Multi-boutiques</NavLink>
            <NavLink id="tarifs">Tarifs</NavLink>
          </nav>
          <div className="lp-spacer" />
          <Link to="/login" className="lp-btn">Se connecter</Link>
          <Link to="/signup" className="lp-btn lp-btn--primary">Essayer 30 jours</Link>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-grid">
            <div>
              <div className="lp-badge"><span className="icon">bolt</span>{HERO.badge}</div>
              <h1 className="lp-h1">{HERO.title}</h1>
              <p className="lp-lead">{HERO.text}</p>
              <div className="lp-hero-actions">
                <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
                  Créer mon compte<span className="icon">arrow_forward</span>
                </Link>
                <a href="#tarifs" className="lp-btn lp-btn--lg" onClick={(e) => { e.preventDefault(); scrollToId("tarifs"); }}>
                  Voir les tarifs
                </a>
              </div>
              <div className="lp-hero-note"><span className="icon">check_circle</span>{HERO.note}</div>
            </div>
            <Shot src="/landing/vente.png" caption="écran de vente comptoir (1440×900)" />
          </div>

          <div className="lp-proof">
            <div className="lp-proof-grid">
              {STATS.map((st) => (
                <div key={st.label} className="lp-proof-item">
                  <div className="lp-proof-value mono">{st.value}</div>
                  <div className="lp-proof-label">{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="lp-section" aria-labelledby="fonctionnalites-title">
          <div style={{ maxWidth: 620 }}>
            <div className="lp-eyebrow">Fonctionnalités</div>
            <h2 id="fonctionnalites-title" className="lp-h2">Tout ce qu'un comptoir demande, rien de plus.</h2>
          </div>
          <div className="lp-grid-3">
            {FEATURES_AVAILABLE.map((f) => (
              <article key={f.title} className="lp-card" data-testid="feature">
                <span className="icon lp-fi" aria-hidden="true">{f.icon}</span>
                <h3 className="lp-card-title">{f.title}</h3>
                <p className="lp-card-desc">{f.desc}</p>
              </article>
            ))}
          </div>
          <div className="lp-soon" aria-label="Fonctionnalités à venir">
            <span className="lp-soon-label">Arrive bientôt</span>
            {FEATURES_SOON.map((f) => (
              <span key={f.title} className="lp-chip" title={f.desc} data-testid="soon">
                <span className="icon" aria-hidden="true">{f.icon}</span>{f.title}
              </span>
            ))}
          </div>
        </section>

        <section className="lp-section" aria-labelledby="gestes-title">
          <div className="lp-dark">
            <div className="lp-dark-grid">
              <div>
                <h2 id="gestes-title" className="lp-h2 lp-h2--light">Une vente en trois gestes.</h2>
                <p className="lp-dark-lead">Pas de formation longue : un vendeur recruté le matin encaisse l'après-midi.</p>
                <ol className="lp-steps">
                  {STEPS.map((s) => (
                    <li key={s.title}>
                      <span className="lp-step-num">{s.num}</span>
                      <div>
                        <div className="lp-step-title">{s.title}</div>
                        <div className="lp-step-desc">{s.desc}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <Shot src="/landing/encaissement.png" caption="encaissement espèces / Mobile Money" dark />
            </div>
          </div>
        </section>

        <section id="multiboutique" className="lp-section" aria-labelledby="multi-title">
          <div className="lp-two">
            <Shot src="/landing/boutiques.png" caption="sélecteur de boutique" />
            <div>
              <div className="lp-eyebrow">Multi-boutiques</div>
              <h2 id="multi-title" className="lp-h2 lp-h2--md">Un compte, toutes vos boutiques.</h2>
              <p className="lp-multi-text">{MULTI.text}</p>
              <ul className="lp-points">
                {MULTI.points.map((m) => (
                  <li key={m}><span className="icon">check_circle</span>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="lp-section" aria-labelledby="cta-title">
          <div className="lp-cta">
            <div style={{ flex: 1 }}>
              <h2 id="cta-title" className="lp-cta-title">{CTA.title}</h2>
              <p className="lp-cta-text">{CTA.text}</p>
              {CATALOG_ONBOARDING.enabled && (
                <p className="lp-cta-text" data-testid="catalog-onboarding">{CATALOG_ONBOARDING.text}</p>
              )}
            </div>
            <div className="lp-cta-actions">
              <Link to="/signup" className="lp-btn lp-btn--white lp-btn--lg">Créer mon compte</Link>
              <a
                className="lp-btn lp-btn--ghost-light lp-btn--lg"
                href={whatsappLink("Bonjour, je souhaite en savoir plus sur Mouegne.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Parler à un conseiller
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-logo lp-logo--sm">M</div>
          <span className="lp-footer-text">© {year} Mouegne — édité par AEME Consulting SARL, Yaoundé.</span>
          <div className="lp-spacer" />
          <a href="#tarifs" onClick={(e) => { e.preventDefault(); scrollToId("tarifs"); }}>Tarifs</a>
          <a href="#fonctionnalites" onClick={(e) => { e.preventDefault(); scrollToId("fonctionnalites"); }}>Fonctionnalités</a>
          <a href={`tel:+${CONTACT.whatsapp}`}>{CONTACT.phoneDisplay}</a>
        </div>
      </footer>
    </div>
  );
}