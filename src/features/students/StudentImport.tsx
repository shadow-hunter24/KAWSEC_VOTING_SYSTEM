import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, CheckCircle, AlertTriangle, X, Download, Users, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/tokens';

// ── Departments at KAWSEC ─────────────────────────────────────
const DEPT_CODES: Record<string, string> = {
  'science':         'SCI',
  'general arts':    'ART',
  'general art':     'ART',
  'business':        'BIZ',
  'home economics':  'HEC',
  'visual arts':     'VIS',
  'visual art':      'VIS',
  'agric science':   'AGR',
  'agriculture':     'AGR',
  'agric':           'AGR',
};

interface ParsedStudent {
  row:        number;
  full_name:  string;
  gender:     string;
  class_name: string;
  house_name: string;
  year_group: string;
  department: string;  // resolved from class_name
  errors:     string[];
}

interface ImportResult {
  imported:  number;
  skipped:   number;
  errors:    string[];
  generated: { name: string; id: string; class: string }[];
}

// ── CSV Parser ────────────────────────────────────────────────
// Required columns: full_name, gender, class_name, house_name, year_group
// NO student_id_number needed — system generates it automatically
function parseCSV(text: string): ParsedStudent[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0]
    .replace(/^\uFEFF/, '')
    .split(',')
    .map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const required = ['full_name', 'gender', 'class_name', 'house_name', 'year_group'];
  const missing  = required.filter(r => !headers.includes(r));
  if (missing.length > 0) {
    return [{
      row: 0, full_name: '', gender: '', class_name: '',
      house_name: '', year_group: '', department: '',
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
    const class_name = get('class_name');
    const house_name = get('house_name');
    const year_group = get('year_group');

    // Try to resolve department from class name
    const classLower = class_name.toLowerCase();
    let department = '';
    for (const [key, code] of Object.entries(DEPT_CODES)) {
      if (classLower.includes(key)) { department = code; break; }
    }

    if (!full_name || full_name.split(/\s+/).filter(Boolean).length < 2)
      errors.push('full_name must be at least two words');
    if (!['male', 'female', 'm', 'f'].includes(gender))
      errors.push('gender must be "male" or "female"');
    if (!class_name)
      errors.push('class_name is required (e.g. "Science 3A")');
    if (!house_name)
      errors.push('house_name is required (e.g. "Akuamoah")');
    const yg = Number(year_group);
    if (!year_group || isNaN(yg) || ![1, 2, 3].includes(yg))
      errors.push('year_group must be 1, 2, or 3');

    return { row: i + 2, full_name, gender: gender === 'm' ? 'male' : gender === 'f' ? 'female' : gender, class_name, house_name, year_group, department, errors };
  }).filter(Boolean) as ParsedStudent[];
}

export default function StudentImport() {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]  = useState(false);
  const [fileName, setFileName]  = useState('');
  const [preview,  setPreview]   = useState<ParsedStudent[]>([]);
  const [loading,  setLoading]   = useState(false);
  const [result,   setResult]    = useState<ImportResult | null>(null);
  const [error,    setError]     = useState('');
  const [importYear, setImportYear] = useState(new Date().getFullYear().toString());

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

  async function handleImport() {
    if (validRows.length === 0) return;
    setLoading(true); setError(''); setResult(null);

    try {
      const year = Number(importYear) || new Date().getFullYear();

      // Call the bulk_import_students RPC which auto-generates IDs
      const { data, error: rpcErr } = await supabase.rpc('bulk_import_students', {
        p_students: JSON.stringify(validRows.map(s => ({
          full_name:  s.full_name,
          gender:     s.gender,
          class_name: s.class_name,
          house_name: s.house_name,
          year_group: Number(s.year_group),
        }))),
        p_year: year,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      setResult({
        imported:  data.imported  ?? 0,
        skipped:   data.skipped   ?? 0,
        errors:    (data.errors as { name: string; error: string }[])?.map(e => `${e.name}: ${e.error}`) ?? [],
        generated: data.generated ?? [],
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
      'full_name,gender,class_name,house_name,year_group',
      'Kwame Asante Mensah,male,Science 3A,Akuamoah,3',
      'Abena Owusu Boateng,female,General Arts 2B,Opaniman,2',
      'Yaw Darko Frimpong,male,Business 1C,Akroko,1',
      'Ama Serwaa Acheampong,female,Home Economics 3A,Tokoli,3',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'kawsec_students_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const btnStyle = (disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '11px 20px', borderRadius: '10px', border: 'none',
    backgroundColor: disabled ? C.creamBorder : C.greenPrimary,
    color: disabled ? C.textMuted : '#fff',
    fontSize: '14px', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled && loading ? 0.7 : 1,
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.creamBg }}>
      <header style={{ backgroundColor: C.greenPrimary, padding: '0 24px', boxShadow: '0 2px 12px rgba(15,45,26,0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/logo.png" alt="KAWSEC" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Bulk Student Import</h1>
              <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '11px' }}>Upload student register — IDs auto-generated</p>
            </div>
          </div>
          <Link to="/admin/dashboard" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Info banner */}
        <div style={{ backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, borderRadius: '14px', padding: '18px 22px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <Info size={18} color={C.greenPrimary} style={{ flexShrink: 0, marginTop: '1px' }} />
            <h2 style={{ fontWeight: 700, fontSize: '15px', color: C.greenPrimary }}>How It Works</h2>
          </div>
          <ol style={{ paddingLeft: '20px', fontSize: '13px', color: C.textMuted, lineHeight: 2 }}>
            <li>Download the CSV template — <strong>no Student ID column needed</strong>, the system generates them automatically</li>
            <li>Fill in each student's name, gender, class, house, and year group</li>
            <li>Upload the file and preview — fix any errors shown</li>
            <li>Click Import — each student gets a unique ID like <code style={{ backgroundColor: C.creamCard, padding: '2px 6px', borderRadius: '4px' }}>KAWSEC-SCI-2024-0001</code></li>
            <li>After import, download the generated ID list to give to students / class teachers</li>
          </ol>
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={downloadTemplate} style={{ ...btnStyle(), backgroundColor: C.white, color: C.greenPrimary, border: `1.5px solid ${C.creamBorder}` }}>
              <Download size={15} /> Download CSV Template
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: C.greenPrimary }}>Academic Year:</label>
              <input
                type="number"
                value={importYear}
                onChange={e => setImportYear(e.target.value)}
                min={2020} max={2099}
                style={{ width: '90px', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${C.creamBorder}`, fontSize: '13px', textAlign: 'center' }}
              />
            </div>
          </div>
        </div>

        {/* KAWSEC ID format reference */}
        <div style={{ backgroundColor: C.white, borderRadius: '14px', padding: '16px 20px', border: `1px solid ${C.creamBorder}`, marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Auto-Generated ID Format
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              { dept: 'Science',        code: 'SCI', example: 'KAWSEC-SCI-2024-0001' },
              { dept: 'General Arts',   code: 'ART', example: 'KAWSEC-ART-2024-0001' },
              { dept: 'Business',       code: 'BIZ', example: 'KAWSEC-BIZ-2024-0001' },
              { dept: 'Home Economics', code: 'HEC', example: 'KAWSEC-HEC-2024-0001' },
              { dept: 'Visual Arts',    code: 'VIS', example: 'KAWSEC-VIS-2024-0001' },
              { dept: 'Agric Science',  code: 'AGR', example: 'KAWSEC-AGR-2024-0001' },
            ].map(d => (
              <div key={d.code} style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: C.creamCard, border: `1px solid ${C.creamBorder}` }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: C.greenPrimary }}>{d.dept}: </span>
                <code style={{ fontSize: '11px', color: C.textMuted }}>{d.example}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          role="button" aria-label="Upload CSV file" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
          style={{
            border: `2px dashed ${dragging ? C.greenPrimary : C.creamBorder}`,
            borderRadius: '16px', padding: '48px 24px', textAlign: 'center',
            backgroundColor: dragging ? C.greenLight : C.white,
            cursor: 'pointer', transition: 'all 0.2s', marginBottom: '24px',
          }}
        >
          <Upload size={36} color={dragging ? C.greenPrimary : C.creamBorder} style={{ margin: '0 auto 14px' }} />
          <p style={{ fontWeight: 600, fontSize: '15px', color: C.greenPrimary, marginBottom: '6px' }}>
            {fileName ? fileName : 'Drop your CSV here, or click to browse'}
          </p>
          <p style={{ fontSize: '13px', color: C.textMuted }}>
            CSV files only · Supports up to 2,500 students
          </p>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>

        {/* Error */}
        {error && (
          <div role="alert" style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '20px' }}>
            <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* Import result */}
        {result && (
          <div style={{ padding: '20px 22px', borderRadius: '14px', backgroundColor: C.greenLight, border: `1px solid ${C.greenMid}40`, marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <CheckCircle size={20} color={C.greenPrimary} />
              <strong style={{ color: C.greenPrimary, fontSize: '15px' }}>Import Complete</strong>
            </div>
            <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '12px' }}>
              <strong style={{ color: C.greenPrimary }}>{result.imported}</strong> students imported ·{' '}
              <strong>{result.skipped}</strong> skipped
            </p>
            {result.errors.length > 0 && (
              <ul style={{ marginBottom: '12px', paddingLeft: '16px', fontSize: '12px', color: '#dc2626' }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {result.generated.length > 0 && (
              <>
                <p style={{ fontSize: '12px', fontWeight: 700, color: C.greenPrimary, marginBottom: '8px' }}>
                  Generated Student IDs — give these to class teachers:
                </p>
                <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', border: `1px solid ${C.creamBorder}`, backgroundColor: C.white }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: C.creamCard }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 700 }}>Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 700 }}>Class</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 700 }}>Student ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.generated.map((s, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${C.creamBorder}` }}>
                          <td style={{ padding: '7px 12px' }}>{s.name}</td>
                          <td style={{ padding: '7px 12px', color: C.textMuted }}>{s.class}</td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 700, color: C.greenPrimary }}>{s.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => {
                    const csv = 'Name,Class,Student ID\n' + result.generated.map(s => `${s.name},${s.class},${s.id}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a'); a.href = url;
                    a.download = `kawsec_student_ids_${importYear}.csv`; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ ...btnStyle(), marginTop: '12px', backgroundColor: C.greenPrimary, fontSize: '13px', padding: '9px 18px' }}
                >
                  <Download size={14} /> Download ID List (CSV)
                </button>
              </>
            )}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <h2 style={{ fontWeight: 700, fontSize: '16px', color: C.greenPrimary }}>Preview — {preview.length} rows</h2>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: C.greenLight, color: C.greenPrimary }}>✓ {validRows.length} valid</span>
              {invalidRows.length > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fef2f2', color: '#dc2626' }}>✗ {invalidRows.length} errors</span>
              )}
              <button onClick={() => { setPreview([]); setFileName(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                <X size={14} /> Clear
              </button>
            </div>

            {invalidRows.length > 0 && (
              <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '16px' }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: '#dc2626', marginBottom: '8px' }}>Fix these errors before importing:</p>
                {invalidRows.map(r => (
                  <div key={r.row} style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>
                    <strong>Row {r.row} ({r.full_name || 'no name'}):</strong> {r.errors.join(' · ')}
                  </div>
                ))}
              </div>
            )}

            <div style={{ overflowX: 'auto', borderRadius: '14px', border: `1px solid ${C.creamBorder}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: C.creamCard }}>
                    {['Row', 'Full Name', 'Gender', 'Class', 'House', 'Yr', 'Dept Code', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: C.textMuted, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.creamBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 100).map(r => (
                    <tr key={r.row} style={{ backgroundColor: r.errors.length > 0 ? '#fff5f5' : C.white, borderBottom: `1px solid ${C.creamBorder}` }}>
                      <td style={{ padding: '8px 14px', color: C.textMuted }}>{r.row}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 500 }}>{r.full_name}</td>
                      <td style={{ padding: '8px 14px', textTransform: 'capitalize' }}>{r.gender}</td>
                      <td style={{ padding: '8px 14px' }}>{r.class_name}</td>
                      <td style={{ padding: '8px 14px' }}>{r.house_name}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>{r.year_group}</td>
                      <td style={{ padding: '8px 14px' }}>
                        {r.department
                          ? <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: C.greenLight, color: C.greenPrimary }}>{r.department}</span>
                          : <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>Auto</span>}
                      </td>
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
                  Showing first 100 of {preview.length} rows. All valid rows will be imported.
                </p>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button onClick={handleImport} disabled={loading || validRows.length === 0} style={btnStyle(loading || validRows.length === 0)}>
                {loading ? 'Importing…' : `Import ${validRows.length} Student${validRows.length !== 1 ? 's' : ''} & Generate IDs`}
              </button>
              {validRows.length === 0 && (
                <span style={{ fontSize: '13px', color: '#dc2626' }}>Fix all errors first.</span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
