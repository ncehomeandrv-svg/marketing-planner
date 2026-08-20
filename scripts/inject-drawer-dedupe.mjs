import fs from 'node:fs';

const plannerPath='components/Planner.tsx';
let source=fs.readFileSync(plannerPath,'utf8');

const importAnchor="import OutlookConnection from '@/components/OutlookConnection';";
const reviewImport="import ReviewIntegrations from '@/components/ReviewIntegrations';";
if(!source.includes(reviewImport)){
  if(!source.includes(importAnchor)) throw new Error('Review integrations import anchor not found.');
  source=source.replace(importAnchor,`${importAnchor}\n${reviewImport}`);
}

// Remove every legacy direct integration render. ReviewIntegrations is now the only
// component allowed to mount review/channel panels in the drawer.
const wrappers=[
  /\{item\.type!==['"]important-date['"]&&item\.channel===['"]Email['"]&&<DotdigitalPanel\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&item\.channel===['"]Organic['"]&&<MetaPanel\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&item\.channel===['"]LinkedIn['"]&&<LinkedInPanel\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&item\.channel!==['"]Email['"]&&<SharedHtmlPreview\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&<SharedHtmlPreview\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&<CollaborationPanel\b[^>]*\/>\}\s*/g,
  /<ReviewIntegrations\b[^>]*\/>\s*/g,
];
for(const pattern of wrappers) source=source.replace(pattern,'');
for(const component of ['DotdigitalPanel','MetaPanel','LinkedInPanel','SharedHtmlPreview','CollaborationPanel']){
  source=source.replace(new RegExp(`<${component}\\b[^>]*\\/>\\s*`,'g'),'');
}

const assetsAnchor="    {item.type!=='important-date'&&<section className=\"drawer-section\"><div className=\"section-heading\"><div><h4>Briefs, drafts and assets</h4>";
if(!source.includes(assetsAnchor)) throw new Error('Drawer assets anchor not found.');
const canonical="    <ReviewIntegrations key={item.id} item={item} currentPerson={currentPerson} onUpdate={onUpdate}/>\n";
source=source.replace(assetsAnchor,canonical+assetsAnchor);

const reviewCount=(source.match(/<ReviewIntegrations\b/g)??[]).length;
if(reviewCount!==1) throw new Error(`ReviewIntegrations must render exactly once; found ${reviewCount}`);
for(const component of ['DotdigitalPanel','MetaPanel','LinkedInPanel','SharedHtmlPreview','CollaborationPanel']){
  const directCount=(source.match(new RegExp(`<${component}\\b`,'g'))??[]).length;
  if(directCount!==0) throw new Error(`${component} must not render directly from Planner.tsx; found ${directCount}`);
}

fs.writeFileSync(plannerPath,source);
console.log('Drawer review area centralized: exactly one ReviewIntegrations mount and zero direct channel panel mounts.');
