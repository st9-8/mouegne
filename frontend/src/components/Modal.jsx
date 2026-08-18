export default function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16,22,19,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--color-surface)",
          borderRadius: 18,
          padding: "26px 26px 24px",
          boxShadow: "var(--shadow-modal)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, border: "none", background: "var(--color-surface-alt)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <span className="icon" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
