import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Check, X, AlertTriangle, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const C = {
  greenPrimary: '#1a4d2e', greenDark: '#0f2d1a', greenLight: '#e8f5ee',
  greenMid: '#2d7a4f', creamBg: '#fffdf7', creamCard: '#f5f0e8',
  creamBorder: '#e8e0cc', textMuted: '#5a5a4a', white: '#ffffff',
};

interface House {
  id:         string;
  name:       string;
  code:       string;
  colour:     string | null;
  student_count?: number;
}

const PRESET_COLOURS = [
  '#1a4d2e', '#2d7a4f', '#0f2d1a', '#3d8f5f',
  '#1e40af', '#7c3aed', '#b45309', '#dc2626',
  '#0891b2', '#059669', '#d97706', '#9d174d',
];

// ── Inline edit row ───────────────────────────────────────────
function HouseRow({
  house, onSave, onDelete,
}: {
  house:    House;
  onSave:   (id: string, name: string, code: string, colour: string) => Promise<string | null>;
  onDelete: (house: House) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(house.name);
  const [code,    setCode]    = useState(house.code);
  const [colour,  setColour]  = useState(house.colour ?? '#1a4d2e');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  async function handleSave() {
    if (!name.trim() || !code.trim()) { setErr('Name and code are required.'); return; }
    setSaving(true); setErr('');
    const error = await onSave(house.id, name.trim(), code.trim().toUpperCase(), colour);
    if (error) setErr(error);
    else setEditing(false);
    setSaving(false);
  }

  function handleCancel() {
    setName(house.name); setCode(house.code);
    setColour(house.colour ?? '#1a4d2e');
    setEditing(false); setErr('');
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px', borderRadius: '8px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none',
  };

  if (editing) {
    return (
      <div style={{ backgroundColor: C.creamCard, borderRadius: '14px', padding: '18px 20px', border: `1.5px solid ${C.greenPrimary}30` }}>
        {err && (
          <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '12px' }}>
            <AlertTriangle size={13} color="#dc2626" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: '#dc2626' }}>{err}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>House Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Akuamoah" style={{ ...inputStyle, width: '100%' }}
              onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
              autoFocus />
          </div>

          {/* Code */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Code</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="AKU" maxLength={6}
              style={{ ...inputStyle, width: '80px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
              onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }} />
          </div>

          {/* Colour */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Colour</label>
            <input type="color" value={colour} onChange={e => setColour(e.target.value)}
              style={{ width: '48px', height: '38px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, cursor: 'pointer', padding: '2px' }} />
          </div>
        </div>

        {/* Colour presets */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          {PRESET_COLOURS.map(c => (
            <button key={c} type="button" onClick={() => setColour(c)}
              aria-label={`Select colour ${c}`}
              style={{
                width: '24px', height: '24px', borderRadius: '6px', border: colour === c ? '2px solid #1a1a1a' : '2px solid transparent',
                backgroundColor: c, cursor: 'pointer', flexShrink: 0,
              }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button onClick={handleSave} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            backgroundColor: saving ? C.creamBorder : C.greenPrimary,
            color: saving ? C.textMuted : '#fff',
            fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : <><Check size={13} />Save</>}
          </button>
          <button onClick={handleCancel} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '8px 14px', borderRadius: '8px',
            border: `1.5px solid ${C.creamBorder}`, background: 'none',
            color: C.textMuted, fontSize: '13px', cursor: 'pointer',
          }}><X size={13} />Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 18px', borderRadius: '14px', backgroundColor: C.white,
      border: `1px solid ${C.creamBorder}`,
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#a3c4ae'; el.style.boxShadow = '0 2px 8px rgba(26,77,46,0.08)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = C.creamBorder; el.style.boxShadow = 'none'; }}
    >
      {/* Colour swatch */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        backgroundColor: house.colour ?? C.greenPrimary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} aria-hidden="true">
        <Home size={20} color="white" />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>{house.name}</p>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
            backgroundColor: C.creamCard, color: C.textMuted,
            fontFamily: 'monospace', border: `1px solid ${C.creamBorder}`,
          }}>{house.code}</span>
        </div>
        {house.student_count !== undefined && (
          <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
            {house.student_count} student{house.student_count !== 1 ? 's' : ''} assigned
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => setEditing(true)} aria-label={`Edit ${house.name}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '7px 12px', borderRadius: '8px', border: 'none',
            backgroundColor: C.greenLight, color: C.greenPrimary,
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>
          <Edit2 size={13} />Edit
        </button>
        <button onClick={() => onDelete(house)} aria-label={`Delete ${house.name}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '7px 12px', borderRadius: '8px', border: 'none',
            backgroundColor: '#fef2f2', color: '#dc2626',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>
          <Trash2 size={13} />Delete
        </button>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function HouseManagement() {
  const [houses,  setHouses]  = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState('');
  const [err,     setErr]     = useState('');

  // Add form
  const [showAdd,    setShowAdd]    = useState(false);
  const [addName,    setAddName]    = useState('');
  const [addCode,    setAddCode]    = useState('');
  const [addColour,  setAddColour]  = useState('#1a4d2e');
  const [adding,     setAdding]     = useState(false);

  async function loadHouses() {
    setLoading(true);
    // Load houses with student count
    const { data: houseData } = await supabase
      .from('houses')
      .select('id, name, code, colour')
      .order('name');

    if (!houseData) { setLoading(false); return; }

    // Get student counts per house
    const { data: counts } = await supabase
      .from('students')
      .select('house_id')
      .in('house_id', houseData.map(h => h.id));

    const countMap: Record<string, number> = {};
    (counts ?? []).forEach(s => {
      if (s.house_id) countMap[s.house_id] = (countMap[s.house_id] ?? 0) + 1;
    });

    setHouses(houseData.map(h => ({ ...h, student_count: countMap[h.id] ?? 0 })));
    setLoading(false);
  }

  useEffect(() => { loadHouses(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addCode.trim()) { setErr('Name and code are required.'); return; }
    setAdding(true); setErr(''); setMsg('');

    const { error } = await supabase.from('houses').insert({
      name:   addName.trim(),
      code:   addCode.trim().toUpperCase(),
      colour: addColour,
    });

    if (error) {
      setErr(error.code === '23505'
        ? `A house with code "${addCode.toUpperCase()}" or name "${addName}" already exists.`
        : error.message);
    } else {
      setMsg(`House "${addName.trim()}" added successfully.`);
      setAddName(''); setAddCode(''); setAddColour('#1a4d2e');
      setShowAdd(false);
      await loadHouses();
    }
    setAdding(false);
  }

  async function handleSave(id: string, name: string, code: string, colour: string): Promise<string | null> {
    const { error } = await supabase.from('houses').update({ name, code, colour }).eq('id', id);
    if (error) return error.code === '23505' ? `Code "${code}" or name "${name}" is already used by another house.` : error.message;
    setMsg(`House "${name}" updated.`);
    await loadHouses();
    return null;
  }

  async function handleDelete(house: House): Promise<string | null> {
    if ((house.student_count ?? 0) > 0) {
      setErr(`Cannot delete "${house.name}" — ${house.student_count} student${house.student_count !== 1 ? 's are' : ' is'} assigned to it. Reassign them first in Student Register.`);
      return `${house.student_count} students are assigned to this house.`;
    }

    // Also check if any election positions reference this house
    const { count: posCount } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('house_id', house.id);

    if ((posCount ?? 0) > 0) {
      setErr(`Cannot delete "${house.name}" — it is referenced by ${posCount} election position${posCount !== 1 ? 's' : ''}. Delete those elections first in Election Settings.`);
      return `${posCount} election positions reference this house.`;
    }

    if (!window.confirm(`Delete house "${house.name}" (${house.code})?`)) return null;

    const { error } = await supabase.from('houses').delete().eq('id', house.id);
    if (error) {
      const msg = error.code === '23503'
        ? `Cannot delete "${house.name}" — it is still referenced by other records. Check Election Settings and Student Register first.`
        : error.message;
      setErr(msg); return msg;
    }
    setMsg(`House "${house.name}" deleted.`);
    await loadHouses();
    return null;
  }

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px', borderRadius: '8px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>House Management</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>
                Add, edit and manage school houses
              </p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '36px 24px' }}>

        {/* Info note */}
        <div style={{ padding: '14px 18px', borderRadius: '12px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: C.greenPrimary, lineHeight: 1.65 }}>
            House names here must match exactly what you use in the student import CSV.
            House Captains are elected per house — one Male, one Female per house.
          </p>
        </div>

        {/* Feedback */}
        {msg && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '10px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '16px' }}>
            <Check size={15} color={C.greenPrimary} style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: C.greenPrimary, fontWeight: 600 }}>{msg}</p>
          </div>
        )}
        {err && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '16px' }}>
            <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: '#dc2626' }}>{err}</p>
          </div>
        )}

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontWeight: 800, fontSize: '17px', color: C.greenPrimary }}>
            {loading ? 'Loading…' : `${houses.length} House${houses.length !== 1 ? 's' : ''}`}
          </h2>
          <button onClick={() => { setShowAdd(v => !v); setErr(''); setMsg(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', borderRadius: '10px', border: 'none',
              backgroundColor: showAdd ? C.creamBorder : C.greenPrimary,
              color: showAdd ? C.textMuted : '#fff',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            }}>
            {showAdd ? <><X size={15} />Cancel</> : <><Plus size={15} />Add House</>}
          </button>
        </div>

        {/* Add house form */}
        {showAdd && (
          <form onSubmit={handleAdd} style={{
            backgroundColor: C.creamCard, borderRadius: '14px', padding: '20px',
            border: `1px solid ${C.creamBorder}`, marginBottom: '20px',
          }}>
            <p style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary, marginBottom: '14px' }}>
              New House
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  House Name *
                </label>
                <input value={addName} onChange={e => setAddName(e.target.value)}
                  placeholder="e.g. Akuamoah" style={{ ...inputStyle, width: '100%' }}
                  onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                  autoFocus required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Code *
                </label>
                <input value={addCode} onChange={e => setAddCode(e.target.value.toUpperCase())}
                  placeholder="AKU" maxLength={6}
                  style={{ ...inputStyle, width: '80px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                  onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                  required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Colour
                </label>
                <input type="color" value={addColour} onChange={e => setAddColour(e.target.value)}
                  style={{ width: '48px', height: '38px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, cursor: 'pointer', padding: '2px' }} />
              </div>
            </div>

            {/* Colour presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              {PRESET_COLOURS.map(c => (
                <button key={c} type="button" onClick={() => setAddColour(c)}
                  aria-label={`Select colour ${c}`}
                  style={{
                    width: '24px', height: '24px', borderRadius: '6px',
                    border: addColour === c ? '2px solid #1a1a1a' : '2px solid transparent',
                    backgroundColor: c, cursor: 'pointer', flexShrink: 0,
                  }} />
              ))}
            </div>

            <button type="submit" disabled={adding} style={{
              display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px',
              padding: '10px 20px', borderRadius: '9px', border: 'none',
              backgroundColor: adding ? C.creamBorder : C.greenPrimary,
              color: adding ? C.textMuted : '#fff',
              fontSize: '13px', fontWeight: 700, cursor: adding ? 'not-allowed' : 'pointer',
            }}>
              <Plus size={15} />{adding ? 'Adding…' : 'Add House'}
            </button>
          </form>
        )}

        {/* Houses list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: C.textMuted, fontSize: '13px' }}>Loading houses…</p>
          </div>
        ) : houses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', backgroundColor: C.white, borderRadius: '16px', border: `1px solid ${C.creamBorder}` }}>
            <Home size={36} color={C.creamBorder} style={{ margin: '0 auto 14px' }} />
            <p style={{ fontWeight: 700, color: C.greenPrimary, marginBottom: '6px' }}>No houses yet</p>
            <p style={{ fontSize: '13px', color: C.textMuted }}>Click "Add House" above to create the first one.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {houses.map(house => (
              <HouseRow
                key={house.id}
                house={house}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Summary */}
        {houses.length > 0 && (
          <div style={{ marginTop: '24px', padding: '16px 20px', borderRadius: '12px', backgroundColor: C.white, border: `1px solid ${C.creamBorder}` }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              House Summary
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              {houses.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: C.creamCard }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: h.colour ?? C.greenPrimary, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>{h.name}</p>
                    <p style={{ fontSize: '11px', color: C.textMuted }}>{h.student_count ?? 0} students</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
