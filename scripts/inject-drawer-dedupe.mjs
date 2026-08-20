import fs from 'node:fs';

const plannerPath='components/Planner.tsx';
let source=fs.readFileSync(plannerPath,'utf8');

// The review/integration area is authoritative here. Earlier build patches may alter
// these render expressions, so remove every existing invocation AND its surrounding
// channel condition, then insert one canonical block. This is idempotent: running the
// script repeatedly always produces exactly one of each section.
const wrappers=[
  /\{item\.type!==['"]important-date['"]&&item\.channel===['"]Email['"]&&<DotdigitalPanel\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&item\.channel===['"]Organic['"]&&<MetaPanel\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&item\.channel===['"]LinkedIn['"]&&<LinkedInPanel\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&item\.channel!==['"]Email['"]&&<SharedHtmlPreview\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&<SharedHtmlPreview\b[^>]*\/>\}\s*/g,
  /\{item\.type!==['"]important-date['"]&&<CollaborationPanel\b[^>]*\/>\}\s*/g,
];
for(const pattern of wrappers) source=source.replace(pattern,'');

// Defensive cleanup in case an older patch left a bare component invocation behind.
for(const component of ['DotdigitalPanel','MetaPanel','LinkedInPanel','SharedHtmlPreview','CollaborationPanel']){
  source=source.replace(new RegExp(`<${component}\\b[^>]*\\/>\\s*`,'g'),'');
}

const assetsAnchor="    {item.type!=='important-date'&&<section className=\"drawer-section\"><div className=\"section-heading\"><div><h4>Briefs, drafts and assets</h4>";
if(!source.includes(assetsAnchor)) throw new Error('Drawer assets anchor not found.');

const canonical=`    {item.type!=='important-date'&&item.channel==='Email'&&<DotdigitalPanel key={item.id} item={item} onUpdate={onUpdate}/>}\n    {item.type!=='important-date'&&item.channel==='Organic'&&<MetaPanel key={item.id} item={item} onUpdate={onUpdate}/>}\n    {item.type!=='important-date'&&item.channel==='LinkedIn'&&<LinkedInPanel key={item.id} item={item} onUpdate={onUpdate}/>}\n    {item.type!=='important-date'&&<SharedHtmlPreview key={item.id} item={item} onUpdate={onUpdate}/>}\n    {item.type!=='important-date'&&<CollaborationPanel key={item.id} item={item} currentPerson={currentPerson} onUpdate={onUpdate}/>}\n`;
source=source.replace(assetsAnchor,canonical+assetsAnchor);

for(const component of ['DotdigitalPanel','MetaPanel','LinkedInPanel','SharedHtmlPreview','CollaborationPanel']){
  const count=(source.match(new RegExp(`<${component}\\b`,'g'))??[]).length;
  if(count!==1) throw new Error(`${component} must render exactly once; found ${count}`);
}

fs.writeFileSync(plannerPath,source);
console.log('Drawer review area normalized: exactly one Dotdigital, Meta, LinkedIn, Shared HTML and Comments panel.');
