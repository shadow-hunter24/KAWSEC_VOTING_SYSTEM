import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, CheckCircle, AlertTriangle, X, Download, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  greenPrimary: '#1a4d2e', greenDark: '#0f2d1a', greenLight: '#e8f5ee',
  greenMid: '#2d7a4f', creamBg: '#fffdf7', creamCard: '#f5f0e8',
  creamBorder: '#e8e0cc', textMuted: '#5a5a4a', white: '#ffffff',
};

/* ── Types ─────────────────────────────────────────────────── */
interface ParsedStudent {
  row:              number;
  student_id_number: string;
  full_name:        string;
  gender:           string;
  class_name:       string;
  house_name:       string;
  year_group:       string;
  errors:           string[];
}

interface ImportResult {
  imported: number;
  skipped:  number;
  errors:   string[];
}

/* ── CSV parser ────────────────────────────────────────────── */
function parseCSV(text: string): ParsedStudent[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Normalise header — lowercase, trim, strip BOM
  const headers = lines[0]
    .replace(/^\uFEFF/, '')
    .split(',')
    .map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const required = ['student_id_number', 'full_name', 'gender', 'class_name', 'house_name', 'year_group'];
  const missing  = required.filter(r => !headers.includes(r));
  if (missing.length > 0) {
    return [{
      row: 0, student_id_number: '', full_name: '', gender: '',
      class_name: '', house_name: '', year_group: '',
      errors: [`Missing columns: ${missing.join(', ')}. See the template for the correct format.`],
    }];
  }

  const idx = (col: string) => headers.indexOf(col);

  return lines.slice(1).map((line, i) => {
    // Handle quoted fields
    const cols   = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,))/g) ?? [];
    const get    = (col: string) => (cols[idx(col)] ?? '').replace(/^"|"$/g, '').trim();
    const errors: string[] = [];

    const student_id_number = get('student_id_number').toUpperCase();
    const full_name         = get('full_name');
    const gender            = get('gender').toLowerCase();
    const class_name        = get('class_name');
    const house_name        = get('house_name');
    const year_group        = get('year_group');

    if (!student_id_number) errors.push('student_id_number is required');
    if (!full_name || full_name.split(' ').filter(Boolean).length < 2)
      errors.push('full_name must be at least two words');
    if (!['male', 'female'].includes(gender))
      errors.push('gender must be "male" or "female"');
    if (!class_name) errors.push('class_name is required');
    if (!house_name) errors.push('house_name is required');
    const yg = Number(year_group);
    if (!year_group || isNaN(yg) || ![1, 2, 3].includes(yg))
      errors.push('year_group must be 1, 2, or 3');

    return { row: i + 2, student_id_number, full_name, gender, class_name, house_name, year_group, errors };
  }).filter(s => s.student_id_number || s.full_name); // skip blank rows
}

/* ── Component ─────────────────────────────────────────────── */
export default function StudentImport() {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [preview,  setPreview]    = useState<ParsedStudent[]>([]);
  const [loading,  setLoading]    = useState(false);
  const [result,   setResult]     = useState<ImportResult | null>(null);
  const [error,    setError]      = useState('');

  const validRows   = preview.filter(r => r.errors.length === 0);
  const invalidRows = preview.filter(r => r.errors.length > 0);

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file. Excel files should be saved as CSV first (File → Save As → CSV).');
      return;
    }
    setError(''); setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text    = e.target?.result as string;
      const parsed  = parseCSV(text);
      setPreview(parsed);
    };
    reader.readAsText(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  async function handleImport() {
    if (validRows.length === 0) return;
    setLoading(true); setError(''); setResult(null);

    try {
      // Fetch all classes and houses so we can resolve names → IDs
      const [{ data: classes }, { data: houses }] = await Promise.all([
        supabase.from('classes').select('id, name'),
        supabase.from('houses').select('id, name'),
      ]);

      const classMap = Object.fromEntries((classes ?? []).map(c => [c.name.toLowerCase(), c.id]));
      const houseMap = Object.fromEntries((houses  ?? []).map(h => [h.name.toLowerCase(), h.id]));

      const toInsert = [];
      const errors: string[] = [];
      let skipped = 0;

      for (const s of validRows) {
        const classId = classMap[s.class_name.toLowerCase()];
        const houseId = houseMap[s.house_name.toLowerCase()];

        if (!classId) {
          errors.push(`Row ${s.row}: class "${s.class_name}" not found in database. Add it via Settings first.`);
          skipped++; continue;
        }
        if (!houseId) {
          errors.push(`Row ${s.row}: house "${s.house_name}" not found in database.`);
          skipped++; continue;
        }

        toInsert.push({
          student_id_number: s.student_id_number,
          full_name:         s.full_name,
          gender:            s.gender,
          class_id:          classId,
          house_id:          houseId,
          year_group:        Number(s.year_group),
          is_active:         true,
        });
      }

      if (toInsert.length === 0) {
        setResult({ imported: 0, skipped, errors });
        return;
      }

      // Upsert — students with existing student_id_number are updated
      const { data: inserted, error: dbErr } = await supabase
        .from('students')
        .upsert(toInsert, { onConflict: 'student_id_number', ignoreDuplicates: false })
        .select('id');

      if (dbErr) throw new Error(dbErr.message);

      setResult({
        imported: inserted?.length ?? toInsert.length,
        skipped:  skipped + (validRows.length - toInsert.length),
        errors,
      });
      setPreview([]); setFileName('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const csv = [
      'student_id_number,full_name,gender,class_name,house_name,year_group',
      'KAWSEC/2024/001,Kwame Asante Mensah,male,Science 3A,Nkrumah,3',
      'KAWSEC/2024/002,Abena Owusu Boateng,female,Arts 3B,Aggrey,3',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = 'kawsec_students_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const btnStyle = (disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '11px 20px', borderRadius: '10px', border: 'none',
    backgroundColor: disabled ? C.creamBorder : C.greenPrimary,
    color: disabled ? C.textMuted : '#fff',
    fontSize: '14px', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>

      {/* Header */}
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Bulk Student Import</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Upload student register via CSV</p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Instructions */}
        <div style={{ backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, borderRadius: '14px', padding: '20px 24px', marginBottom: '28px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} /> How to Import Students
          </h2>
          <ol style={{ paddingLeft: '20px', fontSize: '13px', color: C.textMuted, lineHeight: 2 }}>
            <li>Download the CSV template below</li>
            <li>Fill in your student data (one student per row)</li>
            <li>Make sure class names and house names exactly match what's in the database</li>
            <li>Save as CSV and upload here</li>
            <li>Review the preview, then click Import</li>
          </ol>
          <button onClick={downloadTemplate} style={{ ...btnStyle(), marginTop: '14px', backgroundColor: C.white, color: C.greenPrimary, border: `1.5px solid ${C.creamBorder}` }}>
            <Download size={15} /> Download CSV Template
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.greenPrimary : C.creamBorder}`,
            borderRadius: '16px', padding: '48px 24px', textAlign: 'center',
            backgroundColor: dragging ? C.greenLight : C.white,
            cursor: 'pointer', transition: 'all 0.2s', marginBottom: '24px',
          }}
          role="button" aria-label="Upload CSV file"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
        >
          <Upload size={36} color={dragging ? C.greenPrimary : C.creamBorder} style={{ margin: '0 auto 14px' }} />
          <p style={{ fontWeight: 600, fontSize: '15px', color: C.greenPrimary, marginBottom: '6px' }}>
            {fileName ? fileName : 'Drop your CSV file here, or click to browse'}
          </p>
          <p style={{ fontSize: '13px', color: C.textMuted }}>CSV files only · Max 5,000 students per import</p>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>

        {/* Global error */}
        {error && (
          <div role="alert" style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '20px' }}>
            <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* Import result */}
        {result && (
          <div style={{ padding: '16px 20px', borderRadius: '12px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <CheckCircle size={20} color={C.greenPrimary} />
              <strong style={{ color: C.greenPrimary, fontSize: '15px' }}>Import Complete</strong>
            </div>
            <p style={{ fontSize: '13px', color: C.textMuted }}>
              <strong style={{ color: C.greenPrimary }}>{result.imported}</strong> students imported &nbsp;·&nbsp;
              <strong>{result.skipped}</strong> skipped
            </p>
            {result.errors.length > 0 && (
              <ul style={{ marginTop: '10px', paddingLeft: '16px', fontSize: '12px', color: '#dc2626' }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && (
          <div>
            {/* Summary bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <h2 style={{ fontWeight: 700, fontSize: '16px', color: C.greenPrimary }}>Preview — {preview.length} rows</h2>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: C.greenLight, color: C.greenPrimary }}>
                ✓ {validRows.length} valid
              </span>
              {invalidRows.length > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fef2f2', color: '#dc2626' }}>
                  ✗ {invalidRows.length} errors
                </span>
              )}
              <button onClick={() => { setPreview([]); setFileName(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                <X size={14} /> Clear
              </button>
            </div>

            {/* Errors summary */}
            {invalidRows.length > 0 && (
              <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '16px' }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: '#dc2626', marginBottom: '8px' }}>Fix these errors before importing:</p>
                {invalidRows.map(r => (
                  <div key={r.row} style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>
                    <strong>Row {r.row} ({r.student_id_number || 'no ID'}):</strong> {r.errors.join(' · ')}
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: '14px', border: `1px solid ${C.creamBorder}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: C.creamCard }}>
                    {['Row', 'Student ID', 'Full Name', 'Gender', 'Class', 'House', 'Year', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: C.textMuted, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.creamBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 100).map(r => (
                    <tr key={r.row} style={{ backgroundColor: r.errors.length > 0 ? '#fff5f5' : C.white, borderBottom: `1px solid ${C.creamBorder}` }}>
                      <td style={{ padding: '8px 14px', color: C.textMuted }}>{r.row}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '12px' }}>{r.student_id_number}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 500 }}>{r.full_name}</td>
                      <td style={{ padding: '8px 14px', textTransform: 'capitalize' }}>{r.gender}</td>
                      <td style={{ padding: '8px 14px' }}>{r.class_name}</td>
                      <td style={{ padding: '8px 14px' }}>{r.house_name}</td>
                      <td style={{ padding: '8px 14px' }}>{r.year_group}</td>
                      <td style={{ padding: '8px 14px' }}>
                        {r.errors.length === 0
                          ? <span style={{ color: C.greenPrimary, fontWeight: 700, fontSize: '12px' }}>✓ OK</span>
                          : <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>✗ Error</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 100 && (
                <p style={{ padding: '12px 16px', fontSize: '12px', color: C.textMuted, borderTop: `1px solid ${C.creamBorder}` }}>
                  Showing first 100 rows of {preview.length}. All valid rows will be imported.
                </p>
              )}
            </div>

            {/* Import button */}
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={handleImport}
                disabled={loading || validRows.length === 0}
                style={btnStyle(loading || validRows.length === 0)}
              >
                {loading ? 'Importing…' : `Import ${validRows.length} Valid Student${validRows.length !== 1 ? 's' : ''}`}
              </button>
              {validRows.length === 0 && (
                <span style={{ fontSize: '13px', color: '#dc2626' }}>Fix all errors before importing.</span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
