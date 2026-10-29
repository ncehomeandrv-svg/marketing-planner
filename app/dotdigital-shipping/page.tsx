'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';

type Match = {
  id: number;
  name: string;
  subject: string;
  occurrences: number;
  checksum: string;
};
type Skipped = { id: number; name: string; reason: string };
type Audit = {
  oldText: string;
  newText: string;
  totalUnsent: number;
  matches: Match[];
  already200: number;
  noMatch: number;
  skipped: Skipped[];
  canApply: boolean;
};
type UpdateResult = {
  id: number;
  name: string;
  status: 'updated' | 'skipped' | 'error' | 'verification-needed';
  occurrences?: number;
  message?: string;
};

export default function DotdigitalShippingPage() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [busy, setBusy] = useState<'scan' | 'update' | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  async function scan() {
    setBusy('scan');
    setAudit(null);
    setResults([]);
    setError('');
    setProgress('Checking Unsent Black November campaigns in Dotdigital...');
    try {
      const response = await fetch('/api/dotdigital/shipping-threshold', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not check Dotdigital campaigns.');
      setAudit(data as Audit);
      setProgress('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to scan campaigns.');
      setProgress('');
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (!audit?.matches.length || !audit.canApply) return;
    const confirmed = window.confirm(
      'Update the free-shipping headline from $250+* to $200+* in ' +
      audit.matches.length + ' Unsent Dotdigital campaign(s)? This does not send or schedule anything.',
    );
    if (!confirmed) return;
    setBusy('update');
    setError('');
    setResults([]);
    const all: UpdateResult[] = [];
    try {
      const matches = audit.matches;
      for (let start = 0; start < matches.length; start += 10) {
        const batch = matches.slice(start, start + 10).map(({ id, checksum }) => ({ id, checksum }));
        setProgress('Updating ' + (start + 1) + '-' + Math.min(start + batch.length, matches.length) + ' of ' + matches.length + '...');
        const response = await fetch('/api/dotdigital/shipping-threshold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmation: 'UPDATE_UNSENT_SHIPPING_200',
            targets: batch,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Dotdigital update request failed.');
        const updated: UpdateResult[] = Array.isArray(data.results) ? data.results : [];
        if (updated.length !== batch.length) throw new Error('Incomplete campaign update response. Review the results before retrying.');
        all.push(...updated);
        setResults([...all]);
      }
      setProgress('Completed. Scan again to confirm no matching $250+* headlines remain.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete every campaign update.');
      setProgress('Stopped after ' + all.length + ' checked campaigns. Re-scan before retrying.');
    } finally {
      setBusy(null);
    }
  }

  const completed = results.filter(r => r.status === 'updated').length;
  const needsAttention = results.filter(r => r.status !== 'updated');
  const possible = audit?.matches.length ?? 0;

  return <main style={{
    minHeight: '100vh', padding: 'clamp(20px, 5vw, 64px) 20px',
    background: '#f4f5f6', color: '#171717', fontFamily: 'Geologica, Arial, sans-serif',
  }}>
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#252525', textDecoration: 'none', fontWeight: 600, marginBottom: 32 }}>
        <ArrowLeft size={17}/> Back to Marketing Planner
      </a>
      <div style={{ borderTop: '6px solid #d71920', background: '#111111', color: '#fff', padding: 'clamp(24px, 5vw, 44px)' }}>
        <div style={{ color: '#ff7373', textTransform: 'uppercase', fontSize: 12, letterSpacing: 2, fontWeight: 800 }}>Dotdigital · Email maintenance</div>
        <h1 style={{ fontFamily: 'Lexend, Arial, sans-serif', fontSize: 'clamp(27px, 4vw, 42px)', lineHeight: 1.14, margin: '13px 0' }}>Free shipping headline update</h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#dddddd', maxWidth: 720, margin: 0 }}>
          Find the $250 free-shipping text in Unsent Black November campaigns, preview the affected drafts and safely update them to $200+*.
          Other product prices, email styling, links and campaign settings are preserved. Subject and plain-text references are also checked.
        </p>
      </div>

      <div style={{ background: '#fff', padding: 'clamp(20px, 4vw, 36px)', border: '1px solid #e5e5e5', marginTop: 18 }}>
        <h2 style={{ fontFamily: 'Lexend, Arial, sans-serif', margin: '0 0 12px', fontSize: 21 }}>Exact text replacement</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))' }}>
          <div style={{ background: '#f7f7f7', borderLeft: '3px solid #999', padding: 18 }}>
            <span style={{ display: 'block', color: '#5e5e5e', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>BEFORE</span>
            <strong style={{ fontFamily: 'Lexend, Arial, sans-serif', fontSize: 14 }}>FREE SHIPPING ON ELIGIBLE ORDERS $250+*</strong>
          </div>
          <div style={{ background: '#fff8f8', borderLeft: '3px solid #d71920', padding: 18 }}>
            <span style={{ display: 'block', color: '#9d1b22', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>AFTER</span>
            <strong style={{ fontFamily: 'Lexend, Arial, sans-serif', fontSize: 14 }}>FREE SHIPPING ON ELIGIBLE ORDERS $200+*</strong>
          </div>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 22px', fontSize: 13, color: '#484848' }}>
          <ShieldCheck size={17} color="#16824b"/> Unsent standard campaigns only · preview before update · check saved results · no sending or scheduling
        </p>
        <button type="button" onClick={() => void scan()} disabled={busy !== null}
          style={{ borderRadius: 0, background: '#191919', color: '#fff', padding: '13px 20px', border: 0, cursor: busy ? 'wait' : 'pointer', fontWeight: 700, fontFamily: 'Lexend, Arial, sans-serif', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {busy === 'scan' ? <LoaderCircle size={17}/> : <RefreshCw size={17}/>}
          {busy === 'scan' ? 'Scanning Dotdigital...' : audit ? 'Re-scan Unsent Black November campaigns' : 'Scan Unsent Black November campaigns'}
        </button>
        {progress && <p aria-live="polite" style={{ marginBottom: 0, fontSize: 13, color: '#444' }}>{progress}</p>}
        {error && <p role="alert" style={{ color: '#9f1c20', background: '#fff1f1', padding: 14, fontSize: 13, marginBottom: 0 }}>{error}</p>}
      </div>

      {audit && <div style={{ background: '#fff', border: '1px solid #e5e5e5', padding: 'clamp(20px, 4vw, 36px)', marginTop: 18 }}>
        <h2 style={{ fontFamily: 'Lexend, Arial, sans-serif', margin: '0 0 20px', fontSize: 21 }}>Scan results</h2>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          {[
            ['Unsent checked', audit.totalUnsent],
            ['Need updating', possible],
            ['Already $200+*', audit.already200],
            ['No matching text', audit.noMatch],
          ].map(([label, value]) =>
            <div key={label} style={{ padding: 18, background: '#f7f7f7' }}>
              <div style={{ fontFamily: 'Lexend, Arial, sans-serif', fontSize: 27, fontWeight: 800 }}>{value}</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{label}</div>
            </div>,
          )}
        </div>
        {audit.skipped.length > 0 && <div style={{ background: '#fff7e8', borderLeft: '3px solid #d18b00', marginTop: 18, padding: 14 }}>
          <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><CircleAlert size={18}/> {audit.skipped.length} campaign(s) need separate review</strong>
          <p style={{ fontSize: 13, margin: '7px 0 0' }}>
            {audit.skipped.map(x => x.name + ' (#' + x.id + '): ' + x.reason).join(' · ')}
          </p>
        </div>}
        {possible > 0 && <div style={{ marginTop: 24 }}>
          <h3 style={{ fontFamily: 'Lexend, Arial, sans-serif', fontSize: 17 }}>Drafts with the old headline</h3>
          <div style={{ borderTop: '1px solid #e6e6e6' }}>
            {audit.matches.map(m => <div key={m.id} style={{ padding: '13px 0', borderBottom: '1px solid #e6e6e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div><strong style={{ fontSize: 14 }}>{m.name}</strong><div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>Campaign #{m.id}{m.subject ? ' · ' + m.subject : ''}</div></div>
              <span style={{ fontSize: 12, color: '#8b1a1a', fontWeight: 700 }}>{m.occurrences} match{m.occurrences !== 1 ? 'es' : ''}</span>
            </div>)}
          </div>
          <button type="button" onClick={() => void apply()} disabled={busy !== null || !audit.canApply || results.length > 0}
            style={{ marginTop: 24, borderRadius: 0, background: busy || !audit.canApply || results.length ? '#aaa' : '#d71920', color: '#fff', padding: '15px 22px', border: 0, cursor: busy ? 'wait' : 'pointer', fontWeight: 800, fontFamily: 'Lexend, Arial, sans-serif', fontSize: 13 }}>
            {busy === 'update' ? 'Updating campaigns...' : 'Update ' + possible + ' Unsent campaign' + (possible === 1 ? '' : 's') + ' to $200+*'}
          </button>
          {!audit.canApply && <p style={{ fontSize: 13, color: '#9c3025' }}>Resolve the scan warnings before applying a bulk change.</p>}
          {results.length > 0 && <p style={{ fontSize: 13 }}>To run the check again or retry, use Re-scan Unsent Black November campaigns.</p>}
        </div>}
        {possible === 0 && audit.skipped.length === 0 && <p style={{ marginTop: 22, display: 'flex', gap: 8, alignItems: 'center', color: '#16824b' }}><CheckCircle2 size={18}/> No Unsent Black November campaigns contain the $250 free-shipping text.</p>}
      </div>}

      {results.length > 0 && <section style={{ marginTop: 18, background: '#fff', border: '1px solid #e5e5e5', padding: 'clamp(20px, 4vw, 36px)' }}>
        <h2 style={{ fontFamily: 'Lexend, Arial, sans-serif', fontSize: 21, margin: '0 0 8px' }}>Update results</h2>
        <p style={{ fontSize: 14, marginTop: 0 }}><strong>{completed}</strong> verified as updated · <strong>{needsAttention.length}</strong> need attention</p>
        <div style={{ borderTop: '1px solid #eee' }}>
          {results.map(r => <div key={r.id} style={{ padding: '13px 0', borderBottom: '1px solid #eee', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {r.status === 'updated' ? <CheckCircle2 size={17} color="#16824b"/> : <CircleAlert size={17} color="#aa6000"/>}
            <div style={{ fontSize: 13 }}><strong>{r.name}</strong> · {r.status === 'updated' ? 'Saved and verified' : r.status}{r.message ? <p style={{ color: '#555', margin: '4px 0 0' }}>{r.message}</p> : null}</div>
          </div>)}
        </div>
      </section>}
    </div>
  </main>;
}
