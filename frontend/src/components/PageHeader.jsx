export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header
      style={{
        padding: "26px 32px 22px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 20,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.025em" }}>{title}</h1>
        {subtitle && <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--color-text-muted)" }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
    </header>
  );
}
