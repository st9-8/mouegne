import { useEffect, useState } from "react";
import { adjustItemStock, apiClient, extractErrorMessage, fetchStockMovements } from "../lib/apiClient";

const PAGE_SIZE = 20;

function formatDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatDelta(delta) {
  return delta > 0 ? `+${delta}` : `\u2212${Math.abs(delta)}`; // vrai signe moins
}

const secondaryButton = {
  height: 38,
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  borderRadius: 10,
  fontSize: 13.5,
  cursor: "pointer",
  color: "var(--color-text)",
};

/**
 * Stock d'un article en cours d'édition : stock actuel, bouton « Modifier le stock » (ajouter / retirer
 * une quantité, note facultative) et historique de TOUS les mouvements (ventes, réceptions, ajustements…).
 *
 * Rendu dans le <form> d'édition du produit : tous les boutons sont de type "button" et la touche Entrée
 * est interceptée, pour ne jamais enregistrer le produit par accident.
 */
export default function ItemStockPanel({ shopId, itemId, onStockChange }) {
  const [quantity, setQuantity] = useState(null);
  const [movements, setMovements] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjustError, setAdjustError] = useState(null);
  const [justSaved, setJustSaved] = useState(false);

  // Stock frais + première page d'historique : la valeur de la liste peut être périmée (ventes entre-temps).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([apiClient.get(`/shops/${shopId}/items/${itemId}/`), fetchStockMovements(shopId, itemId, 1, PAGE_SIZE)])
      .then(([itemRes, history]) => {
        if (cancelled) return;
        setQuantity(itemRes.data.quantity);
        setMovements(history.results);
        setHasMore(Boolean(history.next));
        setPage(1);
      })
      .catch((err) => !cancelled && setLoadError(extractErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [shopId, itemId]);

  const amountNumber = Number(amount);
  const validAmount = amount !== "" && Number.isInteger(amountNumber) && amountNumber >= 1;
  const nextQuantity = validAmount && quantity !== null ? quantity + (direction === "add" ? amountNumber : -amountNumber) : null;
  const tooMuch = direction === "remove" && nextQuantity !== null && nextQuantity < 0;
  const canSubmit = validAmount && !tooMuch && !saving && quantity !== null;

  function toggleOpen() {
    setOpen((v) => !v);
    setAdjustError(null);
    setJustSaved(false);
  }

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setAdjustError(null);
    try {
      const movement = await adjustItemStock(shopId, itemId, { direction, quantity: amountNumber, note: note.trim() });
      setQuantity(movement.quantity_after);
      setMovements((prev) => [movement, ...prev]);
      onStockChange?.(movement.quantity_after);
      setOpen(false);
      setAmount("");
      setNote("");
      setDirection("add");
      setJustSaved(true);
    } catch (err) {
      setAdjustError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const history = await fetchStockMovements(shopId, itemId, nextPage, PAGE_SIZE);
      // Dédoublonnage : un mouvement ajouté entre-temps décale les pages et ferait réapparaître une ligne déjà affichée.
      setMovements((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...history.results.filter((m) => !seen.has(m.id))];
      });
      setPage(nextPage);
      setHasMore(Boolean(history.next));
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  function onEnter(e) {
    if (e.key === "Enter") {
      e.preventDefault(); // n'enregistre pas le formulaire produit qui contient ce panneau
      submit();
    }
  }

  const segment = (value, label) => (
    <button
      type="button"
      aria-pressed={direction === value}
      onClick={() => setDirection(value)}
      style={{
        flex: 1,
        height: 38,
        border: direction === value ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
        background: direction === value ? "var(--color-accent-soft)" : "var(--color-surface)",
        color: direction === value ? "var(--color-accent)" : "var(--color-text-secondary)",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: direction === value ? 600 : 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ border: "1px solid var(--color-border)", borderRadius: 14, background: "var(--color-surface-alt)", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Stock actuel</div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em" }}>
              {loading ? "…" : quantity ?? "—"}
            </div>
            {justSaved && <div style={{ fontSize: 12.5, color: "var(--color-accent)", marginTop: 2 }}>Stock mis à jour.</div>}
          </div>
          <button type="button" onClick={toggleOpen} disabled={loading || quantity === null} style={{ ...secondaryButton, opacity: loading || quantity === null ? 0.5 : 1 }}>
            <span className="icon" style={{ fontSize: 18 }}>{open ? "close" : "inventory"}</span>
            {open ? "Annuler" : "Modifier le stock"}
          </button>
        </div>

        {open && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-divider)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {segment("add", "Ajouter")}
              {segment("remove", "Retirer")}
            </div>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              className="mono"
              placeholder="Quantité"
              aria-label="Quantité"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={onEnter}
              autoFocus
              style={{ height: 42, border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 12px", fontSize: 14, background: "var(--color-surface)" }}
            />
            <input
              type="text"
              maxLength={300}
              placeholder="Note (facultatif) — ex. casse, retour client, inventaire"
              aria-label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={onEnter}
              style={{ height: 42, border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 12px", fontSize: 14, background: "var(--color-surface)" }}
            />

            {nextQuantity !== null && !tooMuch && (
              <div style={{ fontSize: 13.5, color: "var(--color-text-secondary)" }}>
                Nouveau stock : <span className="mono" style={{ fontWeight: 700 }}>{nextQuantity}</span>
              </div>
            )}
            {tooMuch && (
              <div style={{ fontSize: 13, color: "var(--color-danger)" }}>
                Stock insuffisant : vous pouvez retirer au plus {Math.max(quantity, 0)} unité(s).
              </div>
            )}
            {adjustError && (
              <div style={{ fontSize: 13, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "8px 12px", borderRadius: 10 }}>{adjustError}</div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              style={{ height: 42, border: "none", borderRadius: 10, background: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed", opacity: canSubmit ? 1 : 0.5 }}
            >
              {saving ? "Enregistrement…" : "Valider la modification"}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 8 }}>Historique du stock</div>

        {loadError && (
          <div style={{ fontSize: 13, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "8px 12px", borderRadius: 10 }}>{loadError}</div>
        )}
        {loading && !loadError && <div style={{ fontSize: 13, color: "var(--color-text-faint)" }}>Chargement…</div>}
        {!loading && !loadError && movements.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--color-text-faint)" }}>Aucun mouvement enregistré pour cet article.</div>
        )}

        {movements.length > 0 && (
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, maxHeight: 280, overflowY: "auto", background: "var(--color-surface)" }}>
            {movements.map((m) => (
              <div
                key={m.id}
                style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 12, alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--color-divider)" }}
              >
                <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: m.delta > 0 ? "var(--color-accent)" : "var(--color-danger)" }}>
                  {formatDelta(m.delta)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                    {m.kind_label}
                    {m.source_ref && <span className="mono" style={{ color: "var(--color-text-faint)", fontWeight: 400 }}> · {m.source_ref}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-faint)" }}>
                    {formatDate(m.created_at)} · {m.employee_username || "—"}
                  </div>
                  {m.note && <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2 }}>« {m.note} »</div>}
                </div>
                <span className="mono" style={{ fontSize: 12.5, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                  {m.quantity_before} → {m.quantity_after}
                </span>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <button type="button" onClick={loadMore} disabled={loadingMore} style={{ ...secondaryButton, marginTop: 10, height: 34, fontSize: 13 }}>
            {loadingMore ? "Chargement…" : "Voir plus"}
          </button>
        )}
      </div>
    </div>
  );
}