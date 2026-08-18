import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { useShopResource } from "../../lib/useShopResource";
import { apiClient, asList, extractErrorMessage } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " FCFA";
}

const EMPTY_FORM = { name: "", description: "", category: "", price: "", purchase_price: "", quantity: 0 };

export default function ProductsPage() {
  const { activeShopId } = useShop();
  const [search, setSearch] = useState("");
  const { items, count, totalPages, page, setPage, loading, reload } = useShopResource("items/", { search });

  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeShopId) return;
    apiClient.get(`/shops/${activeShopId}/categories/`, { params: { page_size: 100 } }).then(({ data }) => setCategories(asList(data)));
  }, [activeShopId]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || "",
      category: item.category,
      price: item.price,
      purchase_price: item.purchase_price,
      quantity: item.quantity,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await apiClient.patch(`/shops/${activeShopId}/items/${editing.id}/`, form);
      } else {
        await apiClient.post(`/shops/${activeShopId}/items/`, form);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Supprimer « ${item.name} » ?`)) return;
    await apiClient.delete(`/shops/${activeShopId}/items/${item.id}/`);
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${count} référence(s)`}
        actions={
          <button onClick={openCreate} style={{ ...primaryButtonStyle, height: 42, padding: "0 16px" }}>
            <span className="icon" style={{ fontSize: 20 }}>add</span>Nouveau produit
          </button>
        }
      />

      <div style={{ padding: "22px 32px 40px" }}>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Rechercher un produit…"
          style={{ ...inputStyle, width: 320, marginBottom: 16 }}
        />

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1.1fr 0.9fr 1.1fr 0.7fr", gap: 16, padding: "14px 24px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", fontSize: 11.5, textTransform: "uppercase", color: "var(--color-text-faint)", fontWeight: 600 }}>
            <span>Article</span><span>Catégorie</span><span>Stock</span><span style={{ textAlign: "right" }}>Prix</span><span></span>
          </div>

          {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Chargement…</div>}
          {!loading && items.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Aucun produit.</div>}

          {items.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2.4fr 1.1fr 0.9fr 1.1fr 0.7fr", gap: 16, alignItems: "center", padding: "15px 24px", borderBottom: "1px solid var(--color-divider)" }}>
              <span style={{ fontSize: 14.5, fontWeight: 500 }}>{p.name}</span>
              <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{p.category_name}</span>
              <span style={{ fontSize: 13, color: p.quantity <= 5 ? "var(--color-warning)" : "var(--color-text-secondary)" }}>{p.quantity}</span>
              <span className="mono" style={{ fontSize: 14, textAlign: "right", fontWeight: 500 }}>{formatFcfa(p.price)}</span>
              <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                <button onClick={() => openEdit(p)} style={{ width: 34, height: 34, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 9, cursor: "pointer" }}>
                  <span className="icon" style={{ fontSize: 18 }}>edit</span>
                </button>
                <button onClick={() => handleDelete(p)} style={{ width: 34, height: 34, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 9, cursor: "pointer", color: "var(--color-danger)" }}>
                  <span className="icon" style={{ fontSize: 18 }}>delete</span>
                </button>
              </span>
            </div>
          ))}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} />
        </div>
      </div>

      {modalOpen && (
        <Modal title={editing ? "Modifier le produit" : "Nouveau produit"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              <span>Nom</span>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label style={labelStyle}>
              <span>Catégorie</span>
              <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="" disabled>Choisir…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                <span>Prix de vente</span>
                <input type="number" style={inputStyle} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </label>
              <label style={labelStyle}>
                <span>Prix d'achat</span>
                <input type="number" style={inputStyle} value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
              </label>
            </div>
            {!editing && (
              <label style={labelStyle}>
                <span>Stock initial</span>
                <input type="number" style={inputStyle} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </label>
            )}
            <label style={labelStyle}>
              <span>Description</span>
              <textarea style={{ ...inputStyle, height: 80, padding: 12 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>

            {error && <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

            <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}