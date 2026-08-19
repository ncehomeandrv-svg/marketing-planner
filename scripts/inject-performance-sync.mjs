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
// Clean up the redundant discriminator check caught by TypeScript in the previous optimisation pass.
source=source.replace("item.type==='campaign'&&!item.parentCampaignId&&item.type!=='strategy'","item.type==='campaign'&&!item.parentCampaignId");
fs.writeFileSync(path,source);
console.log('Performance sync UI injected.');
