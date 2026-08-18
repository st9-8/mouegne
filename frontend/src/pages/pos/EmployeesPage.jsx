import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { useShopResource } from "../../lib/useShopResource";
import { apiClient, extractErrorMessage } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

const ROLES = [
  { value: "OWNER", label: "Propriétaire" },
  { value: "MANAGER", label: "Gérant" },
  { value: "CASHIER", label: "Caissier" },
];

export default function EmployeesPage() {
  const { activeShopId } = useShop();
  const { items, count, totalPages, page, setPage, loading, reload } = useShopResource("employees/");

  const [modalOpen, setModalOpen] = useState(false);
  // NB: l'API attend un `user` (id) déjà existant, pas une création d'utilisateur ici.
  // À terme, un flux d'invitation par email/téléphone créerait le User au premier accès.
  const [form, setForm] = useState({ user: "", role: "CASHIER" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/shops/${activeShopId}/employees/`, form);
      setModalOpen(false);
      setForm({ user: "", role: "CASHIER" });
      reload();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(employee) {
    await apiClient.patch(`/shops/${activeShopId}/employees/${employee.id}/`, { is_active: !employee.is_active });
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Employés"
        subtitle="Accès et rôles sur cette boutique"
        actions={
          <button onClick={() => setModalOpen(true)} style={{ ...primaryButtonStyle, height: 42, padding: "0 16px" }}>
            <span className="icon" style={{ fontSize: 20 }}>person_add</span>Ajouter un employé
          </button>
        }
      />

      <div style={{ padding: "22px 32px 40px" }}>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", gap: 16, padding: "14px 24px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", fontSize: 11.5, textTransform: "uppercase", color: "var(--color-text-faint)", fontWeight: 600 }}>
            <span>Utilisateur</span><span>Rôle</span><span>Statut</span><span></span>
          </div>
          {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Chargement…</div>}
          {!loading && items.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Aucun employé sur cette boutique.</div>}
          {items.map((e) => (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", gap: 16, alignItems: "center", padding: "15px 24px", borderBottom: "1px solid var(--color-divider)" }}>
              <span style={{ fontSize: 14.5, fontWeight: 500 }}>{e.username}</span>
              <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{ROLES.find((r) => r.value === e.role)?.label || e.role}</span>
              <span style={{ fontSize: 13, color: e.is_active ? "var(--color-accent)" : "var(--color-text-faint)" }}>
                {e.is_active ? "Actif" : "Désactivé"}
              </span>
              <button onClick={() => toggleActive(e)} style={{ height: 32, padding: "0 12px", border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 8, fontSize: 12.5, cursor: "pointer", justifySelf: "start" }}>
                {e.is_active ? "Désactiver" : "Réactiver"}
              </button>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} />
        </div>
      </div>

      {modalOpen && (
        <Modal title="Ajouter un employé" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              <span>Identifiant utilisateur (ID)</span>
              <input style={inputStyle} value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} required />
            </label>
            <p style={{ fontSize: 12.5, color: "var(--color-text-faint)", margin: 0 }}>
              L'utilisateur doit déjà avoir un compte Mouegne. Un flux d'invitation par téléphone/email
              arrivera dans une prochaine version pour créer le compte directement depuis cet écran.
            </p>
            <label style={labelStyle}>
              <span>Rôle</span>
              <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>

            {error && <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

            <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Ajout…" : "Ajouter"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
