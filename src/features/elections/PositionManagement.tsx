import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, Check, X, AlertTriangle, ChevronDown, ChevronUp,
  ListPlus, UserCheck, ArrowRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Election } from '../../types';
import { C } from '../../lib/tokens';

/* ── Types ─────────────────────────────────────────────────── */
interface House { id: string; name: string; }

interface Position {
  id:                string;
  election_id:       string;
  title:             string;
  role_group:        string;
  gender_scope:      'male' | 'female' | 'all';
  eligibility_scope: 'school_wide' | 'house';
  house_id:          string | null;
  houses:            { name: string } | null;
  sort_order:        number;
  candidate_count?:  number;
}

interface EditState {
  title:             string;
  role_group:         string;
  gender_scope:       'male' | 'female' | 'all';
  eligibility_scope:  'school_wide' | 'house';
  house_id:           string;
  sort_order:         number;
}

/* ── Edit modal ─────────────────────────────────────────────── */
function EditModal({
  position, houses, onSave, onClose,
}: {
  position: Position;
  houses:  House[];
  onSave:  (id: string, data: EditState) => Promise<string | null>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditState>({
    title:             position.title,
    role_group:        position.role_group,
    gender_scope:      position.gender_scope,
    eligibility_scope: position.eligibility_scope,
    house_id:          position.house_id ?? '',
    sort_order:        position.sort_order,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.role_group.trim()) { setError('Role group is required.'); return; }
    if (form.eligibility_scope === 'house' && !form.house_id) {
      setError('A house must be selected for house-scoped positions.'); return;
    }
    setSaving(true); setError('');
    const err = await onSave(position.id, {
      ...form,
      title:      form.title.trim(),
      role_group: form.role_group.trim(),
      house_id:   form.eligibility_scope === 'house' ? form.house_id : '',
    });
    if (err) setError(err);
    else onClose();
    setSaving(false);
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: C.greenPrimary, marginBottom: '5px',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '9px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none',
    transition: 'border-color 0.15s',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = C.greenPrimary;
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = C.creamBorder;
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="edit-pos-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(15,45,26,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: C.creamBg, borderRadius: '20px',
        width: '100%', maxWidth: '480px',
        boxShadow: '0 24px 64px rgba(15,45,26,0.35)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', backgroundColor: C.greenPrimary, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 id="edit-pos-title" style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Edit Position</h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.7)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '12px', color: '#dc2626' }}>{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="pos-title" style={labelStyle}>Position Title *</label>
            <input id="pos-title" type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Head Boy, Sports Prefect (Male)"
              style={inputStyle} onFocus={focus} onBlur={blur} required />
          </div>

          {/* Role group */}
          <div>
            <label htmlFor="pos-role" style={labelStyle}>Role Group *</label>
            <input id="pos-role" type="text" value={form.role_group}
              onChange={e => setForm(f => ({ ...f, role_group: e.target.value }))}
              placeholder="e.g. School Prefect, Sports Prefect (groups positions in UI)"
              style={inputStyle} onFocus={focus} onBlur={blur} required />
          </div>

          {/* Eligibility */}
          <div>
            <label htmlFor="pos-elig" style={labelStyle}>Eligibility *</label>
            <select id="pos-elig" value={form.eligibility_scope}
              onChange={e => setForm(f => ({ ...f, eligibility_scope: e.target.value as 'school_wide' | 'house' }))}
              style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
              <option value="school_wide">School-wide</option>
              <option value="house">House only</option>
            </select>
          </div>

          {/* House (conditional) */}
          {form.eligibility_scope === 'house' && (
            <div>
              <label htmlFor="pos-house" style={labelStyle}>House *</label>
              <select id="pos-house" value={form.house_id}
                onChange={e => setForm(f => ({ ...f, house_id: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur} required>
                <option value="">— Select house —</option>
                {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}

          {/* Sort order */}
          <div>
            <label htmlFor="pos-sort" style={labelStyle}>Sort Order</label>
            <input id="pos-sort" type="number" value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              style={inputStyle} onFocus={focus} onBlur={blur} />
            <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>
              Controls ballot order. Lower numbers appear first.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '11px', borderRadius: '10px',
              border: `1.5px solid ${C.creamBorder}`, background: 'none',
              color: C.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '11px', borderRadius: '10px', border: 'none',
              backgroundColor: saving ? C.creamBorder : C.greenPrimary,
              color: saving ? C.textMuted : '#fff',
              fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              {saving ? 'Saving…' : <><Check size={15} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function PositionManagement() {
  const [elections,  setElections]  = useState<Election[]>([]);
  const [activeElec, setActiveElec] = useState<string>('');
  const [activeElecStatus, setActiveElecStatus] = useState<string>('draft');
  const [positions, setPositions]  = useState<Position[]>([]);
  const [houses,     setHouses]     = useState<House[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Add form
  const [showAdd,      setShowAdd]      = useState(false);
  const [newRoleName,  setNewRoleName]  = useState('');
  const [newElig,      setNewElig]      = useState<'school_wide' | 'house'>('school_wide');
  const [newHouse,     setNewHouse]     = useState('');
  const [adding,       setAdding]       = useState(false);

  // Edit
  const [editing,  setEditing]  = useState<Position | null>(null);
  const [saveMsg,  setSaveMsg]  = useState('');
  const [saveErr,  setSaveErr]  = useState('');

  // Load elections + houses
  useEffect(() => {
    Promise.all([
      supabase.from('elections').select('id, title, status').order('created_at', { ascending: false }),
      supabase.from('houses').select('id, name').order('name'),
    ]).then(([{ data: els }, { data: hs }]) => {
      const list = els ?? [];
      setElections(list as Election[]);
      setHouses((hs as House[]) ?? []);
      if (list.length > 0) {
        setActiveElec(list[0].id);
        setActiveElecStatus(list[0].status ?? 'draft');
      }
      setLoading(false);
    });
  }, []);

  // Load positions when election changes
  const loadPositions = useCallback(async () => {
    if (!activeElec) return;
    setLoading(true);
    const { data } = await supabase
      .from('positions')
      .select('*, houses(name)')
      .eq('election_id', activeElec)
      .order('sort_order');
    setPositions((data as Position[]) ?? []);
    setLoading(false);
  }, [activeElec]);

  useEffect(() => {
    const el = elections.find(e => e.id === activeElec);
    setActiveElecStatus(el?.status ?? 'draft');
    loadPositions();
  }, [activeElec, elections, loadPositions]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const roleName = newRoleName.trim();
    if (!roleName) { setSaveErr('Role name is required.'); return; }
    if (newElig === 'house' && !newHouse) { setSaveErr('Select a house for house-scoped positions.'); return; }
    setAdding(true); setSaveErr(''); setSaveMsg('');

    const sortBase = positions.length > 0 ? Math.max(...positions.map(p => p.sort_order)) + 1 : 1;

    const { error: errMale } = await supabase.from('positions').insert({
      election_id:       activeElec,
      title:             `${roleName} (Male)`,
      role_group:        roleName,
      gender_scope:      'male',
      eligibility_scope: newElig,
      house_id:          newElig === 'house' ? newHouse : null,
      sort_order:        sortBase,
    });

    if (errMale) {
      setSaveErr(errMale.message);
      setAdding(false);
      return;
    }

    const { error: errFemale } = await supabase.from('positions').insert({
      election_id:       activeElec,
      title:             `${roleName} (Female)`,
      role_group:        roleName,
      gender_scope:      'female',
      eligibility_scope: newElig,
      house_id:          newElig === 'house' ? newHouse : null,
      sort_order:        sortBase + 1,
    });

    if (errFemale) {
      setSaveErr(errFemale.message);
      setAdding(false);
      return;
    }

    // Auto-generate entitlements so students can vote on these positions immediately
    try {
      const { data: entData } = await supabase.rpc('generate_voting_entitlements', {
        p_election_id: activeElec,
      });
      const count = entData?.entitlements_created ?? 0;
      setSaveMsg(`Role added: 2 positions created for "${roleName}". ${count} entitlements generated — eligible students can now vote on these positions.`);
    } catch {
      setSaveMsg(`Role added: 2 positions created for "${roleName}". Run "Generate Entitlements" in Election Settings if students can't see them.`);
    }

    setNewRoleName(''); setNewElig('school_wide'); setNewHouse('');
    setShowAdd(false);
    await loadPositions();
    setAdding(false);
  }

  async function handleSave(id: string, data: EditState): Promise<string | null> {
    const { error } = await supabase.from('positions').update({
      title:             data.title,
      role_group:        data.role_group,
      gender_scope:      data.gender_scope,
      eligibility_scope: data.eligibility_scope,
      house_id:          data.eligibility_scope === 'house' ? data.house_id : null,
      sort_order:        data.sort_order,
    }).eq('id', id);

    if (error) return error.message;
    setSaveMsg(`Position "${data.title}" updated.`);
    await loadPositions();
    return null;
  }

  async function handleDelete(pos: Position) {
    if (!window.confirm(`Delete "${pos.title}"? Any candidates for this position will also be removed.`)) return;
    setSaveErr(''); setSaveMsg('');
    const { error } = await supabase.from('positions').delete().eq('id', pos.id);
    if (error) {
      setSaveErr(error.message);
    } else {
      setSaveMsg(`Position "${pos.title}" deleted.`);
      await loadPositions();
    }
  }

  const roleGroups = [...new Set(positions.map(p => p.role_group))];
  const canAdd  = ['draft', 'approved', 'open'].includes(activeElecStatus);
  const canEdit = activeElecStatus === 'draft';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '9px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none',
    transition: 'border-color 0.15s',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = C.greenPrimary;
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = C.creamBorder;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Position Management</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>
                Add and manage ballot positions for each election
              </p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 24px' }}>

        {/* Feedback */}
        {saveMsg && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '10px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '16px' }}>
            <Check size={15} color={C.greenPrimary} style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '13px', color: C.greenPrimary, fontWeight: 600 }}>{saveMsg}</p>
          </div>
        )}
        {saveErr && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '16px' }}>
            <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '13px', color: '#dc2626' }}>{saveErr}</p>
          </div>
        )}

        {loading && !activeElec ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading elections…</p>
        ) : elections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <ListPlus size={36} color={C.creamBorder} style={{ margin: '0 auto 14px' }} />
            <p style={{ color: C.textMuted, fontSize: '15px' }}>No elections found.</p>
            <p style={{ color: C.textMuted, fontSize: '13px', marginTop: '6px' }}>
              Create an election first in <Link to="/admin/elections" style={{ color: C.greenPrimary, fontWeight: 600 }}>Election Settings</Link>.
            </p>
          </div>
        ) : (
          <>
            {/* Election selector */}
            {elections.length >= 1 && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.greenPrimary, marginBottom: '6px' }}>Election</label>
                <select
                  value={activeElec}
                  onChange={e => setActiveElec(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.creamBorder}`, fontSize: '14px', backgroundColor: C.white, cursor: 'pointer', minWidth: '300px' }}
                >
                  {elections.map(e => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}
                </select>
              </div>
            )}

            {/* Read-only warning */}
            {!canEdit && (
              <div style={{ padding: '14px 18px', borderRadius: '12px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.65 }}>
                  {canAdd
                    ? <>Editing and deleting positions is locked. You can still <strong>add new roles</strong> — entitlements will be generated automatically so eligible students can vote on them.</>
                    : <>This election is <strong>{activeElecStatus}</strong>. Positions are fully locked and cannot be changed.</>
                  }
                </p>
              </div>
            )}

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontWeight: 800, fontSize: '17px', color: C.greenPrimary }}>
                {loading ? 'Loading…' : `${positions.length} Position${positions.length !== 1 ? 's' : ''}`}
              </h2>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {canAdd && positions.length > 0 && (
                  <Link to="/admin/candidates" style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 16px', borderRadius: '10px',
                    backgroundColor: C.greenLight, color: C.greenPrimary,
                    fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                  }}>
                    <UserCheck size={15} /> Add Candidates
                  </Link>
                )}
                {canAdd && (
                  <button onClick={() => { setShowAdd(v => !v); setSaveErr(''); setSaveMsg(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 18px', borderRadius: '10px', border: 'none',
                      backgroundColor: showAdd ? C.creamBorder : C.greenPrimary,
                      color: showAdd ? C.textMuted : '#fff',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    }}>
                    {showAdd ? <><X size={15} />Cancel</> : <><Plus size={15} />Add Role</>}
                  </button>
                )}
              </div>
            </div>

            {/* Add form */}
            {showAdd && canAdd && (
              <form onSubmit={handleAdd} style={{
                backgroundColor: C.white, borderRadius: '16px', padding: '24px',
                border: `1px solid ${C.creamBorder}`, marginBottom: '24px',
              }}>
                <h3 style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} /> New Role
                </h3>

                {/* Role Name */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '4px' }}>Role Name *</label>
                  <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                    placeholder="e.g. School Prefect, Sports Prefect"
                    style={inputStyle} onFocus={focus} onBlur={blur} autoFocus required />
                  {/* Live preview */}
                  {newRoleName.trim() && (
                    <div style={{
                      marginTop: '8px', padding: '10px 14px', borderRadius: '9px',
                      backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`,
                      fontSize: '12px', color: C.greenPrimary, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <ArrowRight size={13} style={{ flexShrink: 0 }} />
                      Will create: &ldquo;{newRoleName.trim()} (Male)&rdquo; and &ldquo;{newRoleName.trim()} (Female)&rdquo;
                    </div>
                  )}
                </div>

                {/* Eligibility */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '4px' }}>Eligibility *</label>
                  <select value={newElig} onChange={e => setNewElig(e.target.value as 'school_wide' | 'house')}
                    style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
                    <option value="school_wide">School-wide (all students vote)</option>
                    <option value="house">House only (house members vote)</option>
                  </select>
                </div>

                {newElig === 'house' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '4px' }}>House *</label>
                    <select value={newHouse} onChange={e => setNewHouse(e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur} required>
                      <option value="">— Select house —</option>
                      {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                )}

                <button type="submit" disabled={adding} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', borderRadius: '9px', border: 'none',
                  backgroundColor: adding ? C.creamBorder : C.greenPrimary,
                  color: adding ? C.textMuted : '#fff',
                  fontSize: '13px', fontWeight: 700, cursor: adding ? 'not-allowed' : 'pointer',
                }}>
                  <Plus size={15} /> {adding ? 'Adding…' : 'Add Role (2 positions)'}
                </button>
              </form>
            )}

            {/* Positions grouped by role_group */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '64px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: C.textMuted, fontSize: '13px' }}>Loading positions…</p>
              </div>
            ) : positions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px', backgroundColor: C.white, borderRadius: '16px', border: `1px solid ${C.creamBorder}` }}>
                <ListPlus size={36} color={C.creamBorder} style={{ margin: '0 auto 14px' }} />
                <p style={{ fontWeight: 700, color: C.greenPrimary, marginBottom: '6px' }}>No positions yet</p>
                <p style={{ fontSize: '13px', color: C.textMuted }}>
                  {canAdd
                    ? 'Click "Add Role" above to create the first one.'
                    : 'No positions have been created for this election.'}
                </p>
              </div>
            ) : (
              roleGroups.map(group => (
                <div key={group} style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '15px', color: C.greenPrimary, marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${C.creamBorder}` }}>
                    {group}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {positions.filter(p => p.role_group === group).sort((a, b) => a.sort_order - b.sort_order).map(pos => (
                      <div key={pos.id} style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '14px 18px', borderRadius: '14px', backgroundColor: C.white,
                        border: `1px solid ${C.creamBorder}`,
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#a3c4ae'; el.style.boxShadow = '0 2px 8px rgba(26,77,46,0.08)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = C.creamBorder; el.style.boxShadow = 'none'; }}
                      >
                        {/* Gender dot */}
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: pos.gender_scope === 'male' ? '#3b82f6' : pos.gender_scope === 'female' ? '#ec4899' : '#9ca3af',
                        }} aria-hidden="true" />

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{pos.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                              backgroundColor: C.creamCard, color: C.textMuted,
                              textTransform: 'capitalize',
                            }}>{pos.gender_scope}</span>
                            <span style={{
                              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                              backgroundColor: pos.eligibility_scope === 'house' ? '#fef3c7' : C.greenLight,
                              color: pos.eligibility_scope === 'house' ? '#92400e' : C.greenPrimary,
                            }}>
                              {pos.eligibility_scope === 'house' ? `House: ${pos.houses?.name ?? '—'}` : 'School-wide'}
                            </span>
                            <span style={{ fontSize: '11px', color: C.textMuted }}>Order: {pos.sort_order}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button
                              onClick={() => { setSaveMsg(''); setSaveErr(''); setEditing(pos); }}
                              aria-label={`Edit ${pos.title}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '7px 12px', borderRadius: '8px', border: 'none',
                                backgroundColor: C.greenLight, color: C.greenPrimary,
                                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                              }}>
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(pos)}
                              aria-label={`Delete ${pos.title}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '7px 12px', borderRadius: '8px', border: 'none',
                                backgroundColor: '#fef2f2', color: '#dc2626',
                                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                              }}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <EditModal
          position={editing}
          houses={houses}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
