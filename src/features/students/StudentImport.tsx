import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, CheckCircle, AlertTriangle, X, Download,
  Info, ChevronRight, Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/tokens';

// ── Types ─────────────────────────────────────────────────────
interface Department { id: string; name: string; code: string; }
interface ClassRow   { id: string; name: string; year_group: number; department_id: string; department_name: string; }

interface ParsedStudent {
  row:        number;
  full_name:  string;
  gender:     string;
  house_name: string;
  errors:     string[];
}

interface ImportResult {
  imported:    number;
  skipped:     number;
  errors:      string[];
  generated:   { name: string; id: string; class: string; house: string; gender: string }[];
  class_name?: string;
}

// ── CSV Parser ────────────────────────────────────────────────
// Required columns: full_name, gender, house_name
// class and year_group come from the selected class
function parseCSV(text: string): ParsedStudent[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0]
    .replace(/^\uFEFF/, '')
    .split(',')
    .map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const required = ['full_name', 'gender', 'house_name'];
  const missing  = required.filter(r => !headers.includes(r));
  if (missing.length > 0) {
    return [{
      row: 0, full_name: '', gender: '', house_name: '',
      errors: [`Missing columns: ${missing.join(', ')}. Download the template for the correct format.`],
    }];
  }

  const idx = (col: string) => headers.indexOf(col);

  return lines.slice(1).map((line, i) => {
    if (!line.trim()) return null;
    const cols     = line.split(',');
    const get      = (col: string) => (cols[idx(col)] ?? '').trim();
    const errors: string[] = [];

    const full_name  = get('full_name');
    const gender     = get('gender').toLowerCase();
    const house_name = get('house_name');

    if (!full_name || full_name.split(/\s+/).filter(Boolean).length < 2)
      errors.push('full_name must be at least two words');
    if (!['male', 'female', 'm', 'f'].includes(gender))
      errors.push('gender must be "male" or "female"');
    if (!house_name)
      errors.push('house_name is required');

    return {
      row: i + 2,
      full_name,
      gender: gender === 'm' ? 'male' : gender === 'f' ? 'female' : gender,
      house_name,
      errors,
    };
  }).filter(Boolean) as ParsedStudent[];
}

// ── YEAR_LABELS ───────────────────────────────────────────────
const YEAR_LABELS: Record<number, string> = { 1: 'Form 1', 2: 'Form 2', 3: 'Form 3' };

export default function StudentImport() {
  const fileRef   = useRef<HTMLInputElement>(null);

  // Reference data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes,     setClasses]     = useState<ClassRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Selection
  const [selectedDept,  setSelectedDept]  = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Import state
  const [dragging, setDragging]  = useState(false);
  const [fileName, setFileName]  = useState('');
  const [preview,  setPreview]   = useState<ParsedStudent[]>([]);
  const [loading,  setLoading]   = useState(false);
  const [result,   setResult]    = useState<ImportResult | null>(null);
  const [error,    setError]     = useState('');
  const [importYear, setImportYear] = useState(new Date().getFullYear().toString());

  // Load departments + classes on mount
  useEffect(() => {
    Promise.all([
      supabase.from('departments').select('id, name, code').order('name'),
      supabase.from('classes').select('id, name, year_group, department_id, departments(name)').order('year_group').order('name'),
    ]).then(([{ data: depts }, { data: cls }]) => {
      setDepartments((depts as Department[]) ?? []);
      setClasses(
        ((cls ?? []) as (ClassRow & { departments: { name: string } | null })[]).map(c => ({
          id: c.id,
          name: c.name,
          year_group: c.year_group,
          department_id: c.department_id,
          department_name: c.departments?.name ?? '',
        }))
      );
      setLoadingClasses(false);
    });
  }, []);

  const filteredClasses = selectedDept
    ? classes.filter(c => c.department_id === selectedDept)
    : classes;

  const selectedClassObj = classes.find(c => c.id === selectedClass) ?? null;

  const validRows   = preview.filter(r => r.errors.length === 0);
  const invalidRows = preview.filter(r => r.errors.length > 0);

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file. Save your Excel file as CSV first (File → Save As → CSV).');
      return;
    }
    setError(''); setResult(null); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => setPreview(parseCSV(e.target?.result as string));
    reader.readAsText(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  function downloadTemplate() {
    const className = selectedClassObj?.name ?? 'Class';
    const csv = [
      'full_name,gender,house_name',
      'Kwame Asante Mensah,male,Akuamoah',
      'Abena Owusu Boateng,female,Opaniman',
      'Yaw Darko Frimpong,male,Akroko',
      'Ama Serwaa Acheampong,female,Tokoli',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `kawsec_import_${className.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (validRows.length === 0 || !selectedClass) return;
    setLoading(true); setError(''); setResult(null);

    try {
      const year = Number(importYear) || new Date().getFullYear();

      const { data, error: rpcErr } = await supabase.rpc('bulk_import_students_by_class', {
        p_class_id: selectedClass,
        p_students: JSON.stringify(validRows.map(s => ({
          full_name:  s.full_name,
          gender:     s.gender,
          house_name: s.house_name,
        }))),
        p_year: year,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      setResult({
        imported:   data.imported  ?? 0,
        skipped:    data.skipped   ?? 0,
        errors:     (data.errors as { name: string; error: string }[])?.map(e => `${e.name}: ${e.error}`) ?? [],
        generated:  data.generated ?? [],
        class_name: data.class_name ?? selectedClassObj?.name,
      });
      setPreview([]); setFileName('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Styles ────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '9px',
    border: `1.5px solid ${C.creamBorder}`, fontSize: '13px',
    fontFamily: 'inherit', backgroundColor: C.creamBg, outline: 'none',
    cursor: 'pointer', transition: 'border-color 0.15s',
  };
  const focus = (e: React.FocusEvent<HTMLSelectElement | HTMLInputElement>) => {
    e.currentTarget.style.borderColor = C.greenPrimary;
  };
  const blur = (e: React.FocusEvent<HTMLSelectElement | HTMLInputElement>) => {
    e.currentTarget.style.borderColor = C.creamBorder;
  };

  const step1Done = !!selectedClass;
  const step2Done = step1Done && validRows.length > 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Import Students</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Class-by-class · IDs auto-generated per class</p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>

        {/* ── STEP 1: SELECT CLASS ─────────────────────────── */}
        <div style={{
          backgroundColor: C.white, borderRadius: '16px', padding: '24px',
          border: `1.5px solid ${step1Done ? C.greenPrimary : C.creamBorder}`,
          marginBottom: '20px', transition: 'border-color 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: step1Done ? C.greenPrimary : C.creamBorder,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '14px', fontWeight: 800,
            }}>1</div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>Select the Class</h2>
              <p style={{ fontSize: '12px', color: C.textMuted }}>Choose the class you are importing students for</p>
            </div>
            {step1Done && <CheckCircle size={18} color={C.greenPrimary} style={{ marginLeft: 'auto' }} />}
          </div>

          {loadingClasses ? (
            <p style={{ fontSize: '13px', color: C.textMuted }}>Loading classes…</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Department filter */}
              <div>
                <label htmlFor="dept-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' }}>
                  Filter by Department
                </label>
                <select
                  id="dept-filter"
                  value={selectedDept}
                  onChange={e => { setSelectedDept(e.target.value); setSelectedClass(''); }}
                  style={inputStyle} onFocus={focus} onBlur={blur}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Class selector */}
              <div>
                <label htmlFor="class-select" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.greenPrimary, marginBottom: '5px' }}>
                  Class <span style={{ color: C.errorRed }}>*</span>
                </label>
                <select
                  id="class-select"
                  value={selectedClass}
                  onChange={e => { setSelectedClass(e.target.value); setPreview([]); setFileName(''); setResult(null); setError(''); }}
                  style={inputStyle} onFocus={focus} onBlur={blur}
                >
                  <option value="">— Select a class —</option>
                  {[1, 2, 3].flatMap(yr =>
                    filteredClasses
                      .filter(c => c.year_group === yr)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {YEAR_LABELS[yr]} · {c.name} ({c.department_name})
                        </option>
                      ))
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Class info card */}
          {selectedClassObj && (
            <div style={{
              marginTop: '14px', padding: '12px 16px', borderRadius: '10px',
              backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`,
              display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            }}>
              <Users size={18} color={C.greenPrimary} />
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px', color: C.greenPrimary }}>{selectedClassObj.name}</p>
                <p style={{ fontSize: '12px', color: C.textMuted }}>{selectedClassObj.department_name} · {YEAR_LABELS[selectedClassObj.year_group]}</p>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: C.textMuted, marginBottom: '2px' }}>IDs will be generated as:</p>
                <code style={{
                  fontSize: '12px', fontWeight: 700, color: C.greenPrimary,
                  backgroundColor: C.white, padding: '3px 8px', borderRadius: '6px',
                }}>
                  KAWSEC-{selectedClassObj.department_name.split(' ')[0].toUpperCase().slice(0,3)}{selectedClassObj.name.match(/\d+[A-Z]?$/)?.[0] ?? ''}-{importYear}-0001
                </code>
              </div>
            </div>
          )}
        </div>

        {/* ── STEP 2: UPLOAD CSV ───────────────────────────── */}
        <div style={{
          backgroundColor: step1Done ? C.white : C.creamCard, borderRadius: '16px', padding: '24px',
          border: `1.5px solid ${step2Done ? C.greenPrimary : C.creamBorder}`,
          marginBottom: '20px', transition: 'all 0.2s',
          opacity: step1Done ? 1 : 0.5, pointerEvents: step1Done ? 'auto' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: step2Done ? C.greenPrimary : step1Done ? C.creamBorder : '#e0e0e0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '14px', fontWeight: 800,
            }}>2</div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>Upload Student List</h2>
              <p style={{ fontSize: '12px', color: C.textMuted }}>CSV with full_name, gender, house_name only</p>
            </div>
            {step2Done && <CheckCircle size={18} color={C.greenPrimary} style={{ marginLeft: 'auto' }} />}
          </div>

          {/* Info banner */}
          <div style={{ backgroundColor: C.creamCard, borderRadius: '12px', padding: '14px 18px', marginBottom: '18px', display: 'flex', gap: '10px' }}>
            <Info size={16} color={C.greenPrimary} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.7 }}>
              <strong style={{ color: C.greenPrimary }}>No Student ID or Class column needed</strong> — the system generates IDs automatically
              based on the class you selected. Just provide name, gender, and house per student.
            </div>
          </div>

          {/* Template + Year */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={downloadTemplate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '9px 16px', borderRadius: '9px',
                border: `1.5px solid ${C.creamBorder}`, background: C.white,
                color: C.greenPrimary, fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Download size={14} /> Download CSV Template
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="import-year" style={{ fontSize: '13px', fontWeight: 600, color: C.greenPrimary }}>Academic Year:</label>
              <input
                id="import-year"
                type="number" value={importYear}
                onChange={e => setImportYear(e.target.value)}
                min={2020} max={2099}
                style={{ width: '90px', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', textAlign: 'center', outline: 'none' }}
                onFocus={focus} onBlur={blur}
              />
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            aria-label="Click or press Enter to open file picker and upload a CSV of students"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            style={{
              border: `2px dashed ${dragging ? C.greenPrimary : C.creamBorder}`,
              borderRadius: '14px', padding: '36px 24px', textAlign: 'center',
              backgroundColor: dragging ? C.greenLight : C.creamBg,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Upload size={32} color={dragging ? C.greenPrimary : C.creamBorder} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, fontSize: '14px', color: C.greenPrimary, marginBottom: '5px' }}>
              {fileName ? fileName : 'Drop your CSV here, or click to browse'}
            </p>
            <p style={{ fontSize: '12px', color: C.textMuted }}>CSV files only · Supports up to 2,500 students</p>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          </div>
        </div>

        {/* ── STEP 3: PREVIEW & IMPORT ─────────────────────── */}
        {preview.length > 0 && (
          <div style={{
            backgroundColor: C.white, borderRadius: '16px', padding: '24px',
            border: `1.5px solid ${C.creamBorder}`, marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: C.greenPrimary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '14px', fontWeight: 800,
              }}>3</div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>Preview & Import</h2>
                <p style={{ fontSize: '12px', color: C.textMuted }}>
                  {validRows.length} valid · {invalidRows.length} errors · Importing into <strong>{selectedClassObj?.name}</strong>
                </p>
              </div>
              <button onClick={() => { setPreview([]); setFileName(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                <X size={14} /> Clear
              </button>
            </div>

            {/* Error list */}
            {invalidRows.length > 0 && (
              <div role="alert" style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '16px' }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: '#dc2626', marginBottom: '8px' }}>Fix these errors before importing:</p>
                {invalidRows.map(r => (
                  <div key={r.row} style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>
                    <strong>Row {r.row} ({r.full_name || 'no name'}):</strong> {r.errors.join(' · ')}
                  </div>
                ))}
              </div>
            )}

            {/* Preview table */}
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${C.creamBorder}`, marginBottom: '18px' }}>
              <table aria-label="Student import preview" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: C.creamCard }}>
                    {['Row', 'Full Name', 'Gender', 'House', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: C.textMuted, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.creamBorder}`, fontSize: '12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 100).map(r => (
                    <tr key={r.row} style={{ backgroundColor: r.errors.length > 0 ? '#fff5f5' : C.white, borderBottom: `1px solid ${C.creamBorder}` }}>
                      <td style={{ padding: '8px 14px', color: C.textMuted, fontSize: '12px' }}>{r.row}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 500 }}>{r.full_name}</td>
                      <td style={{ padding: '8px 14px', textTransform: 'capitalize', color: r.gender === 'male' ? '#3b82f6' : r.gender === 'female' ? '#ec4899' : C.textMuted }}>
                        {r.gender === 'male' ? '♂' : r.gender === 'female' ? '♀' : ''} {r.gender}
                      </td>
                      <td style={{ padding: '8px 14px' }}>{r.house_name}</td>
                      <td style={{ padding: '8px 14px' }}>
                        {r.errors.length === 0
                          ? <span style={{ color: C.greenPrimary, fontWeight: 700, fontSize: '12px' }}>✓ OK</span>
                          : <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '12px' }} title={r.errors.join(', ')}>✗ Error</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 100 && (
                <p style={{ padding: '10px 14px', fontSize: '12px', color: C.textMuted, borderTop: `1px solid ${C.creamBorder}` }}>
                  Showing first 100 of {preview.length} rows. Errors in all rows are listed above.
                </p>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div role="alert" style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '14px' }}>
                <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
              </div>
            )}

            {/* One-time download warning */}
            <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <AlertTriangle size={15} color="#b45309" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.6 }}>
                <strong>Download the ID list immediately after importing.</strong> The generated student IDs are shown only once. Make sure to save them before navigating away.
              </p>
            </div>

            <button
              onClick={handleImport}
              disabled={loading || validRows.length === 0}
              aria-busy={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px', borderRadius: '10px', border: 'none',
                backgroundColor: (loading || validRows.length === 0) ? C.creamBorder : C.greenPrimary,
                color: (loading || validRows.length === 0) ? C.textMuted : '#fff',
                fontSize: '14px', fontWeight: 700,
                cursor: (loading || validRows.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading
                ? <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} aria-hidden="true" /> Importing…</>
                : <><ChevronRight size={16} /> Import {validRows.length} Student{validRows.length !== 1 ? 's' : ''} into {selectedClassObj?.name}</>
              }
            </button>
            {validRows.length === 0 && (
              <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '8px' }}>Fix all errors before importing.</p>
            )}
          </div>
        )}

        {/* ── IMPORT RESULT ────────────────────────────────── */}
        {result && (
          <div style={{ padding: '22px', borderRadius: '16px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <CheckCircle size={22} color={C.greenPrimary} />
              <strong style={{ color: C.greenPrimary, fontSize: '16px' }}>
                Import Complete — {result.class_name}
              </strong>
            </div>
            <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '12px' }}>
              <strong style={{ color: C.greenPrimary }}>{result.imported}</strong> students imported ·{' '}
              <strong>{result.skipped}</strong> skipped
            </p>

            {result.errors.length > 0 && (
              <ul style={{ marginBottom: '14px', paddingLeft: '16px', fontSize: '12px', color: '#dc2626' }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}

            {result.generated.length > 0 && (
              <>
                <p style={{ fontSize: '12px', fontWeight: 700, color: C.greenPrimary, marginBottom: '8px' }}>
                  Generated Student IDs — give these to the class teacher:
                </p>
                <div style={{ maxHeight: '240px', overflowY: 'auto', borderRadius: '10px', border: `1px solid ${C.creamBorder}`, backgroundColor: C.white, marginBottom: '12px' }}>
                  <table aria-label="Generated student IDs" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: C.creamCard }}>
                        {['Name', 'Gender', 'House', 'Student ID'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 700, borderBottom: `1px solid ${C.creamBorder}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.generated.map((s, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${C.creamBorder}` }}>
                          <td style={{ padding: '7px 12px', fontWeight: 500 }}>{s.name}</td>
                          <td style={{ padding: '7px 12px', textTransform: 'capitalize', color: s.gender === 'male' ? '#3b82f6' : '#ec4899' }}>
                            {s.gender === 'male' ? '♂' : '♀'} {s.gender}
                          </td>
                          <td style={{ padding: '7px 12px', color: C.textMuted }}>{s.house}</td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 800, color: C.greenPrimary }}>{s.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => {
                    const csv = 'Class,Name,Gender,House,Student ID\n' +
                      result.generated.map(s =>
                        `${result.class_name ?? ''},${s.name},${s.gender},${s.house},${s.id}`
                      ).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href = url;
                    a.download = `student_ids_${(result.class_name ?? 'class').replace(/\s+/g, '_')}_${importYear}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '9px 18px', borderRadius: '9px', border: 'none',
                    backgroundColor: C.greenPrimary, color: '#fff',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Download size={14} /> Download ID List for {result.class_name}
                </button>
              </>
            )}
          </div>
        )}
      </main>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes spin { to { transform: rotate(360deg); } }
        }
      `}</style>
    </div>
  );
}
