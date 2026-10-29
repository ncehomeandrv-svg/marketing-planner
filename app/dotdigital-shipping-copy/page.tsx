'use client';

import { useState } from 'react';

type Field = 'Subject' | 'Preview text' | 'HTML text box' | 'Plain text';
type Finding = { field: Field; currentText: string; suggestedText: string };
type Campaign = { id: number; name: string; status: string; findings: Finding[] };
type Audit = {
  generatedAt: string; totalUnsent: number; successfullyChecked: number;
  affectedCampaigns: number; occurrences: number; campaigns: Campaign[];
  errors: { id: number; name: string; issue: string }[];
  caveat: string; readOnly: boolean;
};

export default function DotdigitalShippingCopyAuditPage() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Field | 'All'>('All');

  async function runAudit() {
    setWorking(true); setError(''); setAudit(null);
    try {
      const response = await fetch('/api/dotdigital/shipping-copy-audit', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to read Dotdigital Unsent Black November campaigns');
      setAudit(result as Audit);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audit failed');
    } finally { setWorking(false); }
  }

  const visible = (audit?.campaigns || [])
    .map(c => ({ ...c, findings: c.findings.filter(f => filter === 'All' || f.field === filter) }))
    .filter(c => c.findings.length);
  const fields: (Field | 'All')[] = ['All', 'HTML text box', 'Plain text', 'Subject', 'Preview text'];

  return <main style={{ minHeight: '100vh', background: '#f4f5f6', color: '#191919', fontFamily: 'Geologica, Arial, sans-serif', padding: '30px 18px 70px' }}>
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <a href="/" style={{ color: '#333', fontSize: 14, display: 'inline-block', marginBottom: 20 }}>← Marketing Planner</a>
      <header style={{ background: '#111', color: '#fff', borderTop: '6px solid #d71920', padding: 'clamp(22px, 4vw, 42px)' }}>
        <div style={{ color: '#f77', fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>Dotdigital · Read-only audit</div>
        <h1 style={{ margin: '12px 0', fontSize: 'clamp(25px, 4vw, 38px)', lineHeight: 1.15, fontFamily: 'Lexend, Arial, sans-serif' }}>Black November shipping copy audit</h1>
        <p style={{ margin: 0, maxWidth: 780, lineHeight: 1.6, color: '#ddd', fontSize: 14 }}>Find old $250 free-shipping references in editable email text, plain-text copy, subject lines and preview text. Image banners and artwork are not scanned. This audit never modifies, sends or schedules campaigns. To apply verified corrections, use the bulk shipping updater.</p>
      </header>

      <section style={{ background: '#fff', padding: 24, marginTop: 16, border: '1px solid #e5e5e5' }}>
        <a href="/dotdigital-shipping" style={{ display:'inline-block', marginBottom:16, color:'#b71920', fontWeight:700 }}>Open Black November $250 to $200 bulk updater</a>
        <button onClick={() => void runAudit()} type="button" disabled={working} style={{ background: working ? '#888' : '#d71920', color: '#fff', border: 0, borderRadius: 0, padding: '14px 24px', fontFamily: 'Lexend, Arial, sans-serif', fontWeight: 700, cursor: working ? 'wait' : 'pointer' }}>{working ? 'Scanning Black November Unsent campaigns…' : audit ? 'Re-run Dotdigital audit' : 'Scan all Unsent campaigns'}</button>
        {error && <p role="alert" style={{ color: '#a11a23' }}>{error}</p>}
      </section>

      {audit && <>
        <section style={{ background: '#fff', padding: 24, marginTop: 16, border: '1px solid #e5e5e5' }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {([['Unsent campaigns', audit.totalUnsent], ['Successfully read', audit.successfullyChecked], ['Need reviewing', audit.affectedCampaigns], ['Text occurrences', audit.occurrences]] as const).map(([label, value]) => <div key={label} style={{ background: '#f5f5f5', padding: 20 }}><div style={{ fontSize: 28, fontFamily: 'Lexend, Arial, sans-serif', fontWeight: 800 }}>{value}</div><div style={{ fontSize: 12, color: '#555', marginTop: 5 }}>{label}</div></div>)}
          </div>
          <p style={{ fontSize: 12, color: '#555', marginBottom: 0 }}>Scanned {new Date(audit.generatedAt).toLocaleString('en-AU')}. No Dotdigital drafts were changed.</p>
          {audit.errors.length > 0 && <div style={{ borderLeft: '3px solid #bb751b', background: '#fff8ea', padding: 14, marginTop: 18 }}><strong>{audit.errors.length} campaign(s) could not be verified</strong>{audit.errors.map(e => <p key={e.id} style={{ fontSize: 13 }}>{e.name} (#{e.id}): {e.issue}</p>)}</div>}
          <p style={{ fontSize: 12, color: '#5c5c5c', lineHeight: 1.6 }}>{audit.caveat}</p>
        </section>

        <section style={{ background: '#fff', padding: 24, marginTop: 16, border: '1px solid #e5e5e5' }}>
          <h2 style={{ margin: '0 0 13px', fontFamily: 'Lexend, Arial, sans-serif', fontSize: 20 }}>What needs changing to $200</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {fields.map(field => <button key={field} type="button" onClick={() => setFilter(field)} style={{ borderRadius: 0, border: '1px solid #aaa', background: filter === field ? '#191919' : '#fff', color: filter === field ? '#fff' : '#222', padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>{field}</button>)}
          </div>
          {visible.length === 0 ? <p style={{ fontSize: 14 }}>No matching old shipping wording in the selected field{filter === 'All' ? 's' : ''}{audit.errors.length ? ' among successfully read campaigns.' : '.'}</p> :
            visible.map(c => <article key={c.id} style={{ borderTop: '1px solid #ddd', padding: '18px 0' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontFamily: 'Lexend, Arial, sans-serif' }}>{c.name}</h3>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 13 }}>Campaign #{c.id} · Unsent · {c.findings.length} matching occurrence(s)</div>
              {c.findings.map((f, index) => <div key={f.field + index} style={{ marginBottom: 12, borderLeft: '3px solid #d71920', background: '#f7f7f7', padding: 14 }}>
                <strong style={{ fontSize: 12 }}>{f.field}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 9 }}>
                  <div style={{ overflowWrap: 'anywhere', fontSize: 13 }}><span style={{ color: '#8c1d1d', fontSize: 11, fontWeight: 700 }}>CURRENT</span><p style={{ margin: '5px 0' }}>{f.currentText}</p></div>
                  <div style={{ overflowWrap: 'anywhere', fontSize: 13 }}><span style={{ color: '#246e40', fontSize: 11, fontWeight: 700 }}>SUGGESTED</span><p style={{ margin: '5px 0' }}>{f.suggestedText}</p></div>
                </div>
              </div>)}
            </article>)}
        </section>
      </>}
    </div>
  </main>;
}
