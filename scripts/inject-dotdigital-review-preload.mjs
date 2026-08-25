import fs from 'node:fs';

const panelPath='components/DotdigitalPanel.tsx';
let panel=fs.readFileSync(panelPath,'utf8');

const oldSelector='<select value={campaignId} onChange={event => setCampaignId(event.target.value)}><option value="">Select an unsent campaign</option>';
const newSelector='<select value={campaignId} onChange={event => {const value=event.target.value;setCampaignId(value);const campaign=campaigns.find(entry=>String(entry.id)===value);onUpdate({...item,dotdigitalCampaignId:value?Number(value):undefined,dotdigitalCampaignName:campaign?.name});}}><option value="">Select an unsent campaign</option>';
if(panel.includes(oldSelector)) panel=panel.replace(oldSelector,newSelector);

const oldSection='<section className="drawer-section dotdigital-panel">';
const newSection='<section id="dotdigital-review" className="drawer-section dotdigital-panel">';
if(panel.includes(oldSection)) panel=panel.replace(oldSection,newSection);

const oldPreviewInterface='interface CampaignPreview { campaignId: number; name: string; subject: string; previewText: string; fromName: string; htmlContent: string; plainTextContent: string }';
const newPreviewInterface='interface CampaignPreview { campaignId: number; name: string; subject: string; previewText: string; fromName: string; htmlContent: string; plainTextContent: string; links?: Array<{ href: string; label: string }> }';
if(panel.includes(oldPreviewInterface)) panel=panel.replace(oldPreviewInterface,newPreviewInterface);

const detailsBlock='{preview && <div className="campaign-message-details"><div><span>Subject line</span><strong>{preview.subject || \'No subject line set\'}</strong></div><div><span>Preview text</span><strong>{preview.previewText || \'No preview text detected\'}</strong></div></div>}';
const linksBlock=`${detailsBlock}\n      {preview && <div className="dotdigital-review-links"><div className="dotdigital-review-links-head"><div><span className="integration-kicker">LINK CHECK</span><strong>Email links to review</strong></div><span>{preview.links?.length ?? 0} link{(preview.links?.length ?? 0) === 1 ? '' : 's'}</span></div>{preview.links?.length ? <div className="dotdigital-review-link-list">{preview.links.map((link,index)=><a key={\`\${link.href}-\${index}\`} href={link.href} target="_blank" rel="noreferrer"><span>{link.label || \`Link \${index+1}\`}</span><small>{link.href}</small></a>)}</div> : <p className="audience-help">No standard web links were found in the current Dotdigital campaign.</p>}</div>}`;
if(panel.includes(detailsBlock) && !panel.includes('className="dotdigital-review-links"')) panel=panel.replace(detailsBlock,linksBlock);

fs.writeFileSync(panelPath,panel);

const cssPath='app/globals.css';
let css=fs.readFileSync(cssPath,'utf8');
if(!css.includes('/* dotdigital-review-links */')){
  css+=`\n\n/* dotdigital-review-links */\n.dotdigital-review-links{border:1px solid #dedede;background:#fafafa;padding:14px;margin:12px 0 16px}.dotdigital-review-links-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px}.dotdigital-review-links-head>div{display:flex;flex-direction:column;gap:3px}.dotdigital-review-links-head>span{font-size:12px;color:#666}.dotdigital-review-link-list{display:grid;gap:8px}.dotdigital-review-link-list a{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid #e4e4e4;background:#fff;color:#171717;text-decoration:none;overflow:hidden}.dotdigital-review-link-list a:hover{border-color:#d42027}.dotdigital-review-link-list span{font-weight:700;font-size:13px}.dotdigital-review-link-list small{font-size:11px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n`;
  fs.writeFileSync(cssPath,css);
}

const notificationsPath='app/api/notifications/route.ts';
let notifications=fs.readFileSync(notificationsPath,'utf8');
const oldHref="const href=item?.id?`${root}/?item=${encodeURIComponent(item.id)}${isReview?'&review=1#review-assets':''}`:root;";
const newHref="const reviewAnchor=item?.channel==='Email'&&item?.id?'#dotdigital-review':'#review-assets';\n  const href=item?.id?`${root}/?item=${encodeURIComponent(item.id)}${isReview?`&review=1${reviewAnchor}`:''}`:root;";
if(notifications.includes(oldHref)) notifications=notifications.replace(oldHref,newHref);
fs.writeFileSync(notificationsPath,notifications);

console.log('Dotdigital selections persist immediately, review links open the email section, and campaign URLs are listed for checking.');
