import { useState } from "react";

/**
 * Image d'un article. Essaie `src`, puis `fallbackSrc` si le premier échoue (ex. format pas encore
 * généré côté serveur), puis affiche un carré neutre avec les initiales — jamais d'icône d'image cassée.
 */
export default function ItemThumb({ src, fallbackSrc, name, size = 44, radius }) {
  const [failed, setFailed] = useState([]); // sources dont le chargement a échoué

  const box = {
    width: size,
    height: size,
    borderRadius: radius ?? Math.round(size * 0.22),
    flexShrink: 0,
  };

  const current = [src, fallbackSrc].find((url) => url && !failed.includes(url));

  if (!current) {
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
      src={current}
      alt=""
      loading="lazy"
      onError={() => setFailed((list) => [...list, current])}
      style={{ ...box, objectFit: "cover", background: "var(--color-surface-alt)", border: "1px solid var(--color-border)" }}
    />
  );
}