'use client';

import { useEffect, useState, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { SkeletonRow } from '@/components/ui/SkeletonRow';

interface Allergen {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  lotNumber: string;
  stockConcentration: string;
  expiryDate: string;
  inStock: boolean;
}

const ALLERGEN_TYPES = ['Grass Pollen', 'Tree Pollen', 'Weed Pollen', 'Mold', 'Dust Mite', 'Animal', 'Insect', 'Food', 'Other'];

const EMPTY_FORM = {
  name: '',
  type: '',
  manufacturer: '',
  lotNumber: '',
  stockConcentration: '',
  expiryDate: '',
};

type AllergenForm = typeof EMPTY_FORM;

export default function AllergensPage() {
  const [allergens, setAllergens]         = useState<Allergen[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [addForm, setAddForm]             = useState<AllergenForm>(EMPTY_FORM);
  const [addSaving, setAddSaving]         = useState(false);
  const [addError, setAddError]           = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState('');

  // Edit modal state
  const [editAllergen, setEditAllergen]   = useState<Allergen | null>(null);
  const [editForm, setEditForm]           = useState<AllergenForm>(EMPTY_FORM);
  const [editSaving, setEditSaving]       = useState(false);
  const [editError, setEditError]         = useState<string | null>(null);

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState<Allergen | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const loadAllergens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/allergens');
      if (res.ok) {
        const data = await res.json();
        setAllergens(data.allergens ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAllergens(); }, [loadAllergens]);

  const setAdd = (field: string, value: string) => setAddForm((f) => ({ ...f, [field]: value }));
  const setEdit = (field: string, value: string) => setEditForm((f) => ({ ...f, [field]: value }));

  const handleAdd = async () => {
    setAddError(null);
    if (!addForm.name.trim()) { setAddError('Name is required.'); return; }
    if (!addForm.type)        { setAddError('Type is required.'); return; }
    setAddSaving(true);
    try {
      const res = await fetch('/api/allergens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          type: addForm.type,
          manufacturer: addForm.manufacturer,
          lotNumber: addForm.lotNumber,
          stockConcentration: addForm.stockConcentration,
          expiryDate: addForm.expiryDate,
        }),
      });
      if (res.ok) {
        await loadAllergens();
        setAddForm(EMPTY_FORM);
        setAddError(null);
        setShowAddForm(false);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setAddError(data.error ?? `Server error (${res.status}).`);
      }
    } catch {
      setAddError('Network error. Please try again.');
    } finally { setAddSaving(false); }
  };

  const openEdit = (a: Allergen) => {
    setEditAllergen(a);
    setEditForm({
      name: a.name,
      type: a.type,
      manufacturer: a.manufacturer,
      lotNumber: a.lotNumber,
      stockConcentration: a.stockConcentration,
      expiryDate: a.expiryDate,
    });
    setEditError(null);
  };

  const closeEdit = () => {
    setEditAllergen(null);
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (!editAllergen) return;
    setEditError(null);
    if (!editForm.name.trim()) { setEditError('Name is required.'); return; }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/allergens/${editAllergen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          type: editForm.type,
          manufacturer: editForm.manufacturer,
          lotNumber: editForm.lotNumber,
          stockConcentration: editForm.stockConcentration,
          expiryDate: editForm.expiryDate,
        }),
      });
      if (res.ok) {
        await loadAllergens();
        closeEdit();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setEditError(data.error ?? `Server error (${res.status}).`);
      }
    } catch {
      setEditError('Network error. Please try again.');
    } finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/allergens/${confirmDelete.id}`, { method: 'DELETE' });
      await loadAllergens();
      setConfirmDelete(null);
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  const filtered = allergens.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.manufacturer ?? '').toLowerCase().includes(search.toLowerCase());
    const matchType   = !typeFilter || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };
  const isExpired = (date: string) => !!date && new Date(date) < new Date();

  return (
    <>
      <TopBar
        title="Allergen Library"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Allergens' }]}
        actions={
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Allergen
          </button>
        }
      />
      <div className="page-content">
        {/* Add form */}
        {showAddForm && (
          <div className="card" style={{ marginBottom: 16, background: '#f0f7ff', border: '1px solid #90caf9' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#0055a5' }}>Add New Allergen</h3>
            {addError && (
              <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', fontSize: 13, border: '1px solid #fecaca', marginBottom: 10 }}>
                {addError}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div><label className="form-label">Name <span style={{ color: '#c62828' }}>*</span></label><input type="text" className="form-input" value={addForm.name} onChange={(e) => setAdd('name', e.target.value)} /></div>
              <div><label className="form-label">Type</label><select className="form-input" value={addForm.type} onChange={(e) => setAdd('type', e.target.value)}><option value="">Select type…</option>{ALLERGEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="form-label">Manufacturer</label><input type="text" className="form-input" value={addForm.manufacturer} onChange={(e) => setAdd('manufacturer', e.target.value)} /></div>
              <div><label className="form-label">Lot #</label><input type="text" className="form-input" value={addForm.lotNumber} onChange={(e) => setAdd('lotNumber', e.target.value)} /></div>
              <div><label className="form-label">Stock Concentration</label><input type="text" className="form-input" placeholder="1:20 w/v" value={addForm.stockConcentration} onChange={(e) => setAdd('stockConcentration', e.target.value)} /></div>
              <div><label className="form-label">Expiry Date</label><input type="date" className="form-input" value={addForm.expiryDate} onChange={(e) => setAdd('expiryDate', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={addSaving}>{addSaving ? 'Saving…' : 'Save Allergen'}</button>
              <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" className="search-input" placeholder="Search allergens…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 160 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {ALLERGEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>{filtered.length} allergen{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading allergens…</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No allergens in library yet. Click &quot;Add Allergen&quot; to build your inventory.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="clinical-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Type</th><th>Manufacturer</th><th>Lot #</th>
                      <th>Stock Conc.</th><th>Expires</th><th>Status</th><th style={{ width: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const expired = isExpired(a.expiryDate);
                      const soon    = !expired && isExpiringSoon(a.expiryDate);
                      return (
                        <tr
                          key={a.id}
                          onClick={() => openEdit(a)}
                          style={{ cursor: 'pointer' }}
                          className="allergen-row"
                        >
                          <td style={{ fontWeight: 600 }}>{a.name}</td>
                          <td><span style={{ fontSize: 11, padding: '2px 7px', background: '#f0f2f5', color: '#374151', fontWeight: 500 }}>{a.type}</span></td>
                          <td style={{ color: '#4b5563' }}>{a.manufacturer || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{a.lotNumber || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.stockConcentration || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: expired ? '#c62828' : soon ? '#f57c00' : '#374151', fontWeight: expired || soon ? 600 : 400 }}>
                            {a.expiryDate || '—'}{soon && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
                          </td>
                          <td>
                            {expired ? <span className="badge badge-expired">Expired</span>
                              : !a.inStock ? <span className="badge badge-inactive">Out of Stock</span>
                              : <span className="badge badge-active">In Stock</span>}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              {/* Edit button */}
                              <button
                                title="Edit"
                                onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#0d9488', padding: '4px', borderRadius: 4,
                                  display: 'flex', alignItems: 'center',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              {/* Delete button */}
                              <button
                                title="Delete"
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(a); }}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#dc2626', padding: '4px', borderRadius: 4,
                                  display: 'flex', alignItems: 'center',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editAllergen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closeEdit}
        >
          <div
            style={{
              background: '#fff', borderRadius: 8, padding: 28, width: 620, maxWidth: '95vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Allergen</h2>
              <button
                onClick={closeEdit}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 20, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {editError && (
              <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', fontSize: 13, border: '1px solid #fecaca', borderRadius: 4, marginBottom: 16 }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Name <span style={{ color: '#c62828' }}>*</span></label>
                <input
                  type="text" className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEdit('name', e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-input" value={editForm.type} onChange={(e) => setEdit('type', e.target.value)}>
                  <option value="">Select type…</option>
                  {ALLERGEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Manufacturer</label>
                <input type="text" className="form-input" value={editForm.manufacturer} onChange={(e) => setEdit('manufacturer', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Lot #</label>
                <input type="text" className="form-input" value={editForm.lotNumber} onChange={(e) => setEdit('lotNumber', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Stock Concentration</label>
                <input type="text" className="form-input" placeholder="1:10" value={editForm.stockConcentration} onChange={(e) => setEdit('stockConcentration', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Expiry Date</label>
                <input type="date" className="form-input" value={editForm.expiryDate} onChange={(e) => setEdit('expiryDate', e.target.value)} style={{ maxWidth: 200 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closeEdit}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleEditSave}
                disabled={editSaving}
                style={{ background: '#0d9488', borderColor: '#0d9488' }}
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 8, padding: 24, width: 400, maxWidth: '95vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Delete Allergen</h2>
            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 20 }}>
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn"
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .allergen-row:hover td {
          background-color: #f0fdfa;
        }
      `}</style>
    </>
  );
}
