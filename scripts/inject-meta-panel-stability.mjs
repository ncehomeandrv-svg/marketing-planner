import fs from 'node:fs';

const plannerPath='components/Planner.tsx';
let planner=fs.readFileSync(plannerPath,'utf8');

// A planner item should mount the Meta integration once. If earlier build-time patches
// ever leave more than one MetaPanel invocation in the drawer, keep the first and
// remove the extras rather than rendering duplicate editors/uploaders/previews.
let seenMeta=false;
planner=planner.replace(/<MetaPanel\b[^>]*\/>/g,match=>{
  if(!seenMeta){seenMeta=true;return match;}
  return '';
});
if(!seenMeta) throw new Error('MetaPanel render was not found in Planner.tsx');
fs.writeFileSync(plannerPath,planner);

const metaPath='components/MetaPanel.tsx';
let meta=fs.readFileSync(metaPath,'utf8');

// The editable post copy already appears immediately above the asset uploader. Showing
// the same full caption again beneath the visual preview makes the drawer feel like the
// editor is repeating. Keep the preview visual-only and leave editing in one place.
meta=meta.replace(/<div className="social-preview-copy"><p>\{copy\|\|'Saved post copy will appear here\.'\}<\/p><\/div>/g,'');
fs.writeFileSync(metaPath,meta);

console.log('Meta review panel is single-instance and the preview no longer repeats the full post copy.');
