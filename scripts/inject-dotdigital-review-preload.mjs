import fs from 'node:fs';

const panelPath='components/DotdigitalPanel.tsx';
let panel=fs.readFileSync(panelPath,'utf8');

const oldSelector='<select value={campaignId} onChange={event => setCampaignId(event.target.value)}><option value="">Select an unsent campaign</option>';
const newSelector='<select value={campaignId} onChange={event => {const value=event.target.value;setCampaignId(value);const campaign=campaigns.find(entry=>String(entry.id)===value);onUpdate({...item,dotdigitalCampaignId:value?Number(value):undefined,dotdigitalCampaignName:campaign?.name});}}><option value="">Select an unsent campaign</option>';
if(panel.includes(oldSelector)) panel=panel.replace(oldSelector,newSelector);

const oldSection='<section className="drawer-section dotdigital-panel">';
const newSection='<section id="dotdigital-review" className="drawer-section dotdigital-panel">';
if(panel.includes(oldSection)) panel=panel.replace(oldSection,newSection);

fs.writeFileSync(panelPath,panel);

const notificationsPath='app/api/notifications/route.ts';
let notifications=fs.readFileSync(notificationsPath,'utf8');
const oldHref="const href=item?.id?`${root}/?item=${encodeURIComponent(item.id)}${isReview?'&review=1#review-assets':''}`:root;";
const newHref="const reviewAnchor=item?.channel==='Email'&&item?.id?'#dotdigital-review':'#review-assets';\n  const href=item?.id?`${root}/?item=${encodeURIComponent(item.id)}${isReview?`&review=1${reviewAnchor}`:''}`:root;";
if(notifications.includes(oldHref)) notifications=notifications.replace(oldHref,newHref);
fs.writeFileSync(notificationsPath,notifications);

console.log('Dotdigital selections persist immediately and email review links open the Dotdigital review section.');
