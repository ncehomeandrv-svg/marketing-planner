import fs from 'node:fs';

const path='components/Planner.tsx';
let source=fs.readFileSync(path,'utf8');

const importAnchor="import OutlookConnection from '@/components/OutlookConnection';";
const importLine="import PerformanceSync from '@/components/PerformanceSync';";
if(!source.includes(importLine)){
  if(!source.includes(importAnchor))throw new Error('Performance sync import anchor not found.');
  source=source.replace(importAnchor,`${importAnchor}\n${importLine}`);
}

const priorityCondition="item.approvalStatus==='Approved'&&['Scheduled','Published'].includes(item.status)";
const segmentAnchor='<div className={`segment-strip ${segmentClass[item.segment]}`}>{item.segment} · {inferFormat(item)}</div>';
const topSync=`${segmentAnchor}\n    {item.type!=='important-date'&&${priorityCondition}&&<section className="drawer-section priority-performance"><PerformanceSync item={item} onUpdate={onUpdate}/></section>}`;
if(!source.includes('className="drawer-section priority-performance"')){
  if(!source.includes(segmentAnchor))throw new Error('Priority performance anchor not found.');
  source=source.replace(segmentAnchor,topSync);
}

const resultsAnchor='<div className="metric-grid">';
const bottomSync=`{!(${priorityCondition})&&<PerformanceSync item={item} onUpdate={onUpdate}/>}<div className="metric-grid">`;
if(!source.includes('!('+priorityCondition+')&&<PerformanceSync')){
  source=source.replace('<PerformanceSync item={item} onUpdate={onUpdate}/><div className="metric-grid">',bottomSync);
  if(!source.includes(bottomSync)){
    if(!source.includes(resultsAnchor))throw new Error('Performance results anchor not found.');
    source=source.replace(resultsAnchor,bottomSync);
  }
}

// Remove the creative history/reuse panel and its now-unused related-work lookup.
source=source.replace(/\n  const related=allItems\.filter\([^\n]+\);/, '');
source=source.replace(/\n    \{item\.type!==\'important-date\'&&related\.length>0&&<section className="drawer-section"><h4>Creative history & reuse<\/h4><p className="help-text">Previous work with the same format or linked SKU\.<\/p><div className="related-list">\{related\.map\(entry=><button key=\{entry\.id\} onClick=\{\(\)=>onUpdate\(entry\)\}><Copy size=\{15\}\/><span><b>\{entry\.title\}<\/b><small>\{format\(parseISO\(entry\.date\),\'d MMM yyyy\'\)} · \{inferFormat\(entry\)}<\/small><\/span><\/button>\)}<\/div><\/section>\}/, '');
source=source.replace('Comma-separated. Used for search, reporting and creative history.','Comma-separated. Used for search and reporting.');

// Awaiting approval means genuinely outstanding approval work only.
source=source.replace(
  "(savedView==='Awaiting approval'&&(item.approvalStatus==='Awaiting approval'||item.status==='Ready for Review'))",
  "(savedView==='Awaiting approval'&&item.approvalStatus!=='Approved'&&!['Approved','Scheduled','Published'].includes(item.status)&&(item.approvalStatus==='Awaiting approval'||item.status==='Ready for Review'||item.status==='Changes Required')&&item.date>=todayKey)"
);

// Scope the production board to the displayed month. An item belongs to this month when either its live date
// or its creative deadline is in the month, so future-publishing work with an overdue current-month deadline is visible.
source=source.replace(
  "  const overdue=items.filter(item=>item.type!=='strategy'&&!!item.creativeDueDate&&item.creativeDueDate<todayKey&&!['Approved','Scheduled','Published'].includes(item.status));\n  const dueThisWeek=items.filter(item=>item.type!=='strategy'&&!!item.creativeDueDate&&item.creativeDueDate>=todayKey&&item.creativeDueDate<=weekEndKey&&!isDone(item));\n  const approvals=items.filter(item=>item.type!=='strategy'&&(item.approvalStatus==='Awaiting approval'||item.status==='Ready for Review'));\n  const launches=items.filter(item=>item.type!=='strategy'&&item.date>=todayKey&&item.date<=weekEndKey);",
  "  const monthEndKey=format(endOfMonth(month),'yyyy-MM-dd');\n  const productionMonthItems=items.filter(item=>item.type!=='strategy'&&item.type!=='important-date'&&(item.date.startsWith(monthKey)||item.creativeDueDate?.startsWith(monthKey)));\n  const overdue=productionMonthItems.filter(item=>!!item.creativeDueDate&&item.creativeDueDate<todayKey&&item.approvalStatus!=='Approved'&&!['Approved','Scheduled','Published'].includes(item.status));\n  const dueThisMonth=productionMonthItems.filter(item=>!!item.creativeDueDate&&item.creativeDueDate.startsWith(monthKey)&&item.creativeDueDate>=todayKey&&!['Approved','Scheduled','Published'].includes(item.status));\n  const approvals=productionMonthItems.filter(item=>item.approvalStatus!=='Approved'&&!['Approved','Scheduled','Published'].includes(item.status)&&(item.approvalStatus==='Awaiting approval'||item.status==='Ready for Review'||item.status==='Changes Required')&&item.date>=todayKey);\n  const publishingThisMonth=productionMonthItems.filter(item=>item.date.startsWith(monthKey)&&item.date>=todayKey&&!['Published'].includes(item.status));\n  const futureNoteworthy=items.filter(item=>item.type==='important-date'&&item.date>monthEndKey).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);"
);

// Upgrade previously injected month logic as well.
source=source.replace(
  "  const productionMonthItems=items.filter(item=>item.type!=='strategy'&&item.type!=='important-date'&&item.date.startsWith(monthKey));\n  const overdue=productionMonthItems.filter(item=>!!item.creativeDueDate&&item.creativeDueDate<todayKey&&!['Approved','Scheduled','Published'].includes(item.status));\n  const dueThisMonth=productionMonthItems.filter(item=>!!item.creativeDueDate&&item.creativeDueDate.startsWith(monthKey)&&!isDone(item));\n  const approvals=productionMonthItems.filter(item=>item.approvalStatus==='Awaiting approval'||item.status==='Ready for Review');\n  const publishingThisMonth=productionMonthItems.filter(item=>!['Published'].includes(item.status));",
  "  const productionMonthItems=items.filter(item=>item.type!=='strategy'&&item.type!=='important-date'&&(item.date.startsWith(monthKey)||item.creativeDueDate?.startsWith(monthKey)));\n  const overdue=productionMonthItems.filter(item=>!!item.creativeDueDate&&item.creativeDueDate<todayKey&&item.approvalStatus!=='Approved'&&!['Approved','Scheduled','Published'].includes(item.status));\n  const dueThisMonth=productionMonthItems.filter(item=>!!item.creativeDueDate&&item.creativeDueDate.startsWith(monthKey)&&item.creativeDueDate>=todayKey&&!['Approved','Scheduled','Published'].includes(item.status));\n  const approvals=productionMonthItems.filter(item=>item.approvalStatus!=='Approved'&&!['Approved','Scheduled','Published'].includes(item.status)&&(item.approvalStatus==='Awaiting approval'||item.status==='Ready for Review'||item.status==='Changes Required')&&item.date>=todayKey);\n  const publishingThisMonth=productionMonthItems.filter(item=>item.date.startsWith(monthKey)&&item.date>=todayKey&&!['Published'].includes(item.status));"
);

const originalBoard='<section className="action-board"><div className="action-board-head"><div><span>PRODUCTION BOARD</span><h3>Today & next 7 days</h3></div><small>Creative deadlines are tracked separately from launch dates.</small></div><div className="action-board-grid"><ActionBucket title="Overdue" icon={<AlertTriangle size={17}/>} items={overdue} onOpen={setSelected}/><ActionBucket title="Due this week" icon={<CalendarDays size={17}/>} items={dueThisWeek} onOpen={setSelected}/><ActionBucket title="Awaiting approval" icon={<CheckCircle2 size={17}/>} items={approvals} onOpen={setSelected}/><ActionBucket title="Launching this week" icon={<FolderKanban size={17}/>} items={launches} onOpen={setSelected}/></div></section>';
const compactBoard='<section className="action-board compact-action-board"><div className="action-board-head"><div><span>PRODUCTION BOARD</span><h3>{format(month,\'MMMM yyyy\')}</h3></div><small>Only work in the selected month is shown here. The calendar remains the full source of detail.</small></div><div className="action-board-grid"><ActionBucket title="Overdue" icon={<AlertTriangle size={17}/>} items={overdue} onOpen={setSelected}/><ActionBucket title="Due this month" icon={<CalendarDays size={17}/>} items={dueThisMonth} onOpen={setSelected}/><ActionBucket title="Awaiting approval" icon={<CheckCircle2 size={17}/>} items={approvals} onOpen={setSelected}/><ActionBucket title="Publishing this month" icon={<FolderKanban size={17}/>} items={publishingThisMonth} onOpen={setSelected}/></div><UpcomingDates items={futureNoteworthy} onOpen={setSelected}/></section>';
source=source.replace(originalBoard,compactBoard);

const oldBucket="function ActionBucket({title,icon,items,onOpen}:{title:string;icon:React.ReactNode;items:PlannerItem[];onOpen:(item:PlannerItem)=>void}){return <article className=\"action-bucket\"><header>{icon}<strong>{title}</strong><span>{items.length}</span></header><div>{items.length===0?<small>Nothing here</small>:items.slice(0,4).map(item=><button key={item.id} onClick={()=>onOpen(item)}><b>{item.title}</b><span>{item.creativeDueDate?`Due ${format(parseISO(item.creativeDueDate),'d MMM')}`:`Live ${format(parseISO(item.date),'d MMM')}`}</span></button>)}</div></article>}";
const newBucket="function ActionBucket({title,icon,items,onOpen}:{title:string;icon:React.ReactNode;items:PlannerItem[];onOpen:(item:PlannerItem)=>void}){const visible=[...items].sort((a,b)=>(a.creativeDueDate??a.date).localeCompare(b.creativeDueDate??b.date)).slice(0,2);return <article className={`action-bucket ${items.length===0?'clear':''}`}><header>{icon}<strong>{title}</strong><span>{items.length}</span></header><div>{items.length===0?<small>Nothing needs attention</small>:visible.map(item=><button key={item.id} onClick={()=>onOpen(item)}><b>{item.title}</b><span>{item.creativeDueDate?`Due ${format(parseISO(item.creativeDueDate),'d MMM')}`:`Live ${format(parseISO(item.date),'d MMM')}`}</span></button>)}</div>{items.length>visible.length&&<footer>+{items.length-visible.length} more in calendar</footer>}</article>}\nfunction UpcomingDates({items,onOpen}:{items:PlannerItem[];onOpen:(item:PlannerItem)=>void}){return <div className=\"future-planning\"><div className=\"future-planning-head\"><span>FUTURE PLANNING</span><strong>Upcoming noteworthy dates</strong><small>Key moments beyond this month — not future content tickets.</small></div><div className=\"future-date-row\">{items.length===0?<small>No noteworthy dates added yet.</small>:items.map(item=><button key={item.id} onClick={()=>onOpen(item)}><b>{format(parseISO(item.date),'d MMM')}</b><span>{item.title}</span></button>)}</div></div>}";
source=source.replace(oldBucket,newBucket);

// Clean up the redundant discriminator check caught by TypeScript in the previous optimisation pass.
source=source.replace("item.type==='campaign'&&!item.parentCampaignId&&item.type!=='strategy'","item.type==='campaign'&&!item.parentCampaignId");
fs.writeFileSync(path,source);
console.log('Planner approval, overdue, production board and performance priority UI injected.');
