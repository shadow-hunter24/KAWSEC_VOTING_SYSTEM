import { useState } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/tokens';

interface ClassRow { id: string; name: string; year_group: number; department_id: string; }
interface HouseRow { id: string; name: string; code: string; }

export default function AddStudentModal({
  classes, houses, onSave, onClose,
}: {
  classes: ClassRow[];
  houses:  HouseRow[];
  onSave:  () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    full_name: '', gender: 'male' as 'male' | 'female',
    class_id: '', house_id: '', year_group: 3,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [genId,  setGenId]  = useState('');

  const classOptions = classes.slice().sort((a, b) =>
    a.year_group - b.year_group || a.name.localeCompare(b.name)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.full_name.trim();
    if (!name || name.split(/\s+/).length < 2) {
      setError('Full name must be at least two words.'); return;
    }
    if (!form.class_id) { setError('Class is required.'); return; }
    setSaving(true); setError('');

    const houseName = houses.find(h => h.id === form.house_id)?.name ?? '';

    const { data, error: rpcErr } = await supabase.rpc('bulk_import_students_by_class', {
      p_class_id: form.class_id,
      p_students: JSON.stringify([{ full_name: name, gender: form.gender, house_name: houseName }]),
      p_year: new Date().getFullYear(),
    });

    if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }

    const errs = data?.errors as { name: string; error: string }[] | undefined;
    if (errs && errs.length > 0) { setError(errs[0].error); setSaving(false); return; }

    const generated = data?.generated?.[0] as { id: string } | undefined;
    if (generated) setGenId(generated.id);
    onSave();
    setSaving(false);
  }

  const lbl: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' };
  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '9px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none' };
  const foc = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = C.greenPrimary; };
  const blr = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = C.creamBorder; };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="add-student-title"
      style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(15,45,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ backgroundColor: C.creamBg, borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 24px 64px rgba(15,45,26,0.35)', overflow: 'hidden' }}>

        <div style={{ padding: '20px 24px', backgroundColor: C.greenPrimary, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 id="add-student-title" style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Add Student</h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px', marginTop: '2px' }}>Student ID auto-generated from class</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.7)', padding: '4px' }}><X size={20} /></button>
        </div>

        {genId && (
          <div style={{ padding: '12px 20px', backgroundColor: C.greenLight, borderBottom: `1px solid ${C.greenMid}40`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Check size={16} color={C.greenPrimary} />
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: C.greenPrimary }}>Student added successfully</p>
              <p style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 800, color: C.greenPrimary, marginTop: '2px' }}>{genId}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '12px', color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <div>
            <label style={lbl}>Full Name *</label>
            <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. Kwame Asante Mensah" style={inp} onFocus={foc} onBlur={blr} autoFocus required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>Gender *</label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as 'male' | 'female' }))}
                style={{ ...inp, cursor: 'pointer' }} onFocus={foc} onBlur={blr}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Year Group *</label>
              <select value={form.year_group} onChange={e => setForm(f => ({ ...f, year_group: Number(e.target.value) }))}
                style={{ ...inp, cursor: 'pointer' }} onFocus={foc} onBlur={blr}>
                <option value={1}>Form 1</option>
                <option value={2}>Form 2</option>
                <option value={3}>Form 3</option>
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>House</label>
            <select value={form.house_id} onChange={e => setForm(f => ({ ...f, house_id: e.target.value }))}
              style={{ ...inp, cursor: 'pointer' }} onFocus={foc} onBlur={blr}>
              <option value="">— No house assigned —</option>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, background: 'none', color: C.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', backgroundColor: saving ? C.creamBorder : C.greenPrimary, color: saving ? C.textMuted : '#fff', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {saving ? 'Adding…' : <><Check size={15} /> Add Student</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
