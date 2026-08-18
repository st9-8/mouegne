const AUTH_POINTS = [
  "Vente comptoir en moins de 15 secondes",
  "Stock et caisse synchronisés en temps réel",
  "Espèces, Mobile Money ou paiement mixte",
];

export default function AuthLayout({ quote, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          background: "var(--color-dark)",
          color: "#fff",
          padding: "44px 52px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--color-accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            M
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.015em" }}>Mouegne</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>par AEME Consulting</div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 440 }}>
          <h2 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            {quote}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 34 }}>
            {AUTH_POINTS.map((point) => (
              <div key={point} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "rgba(255,255,255,0.7)" }}>
                <span className="icon" style={{ fontSize: 20, color: "#4E9B77" }}>check_circle</span>
                {point}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Yaoundé · Douala · Bafoussam</div>
      </div>

      <div style={{ background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>{children}</div>
      </div>
    </div>
  );
}
