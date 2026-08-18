export default function Pagination({ page, totalPages, onChange, count }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: "1px solid var(--color-divider)" }}>
      <span style={{ fontSize: 13, color: "var(--color-text-faint)" }}>{count} résultat(s)</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          style={{ width: 32, height: 32, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 8, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
        >
          <span className="icon" style={{ fontSize: 18 }}>chevron_left</span>
        </button>
        <span className="mono" style={{ fontSize: 13 }}>
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          style={{ width: 32, height: 32, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 8, cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}
        >
          <span className="icon" style={{ fontSize: 18 }}>chevron_right</span>
        </button>
      </div>
    </div>
  );
}
