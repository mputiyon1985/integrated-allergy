'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';

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
const EMPTY_FORM = { name: '', type: '', manufacturer: '', lotNumber: '', stockConcentration: '', expiryDate: '' };

export default function AllergensPage() {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadAllergens = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/allergens');
      if (res.ok) {
        const data = await res.json();
        setAllergens(data.allergens ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAllergens(); }, []);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/allergens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type || 'Other',
          manufacturer: form.manufacturer,
          lotNumber: form.lotNumber,
          stockConcentration: form.stockConcentration,
          expiryDate: form.expiryDate,
        }),
      });
      if (res.ok) {
        await loadAllergens();
        setForm(EMPTY_FORM);
        setShowForm(false);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
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
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Allergen
          </button>
        }
      />
      <div className="page-content">
        {/* Add form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 16, background: '#f0f7ff', border: '1px solid #90caf9' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#0055a5' }}>Add New Allergen</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div><label className="form-label">Name <span style={{ color: '#c62828' }}>*</span></label><input type="text" className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={(e) => set('type', e.target.value)}><option value="">Select type…</option>{ALLERGEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="form-label">Manufacturer</label><input type="text" className="form-input" value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} /></div>
              <div><label className="form-label">Lot #</label><input type="text" className="form-input" value={form.lotNumber} onChange={(e) => set('lotNumber', e.target.value)} /></div>
              <div><label className="form-label">Stock Concentration</label><input type="text" className="form-input" placeholder="1:20 w/v" value={form.stockConcentration} onChange={(e) => set('stockConcentration', e.target.value)} /></div>
              <div><label className="form-label">Expiry Date</label><input type="date" className="form-input" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Save Allergen'}</button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
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
                No allergens in library yet. Click "Add Allergen" to build your inventory.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="clinical-table">
                  <thead>
                    <tr><th>Name</th><th>Type</th><th>Manufacturer</th><th>Lot #</th><th>Stock Conc.</th><th>Expires</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const expired = isExpired(a.expiryDate);
                      const soon    = !expired && isExpiringSoon(a.expiryDate);
                      return (
                        <tr key={a.id}>
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
    </>
  );
}
