'use client';

import { melbourneLocalToUtc, utcToMelbourneInput } from '@/lib/time';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, LoaderCircle, Mail, Monitor, RefreshCw, Send, Smartphone, X } from 'lucide-react';
import type { PlannerItem } from '@/lib/types';

interface Campaign { id?: number; Id?: number; name?: string; Name?: string; subject?: string; Subject?: string; status?: string; Status?: string }
interface Audience { id?: number; Id?: number; name?: string; Name?: string; contacts?: number; Contacts?: number; type?: string }
type AudienceType = 'List' | 'Segment';
type NormalisedAudience = ReturnType<typeof normaliseAudience>;
interface CampaignPreview { campaignId: number; name: string; subject: string; previewText: string; fromName: string; htmlContent: string; plainTextContent: string }

function normaliseCampaign(value: Campaign) {
  return {
    id: Number(value.id ?? value.Id),
    name: String(value.name ?? value.Name ?? 'Unnamed campaign'),
    subject: String(value.subject ?? value.Subject ?? ''),
    status: String(value.status ?? value.Status ?? 'Unsent'),
  };
}

function normaliseAudience(value: Audience, fallbackType: AudienceType) {
  return {
    id: Number(value.id ?? value.Id),
    name: String(value.name ?? value.Name ?? 'Unnamed audience'),
    contacts: Number(value.contacts ?? value.Contacts ?? 0),
    type: (String(value.type ?? fallbackType) === 'Segment' ? 'Segment' : 'List') as AudienceType,
  };
}

export default function DotdigitalPanel({ item, onUpdate }: { item: PlannerItem; onUpdate: (item: PlannerItem) => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connected, setConnected] = useState(false);
  const [campaigns, setCampaigns] = useState<ReturnType<typeof normaliseCampaign>[]>([]);
  const [audiences, setAudiences] = useState<NormalisedAudience[]>([]);
  const [campaignId, setCampaignId] = useState(item.dotdigitalCampaignId ? String(item.dotdigitalCampaignId) : '');
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(item.dotdigitalAudienceKeys ?? item.dotdigitalAudienceIds?.map(id => `List:${id}`) ?? []);
  const [sendDate, setSendDate] = useState(utcToMelbourneInput(item.dotdigitalScheduledAt)||`${item.date}T10:00`);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmails, setTestEmails] = useState(item.dotdigitalTestEmails??'');

  const selectedCampaign = useMemo(() => campaigns.find(campaign => String(campaign.id) === campaignId), [campaignId, campaigns]);
  const lists = useMemo(() => audiences.filter(audience => audience.type === 'List'), [audiences]);
  const segments = useMemo(() => audiences.filter(audience => audience.type === 'Segment'), [audiences]);
  const selectedAudienceRecords = useMemo(() => audiences.filter(audience => selectedAudiences.includes(`${audience.type}:${audience.id}`)), [audiences, selectedAudiences]);

  async function loadConnection() {
    setLoading(true);
    setMessage('');
    try {
      const statusResponse = await fetch('/api/dotdigital/status');
      const status = await statusResponse.json();
      setConfigured(Boolean(status.configured));
      setConnected(Boolean(status.connected));
      if (!status.connected) {
        setMessage(status.configured ? (status.error || 'Dotdigital connection failed.') : 'Add the Dotdigital API credentials in Vercel to connect.');
        return;
      }

      const [campaignResponse, audienceResponse] = await Promise.all([
        fetch('/api/dotdigital/campaigns'),
        fetch('/api/dotdigital/audiences'),
      ]);
      const campaignBody = await campaignResponse.json();
      const audienceBody = await audienceResponse.json();
      if (!campaignResponse.ok) throw new Error(campaignBody.error || 'Unable to load campaigns');
      if (!audienceResponse.ok) throw new Error(audienceBody.error || 'Unable to load audiences');

      const campaignValues = Array.isArray(campaignBody.campaigns) ? campaignBody.campaigns : campaignBody.campaigns?.items ?? [];
      const bookValues = Array.isArray(audienceBody.addressBooks) ? audienceBody.addressBooks : audienceBody.addressBooks?.items ?? [];
      const segmentValues = Array.isArray(audienceBody.segments) ? audienceBody.segments : audienceBody.segments?.items ?? [];
      setCampaigns(campaignValues.map(normaliseCampaign).filter((campaign: { id: number }) => Number.isFinite(campaign.id)));
      setAudiences([
        ...bookValues.map((value: Audience) => normaliseAudience(value, 'List')),
        ...segmentValues.map((value: Audience) => normaliseAudience(value, 'Segment')),
      ].filter((audience: { id: number }) => Number.isFinite(audience.id)));
    } catch (error) {
      setConnected(false);
      setMessage(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadConnection(); }, []);
  useEffect(() => { if (campaignId) void loadPreview(); else setPreview(null); }, [campaignId]);

  function toggleAudience(audience: NormalisedAudience) {
    const key = `${audience.type}:${audience.id}`;
    setSelectedAudiences(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key]);
  }

  async function loadPreview() {
    if (!campaignId) return;
    setPreviewLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/dotdigital/campaigns/${encodeURIComponent(campaignId)}/preview`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load campaign preview');
      setPreview(body);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load campaign preview');
    } finally {
      setPreviewLoading(false);
    }
  }



  function saveDraft(){
    onUpdate({...item,dotdigitalCampaignId:campaignId?Number(campaignId):undefined,dotdigitalCampaignName:selectedCampaign?.name,dotdigitalAudienceIds:selectedAudienceRecords.map(a=>a.id),dotdigitalAudienceKeys:selectedAudiences,dotdigitalTestEmails:testEmails,dotdigitalScheduledAt:sendDate?melbourneLocalToUtc(sendDate).toISOString():undefined,status:item.status==='Brief Required'?'In Production':item.status});
    setMessage('Email draft saved for review.');
  }

  async function sendTest() {
    if (!campaignId) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/dotdigital/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignID: Number(campaignId), emails: testEmails }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to send test email');
      setMessage(`Test email sent to ${body.recipients?.join(', ') || testEmails}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send test email');
    } finally {
      setLoading(false);
    }
  }

  async function schedule() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/dotdigital/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignID: Number(campaignId),
          // Dotdigital's send endpoint accepts both list IDs and segment IDs in addressBookIDs.
          addressBookIDs: selectedAudienceRecords.map(audience => audience.id),
          audiences: selectedAudienceRecords.map(audience => ({ id: audience.id, name: audience.name, type: audience.type })),
          sendDate: melbourneLocalToUtc(sendDate).toISOString(),
          approvalStatus: item.approvalStatus,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to schedule campaign');
      const result = body.result ?? {};
      const sendId = String(result.id ?? result.Id ?? result.sendId ?? result.SendId ?? '');
      const status = String(result.status ?? result.Status ?? 'Scheduled');
      onUpdate({
        ...item,
        status: 'Scheduled',
        dotdigitalCampaignId: Number(campaignId),
        dotdigitalCampaignName: selectedCampaign?.name,
        dotdigitalAudienceIds: selectedAudienceRecords.map(audience => audience.id),
        dotdigitalSendId: sendId,
        dotdigitalSendStatus: status,
        dotdigitalScheduledAt: melbourneLocalToUtc(sendDate).toISOString(),
      });
      setMessage(`Scheduled in Dotdigital${sendId ? ` · Send ID ${sendId}` : ''}`);
    } catch (error) {
      const failureMessage=error instanceof Error ? error.message : 'Unable to schedule campaign';
      setMessage(failureMessage);
      fetch('/api/failures',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:'Dotdigital',itemId:item.id,title:'Dotdigital scheduling failed',message:failureMessage})}).catch(()=>{});
      fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person:'Kieren',itemId:item.id,title:'Dotdigital scheduling failed',message:failureMessage,link:window.location.origin,item})}).catch(()=>{});
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus() {
    if (!item.dotdigitalSendId) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/dotdigital/send-status/${encodeURIComponent(item.dotdigitalSendId)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to refresh status');
      const result = body.result ?? {};
      const status = String(result.status ?? result.Status ?? result);
      onUpdate({ ...item, dotdigitalSendStatus: status, status: status === 'Sent' ? 'Published' : item.status });
      setMessage(`Dotdigital status: ${status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to refresh status');
    } finally {
      setLoading(false);
    }
  }

  return <section className="drawer-section dotdigital-panel">
    <div className="dotdigital-heading">
      <div><span className="integration-kicker">DOTDIGITAL</span><h4>Email review and scheduling</h4><p>Preview existing Dotdigital campaigns, send internal tests, select the audience and schedule approved emails.</p></div>
      <button className="icon-btn" type="button" onClick={() => void loadConnection()} aria-label="Refresh Dotdigital" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18}/> : <RefreshCw size={18}/>}</button>
    </div>

    <div className={`connection-state ${connected ? 'connected' : 'disconnected'}`}>
      {connected ? <CheckCircle2 size={17}/> : <Mail size={17}/>}<strong>{connected ? 'Dotdigital connected' : configured === false ? 'Dotdigital not configured' : 'Dotdigital unavailable'}</strong>
    </div>

    {connected && <>
      <div className="integration-field"><span>Dotdigital campaign</span><div className="campaign-select-row"><select value={campaignId} onChange={event => setCampaignId(event.target.value)}><option value="">Select an unsent campaign</option>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}{campaign.subject ? ` — ${campaign.subject}` : ''}</option>)}</select><button className="btn secondary preview-btn" type="button" onClick={() => void loadPreview()} disabled={!campaignId || previewLoading}>{previewLoading ? <LoaderCircle className="spin" size={16}/> : <Eye size={16}/>}Preview</button></div></div>
      {preview && <div className="campaign-message-details"><div><span>Subject line</span><strong>{preview.subject || 'No subject line set'}</strong></div><div><span>Preview text</span><strong>{preview.previewText || 'No preview text detected'}</strong></div></div>}
      <div className="test-send-row"><input value={testEmails} onChange={event => setTestEmails(event.target.value)} placeholder="Test recipient emails, comma separated"/><button className="btn secondary" type="button" onClick={() => void sendTest()} disabled={loading || !campaignId || !testEmails.trim()}><Send size={16}/>Send test</button></div>
      <div className="integration-field"><span>Audience</span><p className="audience-help">Choose one or more Dotdigital lists or segments. B2C segments can be scheduled directly.</p><div className="audience-groups"><div className="audience-group"><div className="audience-group-title"><strong>Segments</strong><span>{segments.length}</span></div><div className="audience-list">{segments.length ? segments.map(audience => <label key={`Segment-${audience.id}`}><input type="checkbox" checked={selectedAudiences.includes(`Segment:${audience.id}`)} onChange={() => toggleAudience(audience)}/><div><strong>{audience.name}</strong><small>Segment{audience.contacts ? ` · ${audience.contacts.toLocaleString('en-AU')} contacts` : ''}</small></div></label>) : <small className="audience-empty">No Dotdigital segments returned.</small>}</div></div><div className="audience-group"><div className="audience-group-title"><strong>Lists</strong><span>{lists.length}</span></div><div className="audience-list">{lists.length ? lists.map(audience => <label key={`List-${audience.id}`}><input type="checkbox" checked={selectedAudiences.includes(`List:${audience.id}`)} onChange={() => toggleAudience(audience)}/><div><strong>{audience.name}</strong><small>List{audience.contacts ? ` · ${audience.contacts.toLocaleString('en-AU')} contacts` : ''}</small></div></label>) : <small className="audience-empty">No Dotdigital lists returned.</small>}</div></div></div></div>
      <label className="integration-field"><span>Send date and time (Melbourne)</span><input type="datetime-local" value={sendDate} onChange={event => setSendDate(event.target.value)}/></label>
      <div className="integration-actions"><button className="btn secondary" type="button" onClick={saveDraft}>Save draft</button><button className="btn primary" type="button" onClick={() => void schedule()} disabled={loading || !campaignId || selectedAudienceRecords.length === 0 || item.approvalStatus !== 'Approved'}><Send size={16}/>Schedule in Dotdigital</button>{item.approvalStatus !== 'Approved' && <small>Jenna must approve this item first.</small>}</div>
      {item.dotdigitalSendId && <div className="send-record"><div><strong>{item.dotdigitalCampaignName || `Campaign ${item.dotdigitalCampaignId}`}</strong><span>Send ID: {item.dotdigitalSendId}</span><span>Status: {item.dotdigitalSendStatus || 'Scheduled'}</span></div><button type="button" className="btn secondary" onClick={() => void refreshStatus()} disabled={loading}>Refresh status</button></div>}
    </>}
    {message && <p className="integration-message">{message}</p>}
    {preview && <div className="email-preview-overlay" role="dialog" aria-modal="true" aria-label="Dotdigital campaign preview">
      <div className="email-preview-modal">
        <header className="email-preview-head">
          <div><span className="integration-kicker">DOTDIGITAL PREVIEW</span><h3>{preview.name}</h3><p><strong>Subject:</strong> {preview.subject || 'No subject line'}{preview.fromName ? <> · <strong>From:</strong> {preview.fromName}</> : null}</p><p><strong>Preview text:</strong> {preview.previewText || 'No preview text detected'}</p></div>
          <div className="email-preview-tools"><div className="device-toggle"><button type="button" className={previewDevice === 'desktop' ? 'active' : ''} onClick={() => setPreviewDevice('desktop')}><Monitor size={16}/>Desktop</button><button type="button" className={previewDevice === 'mobile' ? 'active' : ''} onClick={() => setPreviewDevice('mobile')}><Smartphone size={16}/>Mobile</button></div><button type="button" className="icon-btn" onClick={() => setPreview(null)} aria-label="Close preview"><X size={20}/></button></div>
        </header>
        <div className={`email-preview-stage ${previewDevice}`}>
          {preview.htmlContent ? <iframe title={`Preview of ${preview.name}`} sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={preview.htmlContent}/> : <pre>{preview.plainTextContent}</pre>}
        </div>
        <footer className="email-preview-foot"><span>This is the current campaign content loaded directly from Dotdigital.</span><button type="button" className="btn secondary" onClick={() => setPreview(null)}>Close preview</button></footer>
      </div>
    </div>}

  </section>;
}
