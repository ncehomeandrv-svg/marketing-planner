import fs from 'node:fs';

const plannerPath='components/Planner.tsx';
let source=fs.readFileSync(plannerPath,'utf8');

// These drawer integrations are single-card sections. Build-time patches have evolved
// over time, so make the final pass authoritative: keep exactly the first invocation
// of each component and remove any accidental duplicates before Next.js compiles.
const singleInstanceComponents=[
  'DotdigitalPanel',
  'MetaPanel',
  'LinkedInPanel',
  'SharedHtmlPreview',
  'CollaborationPanel',
];

const report=[];
for(const component of singleInstanceComponents){
  let seen=0;
  const pattern=new RegExp(`<${component}\\b[^>]*\\/>`,'g');
  source=source.replace(pattern,match=>{
    seen+=1;
    return seen===1?match:'';
  });
  if(seen===0) throw new Error(`${component} render was not found in Planner.tsx`);
  report.push(`${component}:${seen}->1`);
}

fs.writeFileSync(plannerPath,source);
console.log(`Drawer dedupe complete (${report.join(', ')}).`);
