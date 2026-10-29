import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Edit2, X, Check, AlertTriangle,
  ChevronLeft, ChevronRight, UserX, UserCheck, RefreshCw, Printer, UserPlus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/tokens';
import AddStudentModal from './AddStudentModal';

const PAGE_SIZE = 30;

/* ── Types ─────────────────────────────────────────────────── */
interface Department { id: string; name: string; code: string; }
interface ClassRow   { id: string; name: string; year_group: number; department_id: string; }
interface HouseRow   { id: string; name: string; code: string; }

interface Student {
  id:                 string;
  student_id_number:  string;
  full_name:          string;
  gender:             'male' | 'female';
  year_group:         number;
  is_active:          boolean;
  class_id:           string;
  house_id:           string | null;
  classes:            { name: string } | null;
  houses:             { name: string } | null;
}

interface EditState {
  full_name:  string;
  gender:     'male' | 'female';
  class_id:   string;
  house_id:   string;
  year_group: number;
  is_active:  boolean;
}

/* ── Edit modal ─────────────────────────────────────────────── */
function EditModal({
  student, classes, houses, onSave, onClose,
}: {
  student: Student;
  classes: ClassRow[];
  houses:  HouseRow[];
  onSave:  (id: string, data: EditState) => Promise<string | null>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditState>({
    full_name:  student.full_name,
    gender:     student.gender,
    class_id:   student.class_id,
    house_id:   student.house_id ?? '',
    year_group: student.year_group,
    is_active:  student.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // SM-1: focus trap — focus first element on open and keep Tab within the modal
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const focusable = node.querySelectorAll<HTMLElement>('input, select, textarea, button:not([disabled])');
    focusable[0]?.focus();
  }, []);
  function handleTrap(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const node = dialogRef.current;
    if (!node) return;
    const focusable = Array.from(node.querySelectorAll<HTMLElement>('input, select, textarea, button:not([disabled])'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // Group classes by year group for the select
  const classOptions = classes
    .slice()
    .sort((a, b) => a.year_group - b.year_group || a.name.localeCompare(b.name));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || form.full_name.trim().split(/\s+/).length < 2) {
      setError('Full name must be at least two words.'); return;
    }
    setSaving(true); setError('');
    const err = await onSave(student.id, {
      ...form,
      full_name: form.full_name.trim(),
      house_id:  form.house_id || null,
    } as EditState);
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
    /* Backdrop */
    <div
      role="dialog" aria-modal="true" aria-labelledby="edit-modal-title"
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
        width: '100%', maxWidth: '500px',
        boxShadow: '0 24px 64px rgba(15,45,26,0.35)',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{ padding: '20px 24px', backgroundColor: C.greenPrimary, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 id="edit-modal-title" style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Edit Student</h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>
              {student.student_id_number}
            </p>
          </div>
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

          {/* Full name */}
          <div>
            <label htmlFor="edit-name" style={labelStyle}>Full Name *</label>
            <input id="edit-name" type="text" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              style={inputStyle} onFocus={focus} onBlur={blur} required />
          </div>

          {/* Gender + Year group side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="edit-gender" style={labelStyle}>Gender *</label>
              <select id="edit-gender" value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value as 'male' | 'female' }))}
                style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-year" style={labelStyle}>Year Group *</label>
              <select id="edit-year" value={form.year_group}
                onChange={e => setForm(f => ({ ...f, year_group: Number(e.target.value) }))}
                style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
                <option value={1}>Form 1</option>
                <option value={2}>Form 2</option>
                <option value={3}>Form 3</option>
              </select>
            </div>
          </div>

          {/* Class */}
          <div>
            <label htmlFor="edit-class" style={labelStyle}>Class *</label>
            <select id="edit-class" value={form.class_id}
              onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur} required>
              <option value="">— Select class —</option>
              {classOptions.map(c => (
                <option key={c.id} value={c.id}>
                  Form {c.year_group} · {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* House */}
          <div>
            <label htmlFor="edit-house" style={labelStyle}>House</label>
            <select id="edit-house" value={form.house_id}
              onChange={e => setForm(f => ({ ...f, house_id: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
              <option value="">— No house assigned —</option>
              {houses.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          {/* Active status */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: '10px',
            backgroundColor: form.is_active ? C.greenLight : '#fef2f2',
            border: `1px solid ${form.is_active ? C.greenPrimary + '30' : '#fecaca'}`,
          }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: form.is_active ? C.greenPrimary : '#dc2626' }}>
                {form.is_active ? 'Active — can vote' : 'Inactive — cannot vote'}
              </p>
              <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>
                Inactive students cannot authenticate or cast a ballot.
              </p>
            </div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                backgroundColor: form.is_active ? '#dc2626' : C.greenPrimary,
                color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>
              {form.is_active ? 'Deactivate' : 'Activate'}
            </button>
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
              {saving
                ? <><span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Saving…</>
                : <><Check size={15} />Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function StudentManagement() {
  const [students,    setStudents]    = useState<Student[]>([]);
  const [classes,     setClasses]     = useState<ClassRow[]>([]);
  const [houses,      setHouses]      = useState<HouseRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(0);

  // Filters
  const [search,      setSearch]      = useState('');
  const [filterDept,  setFilterDept]  = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterYear,  setFilterYear]  = useState('');
  const [filterActive,setFilterActive]= useState('all');

  // Edit
  const [editing,  setEditing]  = useState<Student | null>(null);
  const [saveMsg,  setSaveMsg]  = useState('');
  const [saveErr,  setSaveErr]  = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);

  // SM-2: auto-clear the deactivation confirmation after a short delay
  useEffect(() => {
    if (!confirmId) return;
    const t = setTimeout(() => setConfirmId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmId]);

  // Load reference data once
  useEffect(() => {
    Promise.all([
      supabase.from('classes').select('id, name, year_group, department_id').order('year_group').order('name'),
      supabase.from('houses').select('id, name, code').order('name'),
      supabase.from('departments').select('id, name, code').order('name'),
    ]).then(([{ data: cls }, { data: hs }, { data: depts }]) => {
      setClasses((cls as ClassRow[]) ?? []);
      setHouses((hs as HouseRow[]) ?? []);
      setDepartments((depts as Department[]) ?? []);
    });
  }, []);

  const loadStudents = useCallback(async (pg = 0) => {
    setLoading(true); setSaveMsg(''); setSaveErr('');

    let query = supabase
      .from('students')
      .select('id, student_id_number, full_name, gender, year_group, is_active, class_id, house_id, classes(name), houses(name)', { count: 'exact' })
      .order('full_name');

    // Filters
    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search.trim()}%,student_id_number.ilike.%${search.trim()}%`);
    }
    if (filterYear)   query = query.eq('year_group', Number(filterYear));
    if (filterActive === 'active')   query = query.eq('is_active', true);
    if (filterActive === 'inactive') query = query.eq('is_active', false);

    // Class / Department filter
    if (filterClass) {
      // Specific class selected — use direct eq filter
      query = query.eq('class_id', filterClass);
    } else if (filterDept) {
      // Department selected but no specific class — resolve to class IDs
      const deptClassIds = classes
        .filter(c => c.department_id === filterDept)
        .map(c => c.id);
      if (deptClassIds.length > 0) query = query.in('class_id', deptClassIds);
      else { setStudents([]); setTotal(0); setLoading(false); return; }
    }

    query = query.range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (!error) {
      setStudents((data as Student[]) ?? []);
      setTotal(count ?? 0);
      setPage(pg);
    }
    setLoading(false);
  }, [search, filterDept, filterClass, filterYear, filterActive, classes]);

  // Reload when filters change (debounced for search)
  useEffect(() => {
    const t = setTimeout(() => loadStudents(0), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadStudents]);

  async function handleSave(id: string, data: EditState): Promise<string | null> {
    const { error } = await supabase
      .from('students')
      .update({
        full_name:  data.full_name,
        gender:     data.gender,
        class_id:   data.class_id,
        house_id:   data.house_id || null,
        year_group: data.year_group,
        is_active:  data.is_active,
      })
      .eq('id', id);

    if (error) return error.message;
    setSaveMsg(`${data.full_name} updated successfully.`);
    await loadStudents(page);
    return null;
  }

  async function toggleActive(student: Student) {
    const { error } = await supabase
      .from('students')
      .update({ is_active: !student.is_active })
      .eq('id', student.id);
    if (error) { setSaveErr(error.message); return; }
    setSaveMsg(`${student.full_name} ${student.is_active ? 'deactivated' : 'activated'}.`);
    await loadStudents(page);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start      = page * PAGE_SIZE + 1;
  const end        = Math.min((page + 1) * PAGE_SIZE, total);

  // ── Print class register ────────────────────────────────────
  // Fetches ALL students for the selected class (not just current page)
  // and opens a print dialog with a clean register sheet.
  async function handlePrintRegister() {
    if (!filterClass) return;

    // Fetch all students in this class (no pagination limit)
    const { data } = await supabase
      .from('students')
      .select('student_id_number, full_name, gender, houses(name), is_active')
      .eq('class_id', filterClass)
      .order('full_name');

    if (!data || data.length === 0) return;

    const className = classes.find(c => c.id === filterClass)?.name ?? 'Class';
    const deptName  = departments.find(d => d.id === filterDept)?.name ?? '';

    const rows = (data as { student_id_number: string; full_name: string; gender: string; houses: { name: string } | null; is_active: boolean }[]);

    const tableRows = rows.map((s, i) => `
      <tr style="border-bottom:1px solid #e8e0cc;">
        <td style="padding:8px 12px;text-align:center;color:#5a5a4a;font-size:13px;">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:600;font-size:13px;">${s.full_name}</td>
        <td style="padding:8px 12px;text-transform:capitalize;font-size:13px;">${s.gender}</td>
        <td style="padding:8px 12px;font-size:13px;">${(s.houses as { name: string } | null)?.name ?? '—'}</td>
        <td style="padding:8px 12px;font-family:monospace;font-weight:700;font-size:13px;color:#1a4d2e;">${s.student_id_number}</td>
        <td style="padding:8px 12px;text-align:center;font-size:12px;">
          <span style="display:inline-block;width:80px;border:1px solid #ccc;border-radius:4px;">&nbsp;</span>
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Class Register — ${className}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 28px; }
          .header { display: flex; align-items: center; gap: 18px; margin-bottom: 20px; border-bottom: 3px solid #1a4d2e; padding-bottom: 16px; }
          .header img { width: 60px; height: 60px; object-fit: contain; }
          .header-text h1 { font-size: 20px; font-weight: 800; color: #1a4d2e; }
          .header-text p  { font-size: 13px; color: #5a5a4a; margin-top: 3px; }
          .meta { display: flex; gap: 32px; margin-bottom: 18px; font-size: 13px; color: #5a5a4a; }
          .meta strong { color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; }
          thead tr { background: #e8f5ee; }
          th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #1a4d2e; text-transform: uppercase; letter-spacing: 0.5px; }
          tbody tr:nth-child(even) { background: #fffdf7; }
          .footer { margin-top: 24px; border-top: 1px solid #e8e0cc; padding-top: 12px; font-size: 11px; color: #9a9a8a; text-align: center; }
          @media print {
            body { padding: 16px; }
            @page { margin: 1.5cm; size: A4 portrait; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/logo.png" alt="KAWSEC" />
          <div class="header-text">
            <h1>Nkawkaw Senior High School (KAWSEC)</h1>
            <p>Prefectorial Election — Student Voting Register</p>
          </div>
        </div>
        <div class="meta">
          <div><strong>Class:</strong> ${className}</div>
          ${deptName ? `<div><strong>Department:</strong> ${deptName}</div>` : ''}
          <div><strong>Total Students:</strong> ${rows.length}</div>
          <div><strong>Date Printed:</strong> ${new Date().toLocaleDateString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Full Name</th>
              <th style="width:80px;">Gender</th>
              <th style="width:110px;">House</th>
              <th style="width:190px;">Student ID (for voting)</th>
              <th style="width:100px;">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          Student IDs are used to log in to the KAWSEC Voting System. Keep this sheet confidential.
          Printed by KAWSEC IT Department · ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px', borderRadius: '8px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.white, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Student Management</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>
                View, edit and manage the student register
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => loadStudents(page)} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

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

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search — SM-6: accessible label */}
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} color={C.textMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or student ID…"
              aria-label="Search students by name or student ID"
              style={{ ...inputStyle, width: '100%', paddingLeft: '32px' }}
              onFocus={e => { e.currentTarget.style.borderColor = C.greenPrimary; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.creamBorder; }}
            />
          </div>

          {/* Department filter */}
          <select aria-label="Filter by department" value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterClass(''); }} style={{ ...inputStyle, minWidth: '160px', cursor: 'pointer' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          {/* Class filter */}
          <select aria-label="Filter by class" value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ ...inputStyle, minWidth: '150px', cursor: 'pointer' }}>
            <option value="">All Classes</option>
            {(filterDept
              ? classes.filter(c => c.department_id === filterDept)
              : classes
            ).slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Year group filter */}
          <select aria-label="Filter by year group" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ ...inputStyle, minWidth: '120px', cursor: 'pointer' }}>
            <option value="">All Forms</option>
            <option value="1">Form 1</option>
            <option value="2">Form 2</option>
            <option value="3">Form 3</option>
          </select>

          {/* Active filter */}
          <select aria-label="Filter by active status" value={filterActive} onChange={e => setFilterActive(e.target.value)} style={{ ...inputStyle, minWidth: '130px', cursor: 'pointer' }}>
            <option value="all">All Students</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '13px', color: C.textMuted }}>
            {loading ? 'Loading…' : `Showing ${total === 0 ? 0 : start}–${end} of ${total.toLocaleString()} student${total !== 1 ? 's' : ''}`}
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {filterClass && (
              <button
                onClick={handlePrintRegister}
                title="Print class register with student IDs"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', border: 'none',
                  backgroundColor: C.greenPrimary, color: '#fff',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Printer size={13} /> Print Class Register
              </button>
            )}
            <Link to="/admin/students/import" style={{ fontSize: '13px', fontWeight: 600, color: C.greenPrimary, textDecoration: 'none' }}>
              + Import More Students
            </Link>
            <button
              onClick={() => setShowAddStudent(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: C.greenPrimary, color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              <UserPlus size={13} /> Add Student
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${C.creamBorder}`, borderTopColor: C.greenPrimary, margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: C.textMuted, fontSize: '14px' }}>Loading students…</p>
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', backgroundColor: C.white, borderRadius: '16px', border: `1px solid ${C.creamBorder}` }}>
            <p style={{ fontWeight: 700, color: C.greenPrimary, marginBottom: '8px' }}>No students found</p>
            <p style={{ fontSize: '13px', color: C.textMuted }}>
              {search || filterDept || filterClass || filterYear || filterActive !== 'all'
                ? 'Try clearing the filters above.'
                : 'Import students using the Import Students page.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '14px', border: `1px solid ${C.creamBorder}` }}>
            <table aria-label="Student register" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: C.creamCard }}>
                  {['Student ID', 'Full Name', 'Gender', 'Class', 'House', 'Form', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: C.textMuted, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.creamBorder}`, fontSize: '12px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}
                    style={{ borderBottom: `1px solid ${C.creamBorder}`, backgroundColor: s.is_active ? C.white : '#fafafa' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = C.creamCard; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = s.is_active ? C.white : '#fafafa'; }}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: C.greenPrimary, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {s.student_id_number}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: s.is_active ? '#1a1a1a' : C.textMuted }}>
                      {s.full_name}
                    </td>
                    <td style={{ padding: '10px 14px', textTransform: 'capitalize', color: C.textMuted }}>{s.gender}</td>
                    <td style={{ padding: '10px 14px', color: C.textMuted, whiteSpace: 'nowrap' }}>
                      {(s.classes as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.textMuted }}>
                      {(s.houses as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.textMuted, textAlign: 'center' }}>
                      {s.year_group}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px',
                        backgroundColor: s.is_active ? C.greenLight : '#fef2f2',
                        color: s.is_active ? C.greenPrimary : '#dc2626',
                      }}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {/* Edit */}
                        <button
                          onClick={() => { setSaveMsg(''); setSaveErr(''); setEditing(s); }}
                          aria-label={`Edit ${s.full_name}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '6px 10px', borderRadius: '7px', border: 'none',
                            backgroundColor: C.greenLight, color: C.greenPrimary,
                            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>

                        {/* Toggle active — SM-2: two-step inline confirm for deactivation */}
                        <button
                          onClick={() => {
                            if (s.is_active && confirmId !== s.id) { setConfirmId(s.id); return; }
                            setConfirmId(null);
                            toggleActive(s);
                          }}
                          aria-label={s.is_active ? (confirmId === s.id ? `Confirm deactivation of ${s.full_name}` : `Deactivate ${s.full_name}`) : `Activate ${s.full_name}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '6px 10px', borderRadius: '7px', border: 'none',
                            backgroundColor: s.is_active ? (confirmId === s.id ? '#dc2626' : '#fef2f2') : C.greenLight,
                            color: s.is_active ? (confirmId === s.id ? '#fff' : '#dc2626') : C.greenPrimary,
                            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {s.is_active
                            ? (confirmId === s.id ? <><UserX size={12} /> Confirm?</> : <><UserX size={12} /> Deactivate</>)
                            : <><UserCheck size={12} /> Activate</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
            <button onClick={() => loadStudents(page - 1)} disabled={page === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, background: 'none', color: page === 0 ? C.creamBorder : C.textMuted, fontSize: '13px', fontWeight: 600, cursor: page === 0 ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft size={15} /> Previous
            </button>
            <span style={{ fontSize: '13px', color: C.textMuted }}>Page {page + 1} of {totalPages}</span>
            <button onClick={() => loadStudents(page + 1)} disabled={page >= totalPages - 1}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, background: 'none', color: page >= totalPages - 1 ? C.creamBorder : C.textMuted, fontSize: '13px', fontWeight: 600, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        )}
      </main>

      {/* Add student modal */}
      {showAddStudent && (
        <AddStudentModal
          classes={classes}
          houses={houses}
          onSave={() => { setSaveMsg('Student added successfully.'); loadStudents(0); setShowAddStudent(false); }}
          onClose={() => setShowAddStudent(false)}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          student={editing}
          classes={classes}
          houses={houses}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
