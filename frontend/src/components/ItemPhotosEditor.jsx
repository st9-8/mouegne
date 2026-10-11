import { useState } from "react";
import { deleteItemImage, extractErrorMessage, reorderItemImages, uploadItemImage } from "../lib/apiClient";

export const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

const tileStyle = {
  position: "relative",
  width: 92,
  height: 92,
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-alt)",
  flexShrink: 0,
};

function TileButton({ icon, title, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 26,
        height: 26,
        border: "none",
        borderRadius: 7,
        background: "rgba(16,22,19,0.62)",
        color: danger ? "#ffb4ab" : "#fff",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <span className="icon" style={{ fontSize: 16 }}>{icon}</span>
    </button>
  );
}

/**
 * Gestion des photos d'un article (5 max, la première sert d'aperçu).
 *  - Édition (itemId défini)  : chaque action est envoyée à l'API immédiatement
 *    et `photos` est remplacé par la liste à jour renvoyée par le serveur.
 *  - Création (pas d'itemId)  : les fichiers restent en attente dans `pending`
 *    et sont envoyés par le parent une fois l'article créé.
 */
export default function ItemPhotosEditor({ shopId, itemId, photos, onPhotosChange, pending, onPendingChange }) {
  const isEdit = Boolean(itemId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const tiles = isEdit
    ? photos.map((p) => ({ key: p.id, src: p.thumbnail_url }))
    : pending.map((p) => ({ key: p.key, src: p.previewUrl }));
  const count = tiles.length;

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function addFiles(fileList) {
    setError(null);
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const problems = [];
    const usable = files.filter((f) => {
      if (!f.type.startsWith("image/")) { problems.push(`« ${f.name} » n'est pas une image.`); return false; }
      if (f.size > MAX_BYTES) { problems.push(`« ${f.name} » dépasse 5 Mo.`); return false; }
      return true;
    });
    const room = MAX_PHOTOS - count;
    if (usable.length > room) problems.push(`Maximum ${MAX_PHOTOS} photos : ${usable.length - room} fichier(s) ignoré(s).`);
    const accepted = usable.slice(0, Math.max(room, 0));

    if (isEdit) {
      await run(async () => {
        // Un par un : l'ordre d'envoi = l'ordre des positions.
        for (const file of accepted) onPhotosChange(await uploadItemImage(shopId, itemId, file));
      });
    } else {
      onPendingChange([
        ...pending,
        ...accepted.map((file) => ({
          key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
    }
    if (problems.length) setError(problems.join(" "));
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= count) return;
    if (isEdit) {
      const order = photos.map((p) => p.id);
      [order[index], order[target]] = [order[target], order[index]];
      run(async () => onPhotosChange(await reorderItemImages(shopId, itemId, order)));
    } else {
      const next = [...pending];
      [next[index], next[target]] = [next[target], next[index]];
      onPendingChange(next);
    }
  }

  function remove(index) {
    if (isEdit) {
      if (!confirm("Supprimer cette photo ?")) return;
      run(async () => onPhotosChange(await deleteItemImage(shopId, itemId, photos[index].id)));
    } else {
      URL.revokeObjectURL(pending[index].previewUrl);
      onPendingChange(pending.filter((_, i) => i !== index));
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>
          Photos ({count}/{MAX_PHOTOS})
        </span>
        <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>La première sert d'aperçu</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, opacity: busy ? 0.6 : 1 }}>
        {tiles.map((t, index) => (
          <div key={t.key} style={tileStyle}>
            <img src={t.src} alt={`Photo ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

            {index === 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 5,
                  left: 5,
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 20,
                  background: "var(--color-accent)",
                  color: "#fff",
                }}
              >
                Aperçu
              </span>
            )}

            <div style={{ position: "absolute", left: 0, right: 0, bottom: 4, display: "flex", justifyContent: "center", gap: 3 }}>
              <TileButton icon="chevron_left" title="Déplacer vers la gauche" disabled={busy || index === 0} onClick={() => move(index, -1)} />
              <TileButton icon="chevron_right" title="Déplacer vers la droite" disabled={busy || index === count - 1} onClick={() => move(index, 1)} />
              <TileButton icon="delete" title="Supprimer la photo" danger disabled={busy} onClick={() => remove(index)} />
            </div>
          </div>
        ))}

        {count < MAX_PHOTOS && (
          <label
            style={{
              ...tileStyle,
              border: "1.5px dashed var(--color-border-hover)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              color: "var(--color-text-muted)",
              fontSize: 12,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            <span className="icon" style={{ fontSize: 24 }}>add_a_photo</span>
            {busy ? "Envoi…" : "Ajouter"}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = ""; // permet de re-sélectionner le même fichier
              }}
              style={{ display: "none" }}
            />
          </label>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "8px 12px", borderRadius: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}