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

const MOCK_ALLERGENS: Allergen[] = [
  { id: '1', name: 'Timothy Grass', type: 'Grass Pollen', manufacturer: 'ALK-Abello', lotNumber: 'TG-2024-44', stockConcentration: '1:20 w/v', expiryDate: '2027-01-15', inStock: true },
  { id: '2', name: 'Bermuda Grass', type: 'Grass Pollen', manufacturer: 'Greer Labs', lotNumber: 'BG-2024-12', stockConcentration: '1:20 w/v', expiryDate: '2026-08-30', inStock: true },
  { id: '3', name: 'Mountain Cedar', type: 'Tree Pollen', manufacturer: 'ALK-Abello', lotNumber: 'MC-2024-07', stockConcentration: '1:20 w/v', expiryDate: '2026-04-10', inStock: true },
  { id: '4', name: 'Ragweed (Short)', type: 'Weed Pollen', manufacturer: 'Stallergenes', lotNumber: 'RW-2024-88', stockConcentration: '1:20 w/v', expiryDate: '2026-10-01', inStock: true },
  { id: '5', name: 'Alternaria', type: 'Mold', manufacturer: 'Greer Labs', lotNumber: 'AL-2024-33', stockConcentration: '1:20 w/v', expiryDate: '2026-06-15', inStock: true },
  { id: '6', name: 'Aspergillus fumigatus', type: 'Mold', manufacturer: 'Greer Labs', lotNumber: 'AF-2023-19', stockConcentration: '1:20 w/v', expiryDate: '2026-03-01', inStock: false },
  { id: '7', name: 'Dermatophagoides pt.', type: 'Dust Mite', manufacturer: 'ALK-Abello', lotNumber: 'DPT-2024-55', stockConcentration: '1:10 w/v', expiryDate: '2027-02-28', inStock: true },
  { id: '8', name: 'Dermatophagoides far.', type: 'Dust Mite', manufacturer: 'ALK-Abello', lotNumber: 'DFar-2024-56', stockConcentration: '1:10 w/v', expiryDate: '2027-02-28', inStock: true },
  { id: '9', name: 'Cat Dander', type: 'Animal', manufacturer: 'Stallergenes', lotNumber: 'CAT-2024-21', stockConcentration: '1:20 w/v', expiryDate: '2026-11-30', inStock: true },
  { id: '10', name: 'Dog Dander', type: 'Animal', manufacturer: 'Stallergenes', lotNumber: 'DOG-2024-22', stockConcentration: '1:20 w/v', expiryDate: '2026-11-30', inStock: true },
];

const ALLERGEN_TYPES = ['Grass Pollen', 'Tree Pollen', 'Weed Pollen', 'Mold', 'Dust Mite', 'Animal', 'Insect', 'Food', 'Other'];

const EMPTY_FORM = {
  name: '',
  type: '',
  manufacturer: '',
  lotNumber: '',
  stockConcentration: '',
  expiryDate: '',
};

export default function AllergensPage() {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/allergens').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setAllergens(data.allergens || data);
        } else {
          setAllergens(MOCK_ALLERGENS);
        }
      } catch {
        setAllergens(MOCK_ALLERGENS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleAdd = () => {
    if (!form.name) return;
    const newItem: Allergen = {
      id: `a${Date.now()}`,
      name: form.name,
      type: form.type || 'Unknown',
      manufacturer: form.manufacturer,
      lotNumber: form.lotNumber,
      stockConcentration: form.stockConcentration,
      expiryDate: form.expiryDate,
      inStock: true,
    };
    setAllergens((prev) => [...prev, newItem]);
    setForm(EMPTY_FORM);
    setShowForm(false);

    // Also try to POST to API
    fetch('/api/allergens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  };

  const filtered = allergens.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.manufacturer.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  const isExpired = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

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
        {/* Inline add form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 16, background: '#f0f7ff', border: '1px solid #90caf9' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#0055a5' }}>Add New Allergen</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <label className="form-label">Name <span style={{ color: '#c62828' }}>*</span></label>
                <input type="text" className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="">Select type…</option>
                  {ALLERGEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Manufacturer</label>
                <input type="text" className="form-input" value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Lot #</label>
                <input type="text" className="form-input" value={form.lotNumber} onChange={(e) => set('lotNumber', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Stock Concentration</label>
                <input type="text" className="form-input" placeholder="1:20 w/v" value={form.stockConcentration} onChange={(e) => set('stockConcentration', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Expiry Date</label>
                <input type="date" className="form-input" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleAdd}>Save Allergen</button>
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
            <input
              type="text"
              className="search-input"
              placeholder="Search allergens…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-input"
            style={{ width: 160 }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {ALLERGEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
            {filtered.length} allergen{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading allergens…</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Manufacturer</th>
                    <th>Lot #</th>
                    <th>Stock Conc.</th>
                    <th>Expires</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                        No allergens found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => {
                      const expired = isExpired(a.expiryDate);
                      const expiringSoon = !expired && isExpiringSoon(a.expiryDate);
                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600 }}>{a.name}</td>
                          <td>
                            <span
                              style={{
                                fontSize: 11,
                                padding: '2px 7px',
                                background: '#f0f2f5',
                                color: '#374151',
                                fontWeight: 500,
                              }}
                            >
                              {a.type}
                            </span>
                          </td>
                          <td style={{ color: '#4b5563' }}>{a.manufacturer}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{a.lotNumber}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.stockConcentration}</td>
                          <td
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: expired ? '#c62828' : expiringSoon ? '#f57c00' : '#374151',
                              fontWeight: expired || expiringSoon ? 600 : 400,
                            }}
                          >
                            {a.expiryDate}
                            {expiringSoon && <span style={{ marginLeft: 6, fontSize: 10 }}>⚠</span>}
                          </td>
                          <td>
                            {expired ? (
                              <span className="badge badge-expired">Expired</span>
                            ) : !a.inStock ? (
                              <span className="badge badge-inactive">Out of Stock</span>
                            ) : (
                              <span className="badge badge-active">In Stock</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
