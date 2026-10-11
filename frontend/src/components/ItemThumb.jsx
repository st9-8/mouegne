import { useState } from "react";

/**
 * Miniature d'un article (photo en position 1). Sans photo, ou si le chargement
 * échoue, affiche un carré neutre avec les initiales — jamais d'icône d'image cassée.
 */
export default function ItemThumb({ src, name, size = 44 }) {
  const [failedSrc, setFailedSrc] = useState(null);

  const box = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.22),
    flexShrink: 0,
  };

  if (!src || failedSrc === src) {
    return (
      <div
        aria-hidden="true"
        style={{
          ...box,
          background: "var(--color-accent-soft)",
          color: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.32),
          fontWeight: 600,
        }}
      >
        {(name || "?").trim().slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
      style={{ ...box, objectFit: "cover", background: "var(--color-surface-alt)", border: "1px solid var(--color-border)" }}
    />
  );
}