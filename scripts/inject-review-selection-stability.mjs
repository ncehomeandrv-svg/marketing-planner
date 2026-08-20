import fs from 'node:fs';

const path='components/Planner.tsx';
let source=fs.readFileSync(path,'utf8');

// Review links should select their target once. Previously this effect ran after every
// item update, so an ?item= deep link could snap the drawer back to the emailed card
// while a reviewer was working on another card.
source=source.replace(
  "import { useEffect, useMemo, useState } from 'react';",
  "import { useEffect, useMemo, useRef, useState } from 'react';"
);

const stateAnchor="  const [dragOverDate,setDragOverDate]=useState<string|null>(null);";
if(!source.includes('const reviewDeepLinkHandled=useRef(false);')){
  if(!source.includes(stateAnchor)) throw new Error('Review deep-link state anchor not found.');
  source=source.replace(stateAnchor,`${stateAnchor}\n  const reviewDeepLinkHandled=useRef(false);`);
}

const oldDeepLink="  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('item');if(!id)return;const match=items.find(entry=>entry.id===id);if(match){setSelected(match);setMonth(parseISO(match.date));}},[items]);";
const newDeepLink="  useEffect(()=>{if(reviewDeepLinkHandled.current)return;const id=new URLSearchParams(window.location.search).get('item');if(!id){reviewDeepLinkHandled.current=true;return;}const match=items.find(entry=>entry.id===id);if(match){setSelected(match);setMonth(parseISO(match.date));reviewDeepLinkHandled.current=true;}},[items]);";
if(source.includes(oldDeepLink)) source=source.replace(oldDeepLink,newDeepLink);
else if(!source.includes(newDeepLink)) throw new Error('Review deep-link effect anchor not found.');

// An update is allowed to refresh the currently open card, but it must never select
// a different card as a side effect of an async/background save.
source=source.replace(
  "    setSelected(updated);setSaveState('saving');",
  "    setSelected(current=>current===null||current.id===updated.id?updated:current);setSaveState('saving');"
);

// Duplicating is an explicit navigation action, so keep the previous behaviour of
// opening the newly-created duplicate.
source=source.replace(
  "    await updateItem(duplicate);\n  }",
  "    await updateItem(duplicate);setSelected(duplicate);\n  }"
);

// Stateful review/integration panels must remount when the selected planner item
// changes. This prevents draft feedback, Dotdigital selections, preview state or
// integration state from carrying across to a different card.
const keyedPanels=[
  ['<DotdigitalPanel item={item} onUpdate={onUpdate}/>','<DotdigitalPanel key={item.id} item={item} onUpdate={onUpdate}/>'],
  ['<MetaPanel item={item} onUpdate={onUpdate}/>','<MetaPanel key={item.id} item={item} onUpdate={onUpdate}/>'],
  ['<LinkedInPanel item={item} onUpdate={onUpdate}/>','<LinkedInPanel key={item.id} item={item} onUpdate={onUpdate}/>'],
  ['<SharedHtmlPreview item={item} onUpdate={onUpdate}/>','<SharedHtmlPreview key={item.id} item={item} onUpdate={onUpdate}/>'],
  ['<CollaborationPanel item={item} currentPerson={currentPerson} onUpdate={onUpdate}/>','<CollaborationPanel key={item.id} item={item} currentPerson={currentPerson} onUpdate={onUpdate}/>'],
  ['<PerformanceSync item={item} onUpdate={onUpdate}/>','<PerformanceSync key={item.id} item={item} onUpdate={onUpdate}/>'],
];
for(const [from,to] of keyedPanels){source=source.split(from).join(to)}

fs.writeFileSync(path,source);
console.log('Review drawer selection is stable and per-card review state is isolated.');
