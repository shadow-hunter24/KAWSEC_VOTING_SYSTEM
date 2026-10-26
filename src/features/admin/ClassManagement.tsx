import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/tokens';

interface Department { id: string; name: string; code: string; }
interface Class      { id: string; name: string; year_group: number; department_id: string; }

const YEAR_LABELS: Record<number, string> = { 1: 'Form 1', 2: 'Form 2', 3: 'Form 3' };

// ── Single department accordion ───────────────────────────────
function DepartmentSection({ dept }: { dept: Department }) {
  const [open,      setOpen]      = useState(false);
  const [classes,   setClasses]   = useState<Class[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [msg,       setMsg]       = useState('');
  const [err,       setErr]       = useState('');

  // New class form state
  const [newName,   setNewName]   = useState('');
  const [newYear,   setNewYear]   = useState<1 | 2 | 3>(3);

  async function loadClasses() {
    setLoading(true);
    const { data } = await supabase
      .from('classes')
      .select('id, name, year_group, department_id')
      .eq('department_id', dept.id)
      .order('year_group')
      .order('name');
    setClasses((data as Class[]) ?? []);
    setLoading(false);
  }

  function toggle() {
    if (!open) loadClasses();
    setOpen(v => !v);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { setErr('Class name is required.'); return; }
    setAdding(true); setErr(''); setMsg('');

    const { error } = await supabase.from('classes').insert({
      department_id: dept.id,
      name:          newName.trim(),
      year_group:    newYear,
    });

    if (error) {
      if (error.code === '23505') setErr(`"${newName.trim()}" already exists in this department.`);
      else setErr(error.message);
    } else {
      setMsg(`Class "${newName.trim()}" added.`);
      setNewName('');
      await loadClasses();
    }
    setAdding(false);
  }

  async function handleDelete(cls: Class) {
    if (!window.confirm(`Delete "${cls.name}"? This will fail if students are assigned to it.`)) return;
    setDeleting(cls.id); setErr(''); setMsg('');

    const { error } = await supabase.from('classes').delete().eq('id', cls.id);
    if (error) {
      if (error.code === '23503') setErr(`Cannot delete "${cls.name}" — students are assigned to it. Remove those students first.`);
      else setErr(error.message);
    } else {
      setMsg(`"${cls.name}" deleted.`);
      await loadClasses();
    }
    setDeleting(null);
  }

  // Group classes by year group
  const byYear: Record<number, Class[]> = { 1: [], 2: [], 3: [] };
  classes.forEach(c => { byYear[c.year_group]?.push(c); });

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px', borderRadius: '8px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ border: `1px solid ${C.creamBorder}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '10px' }}>

      {/* Department header — click to expand */}
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          backgroundColor: open ? C.creamCard : C.white, textAlign: 'left',
        }}
        aria-expanded={open}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: C.greenPrimary }}>{dept.code}</span>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>{dept.name}</p>
            <p style={{ fontSize: '12px', color: C.textMuted }}>
              {open ? `${classes.length} class${classes.length !== 1 ? 'es' : ''}` : 'Click to manage classes'}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={18} color={C.textMuted} /> : <ChevronDown size={18} color={C.textMuted} />}
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.creamBorder}`, padding: '20px' }}>

          {/* Feedback */}
          {msg && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '16px' }}>
              <CheckCircle size={15} color={C.greenPrimary} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: C.greenPrimary, fontWeight: 600 }}>{msg}</p>
            </div>
          )}
          {err && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '16px' }}>
              <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: '#dc2626' }}>{err}</p>
            </div>
          )}

          {/* Add class form */}
          <form onSubmit={handleAdd} style={{
            display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap',
            padding: '16px', borderRadius: '12px', backgroundColor: C.creamCard,
            border: `1px solid ${C.creamBorder}`, marginBottom: '20px',
          }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' }}>
                Class Name *
              </label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={`e.g. ${dept.name} 3A`}
                style={{ ...inputStyle, width: '100%' }}
                onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
                disabled={adding}
              />
            </div>

            <div style={{ flex: '0 0 120px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' }}>
                Year Group *
              </label>
              <select
                value={newYear}
                onChange={e => setNewYear(Number(e.target.value) as 1 | 2 | 3)}
                style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                disabled={adding}
              >
                <option value={1}>Form 1</option>
                <option value={2}>Form 2</option>
                <option value={3}>Form 3</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={adding}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', borderRadius: '8px', border: 'none',
                backgroundColor: adding ? C.creamBorder : C.greenPrimary,
                color: adding ? C.textMuted : '#fff',
                fontSize: '13px', fontWeight: 700, cursor: adding ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              <Plus size={15} />{adding ? 'Adding…' : 'Add Class'}
            </button>
          </form>

          {/* Classes list grouped by year */}
          {loading ? (
            <p style={{ fontSize: '13px', color: C.textMuted, textAlign: 'center', padding: '20px' }}>Loading classes…</p>
          ) : classes.length === 0 ? (
            <p style={{ fontSize: '13px', color: C.textMuted, textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>
              No classes yet. Add the first one above.
            </p>
          ) : (
            [1, 2, 3].map(yr => byYear[yr].length === 0 ? null : (
              <div key={yr} style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.textMuted, marginBottom: '8px' }}>
                  {YEAR_LABELS[yr]}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {byYear[yr].map(cls => (
                    <div key={cls.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: '10px',
                      backgroundColor: C.white, border: `1px solid ${C.creamBorder}`,
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{cls.name}</span>
                      <button
                        onClick={() => handleDelete(cls)}
                        disabled={deleting === cls.id}
                        aria-label={`Delete ${cls.name}`}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px', borderRadius: '6px', color: '#dc262660',
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#dc262660'; }}
                      >
                        {deleting === cls.id
                          ? <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #dc262640', borderTopColor: '#dc2626', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ClassManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    supabase.from('departments').select('id, name, code').order('name')
      .then(({ data }) => {
        setDepartments((data as Department[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Class Management</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>
                Add classes for each department and year group
              </p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 24px' }}>

        {/* Instructions */}
        <div style={{
          padding: '16px 20px', borderRadius: '12px', marginBottom: '28px',
          backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`,
        }}>
          <p style={{ fontSize: '13px', color: C.greenPrimary, lineHeight: 1.65 }}>
            <strong>Before importing students</strong>, create all classes here first.
            Class names must match exactly what you put in the CSV — e.g. <code style={{ backgroundColor: C.white, padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>Science 3A</code>.
            Click any department below to expand it and add classes.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: C.textMuted, padding: '48px' }}>Loading departments…</p>
        ) : departments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <p style={{ color: C.textMuted, fontSize: '14px', marginBottom: '12px' }}>No departments found.</p>
            <p style={{ fontSize: '13px', color: C.textMuted }}>Run migration 0008 in Supabase SQL Editor first.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '20px' }}>
              {departments.length} departments · Click a department to add or remove classes.
            </p>
            {departments.map(dept => (
              <DepartmentSection key={dept.id} dept={dept} />
            ))}
          </>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
