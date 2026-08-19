import fs from 'node:fs';

const path='components/Planner.tsx';
let source=fs.readFileSync(path,'utf8');
const importAnchor="import OutlookConnection from '@/components/OutlookConnection';";
const importLine="import PerformanceSync from '@/components/PerformanceSync';";
if(!source.includes(importLine)){
  if(!source.includes(importAnchor))throw new Error('Performance sync import anchor not found.');
  source=source.replace(importAnchor,`${importAnchor}\n${importLine}`);
}
const resultsAnchor='<div className="metric-grid">';
const syncMarkup='<PerformanceSync item={item} onUpdate={onUpdate}/><div className="metric-grid">';
if(!source.includes('<PerformanceSync item={item} onUpdate={onUpdate}/>')){
  if(!source.includes(resultsAnchor))throw new Error('Performance results anchor not found.');
  source=source.replace(resultsAnchor,syncMarkup);
}
// Remove the creative history/reuse panel and its now-unused related-work lookup.
source=source.replace(/\n  const related=allItems\.filter\([^\n]+\);/, '');
source=source.replace(/\n    \{item\.type!==\'important-date\'&&related\.length>0&&<section className="drawer-section"><h4>Creative history & reuse<\/h4><p className="help-text">Previous work with the same format or linked SKU\.<\/p><div className="related-list">\{related\.map\(entry=><button key=\{entry\.id\} onClick=\{\(\)=>onUpdate\(entry\)\}><Copy size=\{15\}\/><span><b>\{entry\.title\}<\/b><small>\{format\(parseISO\(entry\.date\),\'d MMM yyyy\'\)} · \{inferFormat\(entry\)}<\/small><\/span><\/button>\)}<\/div><\/section>\}/, '');
source=source.replace('Comma-separated. Used for search, reporting and creative history.','Comma-separated. Used for search and reporting.');
// Clean up the redundant discriminator check caught by TypeScript in the previous optimisation pass.
source=source.replace("item.type==='campaign'&&!item.parentCampaignId&&item.type!=='strategy'","item.type==='campaign'&&!item.parentCampaignId");
fs.writeFileSync(path,source);
console.log('Performance sync UI injected and creative history removed.');
