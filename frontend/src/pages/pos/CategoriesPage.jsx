import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { useShopResource } from "../../lib/useShopResource";
import { apiClient, extractErrorMessage } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

export default function CategoriesPage() {
  const { activeShopId } = useShop();
  const { items, count, totalPages, page, setPage, loading, reload } = useShopResource("categories/");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(category) {
    setEditing(category);
    setName(category.name);
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await apiClient.patch(`/shops/${activeShopId}/categories/${editing.id}/`, { name });
      } else {
        await apiClient.post(`/shops/${activeShopId}/categories/`, { name });
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    const confirmed = confirm(
      `Supprimer « ${category.name} » ? Tous les produits rattachés à cette catégorie seront supprimés avec elle.`
    );
    if (!confirmed) return;
    try {
      await apiClient.delete(`/shops/${activeShopId}/categories/${category.id}/`);
      reload();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Catégories"
        subtitle="Nomenclature partagée entre toutes vos boutiques"
        actions={
          <button onClick={openCreate} style={{ ...primaryButtonStyle, height: 42, padding: "0 16px" }}>
            <span className="icon" style={{ fontSize: 20 }}>add</span>Nouvelle catégorie
          </button>
        }
      />

      <div style={{ padding: "22px 32px 40px" }}>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.4fr", gap: 16, padding: "14px 24px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", fontSize: 11.5, textTransform: "uppercase", color: "var(--color-text-faint)", fontWeight: 600 }}>
            <span>Nom</span><span></span>
          </div>

          {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Chargement…</div>}
          {!loading && items.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>
              Aucune catégorie. Créez-en une pour commencer à organiser vos produits.
            </div>
          )}

          {items.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 0.4fr", gap: 16, alignItems: "center", padding: "14px 24px", borderBottom: "1px solid var(--color-divider)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "var(--color-accent-soft)",
                    color: "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="icon" style={{ fontSize: 17 }}>sell</span>
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{c.name}</span>
              </div>
              <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                <button onClick={() => openEdit(c)} style={{ width: 34, height: 34, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 9, cursor: "pointer" }}>
                  <span className="icon" style={{ fontSize: 18 }}>edit</span>
                </button>
                <button onClick={() => handleDelete(c)} style={{ width: 34, height: 34, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 9, cursor: "pointer", color: "var(--color-danger)" }}>
                  <span className="icon" style={{ fontSize: 18 }}>delete</span>
                </button>
              </span>
            </div>
          ))}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} />
        </div>
      </div>

      {modalOpen && (
        <Modal title={editing ? "Modifier la catégorie" : "Nouvelle catégorie"} onClose={() => setModalOpen(false)} width={400}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              <span>Nom</span>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>

            {error && <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

            <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}