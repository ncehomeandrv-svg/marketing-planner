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

// Keep the production board as a compact exception summary rather than a second calendar.
source=source.replace(
  '<section className="action-board"><div className="action-board-head"><div><span>PRODUCTION BOARD</span><h3>Today & next 7 days</h3></div><small>Creative deadlines are tracked separately from launch dates.</small></div><div className="action-board-grid"><ActionBucket title="Overdue" icon={<AlertTriangle size={17}/>} items={overdue} onOpen={setSelected}/><ActionBucket title="Due this week" icon={<CalendarDays size={17}/>} items={dueThisWeek} onOpen={setSelected}/><ActionBucket title="Awaiting approval" icon={<CheckCircle2 size={17}/>} items={approvals} onOpen={setSelected}/><ActionBucket title="Launching this week" icon={<FolderKanban size={17}/>} items={launches} onOpen={setSelected}/></div></section>',
  '<section className="action-board compact-action-board"><div className="action-board-head"><div><span>PRODUCTION BOARD</span><h3>Priority actions</h3></div><small>Only the highest-priority items are surfaced here. Use the calendar below for the full schedule.</small></div><div className="action-board-grid"><ActionBucket title="Overdue" icon={<AlertTriangle size={17}/>} items={overdue} onOpen={setSelected}/><ActionBucket title="Due this week" icon={<CalendarDays size={17}/>} items={dueThisWeek} onOpen={setSelected}/><ActionBucket title="Awaiting approval" icon={<CheckCircle2 size={17}/>} items={approvals} onOpen={setSelected}/><ActionBucket title="Launching this week" icon={<FolderKanban size={17}/>} items={launches.filter(item=>item.type!==\'important-date\')} onOpen={setSelected}/></div></section>'
);
source=source.replace(
  "function ActionBucket({title,icon,items,onOpen}:{title:string;icon:React.ReactNode;items:PlannerItem[];onOpen:(item:PlannerItem)=>void}){return <article className=\"action-bucket\"><header>{icon}<strong>{title}</strong><span>{items.length}</span></header><div>{items.length===0?<small>Nothing here</small>:items.slice(0,4).map(item=><button key={item.id} onClick={()=>onOpen(item)}><b>{item.title}</b><span>{item.creativeDueDate?`Due ${format(parseISO(item.creativeDueDate),'d MMM')}`:`Live ${format(parseISO(item.date),'d MMM')}`}</span></button>)}</div></article>}",
  "function ActionBucket({title,icon,items,onOpen}:{title:string;icon:React.ReactNode;items:PlannerItem[];onOpen:(item:PlannerItem)=>void}){const visible=[...items].sort((a,b)=>(a.creativeDueDate??a.date).localeCompare(b.creativeDueDate??b.date)).slice(0,2);return <article className={`action-bucket ${items.length===0?'clear':''}`}><header>{icon}<strong>{title}</strong><span>{items.length}</span></header><div>{items.length===0?<small>Nothing needs attention</small>:visible.map(item=><button key={item.id} onClick={()=>onOpen(item)}><b>{item.title}</b><span>{item.creativeDueDate?`Due ${format(parseISO(item.creativeDueDate),'d MMM')}`:`Live ${format(parseISO(item.date),'d MMM')}`}</span></button>)}</div>{items.length>visible.length&&<footer>+{items.length-visible.length} more in calendar</footer>}</article>}"
);
// Clean up the redundant discriminator check caught by TypeScript in the previous optimisation pass.
source=source.replace("item.type==='campaign'&&!item.parentCampaignId&&item.type!=='strategy'","item.type==='campaign'&&!item.parentCampaignId");
fs.writeFileSync(path,source);
console.log('Performance sync injected, creative history removed, and production board compressed.');
