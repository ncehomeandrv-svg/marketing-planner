import fs from 'node:fs';

const path='components/Planner.tsx';
let source=fs.readFileSync(path,'utf8');

// Keep per-item saves in call order. The planner writes whole card objects, so allowing
// multiple PUTs for the same card to complete out of order can restore stale state.
const queueAnchor="  const reviewDeepLinkHandled=useRef(false);";
if(!source.includes('const itemSaveQueues=useRef(new Map<string,Promise<void>>());')){
  if(!source.includes(queueAnchor)) throw new Error('Review stability anchor not found.');
  source=source.replace(queueAnchor,`${queueAnchor}\n  const itemSaveQueues=useRef(new Map<string,Promise<void>>());`);
}

const oldSave="    try{const response=await fetch('/api/drafts',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});const body=await response.json();setSaveState(body.configured?'saved':'local');}catch{setSaveState('local')}";
const newSave="    const prior=itemSaveQueues.current.get(updated.id)??Promise.resolve();const queued=prior.catch(()=>{}).then(async()=>{const response=await fetch('/api/drafts',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to save card');setSaveState(body.configured?'saved':'local')});itemSaveQueues.current.set(updated.id,queued);try{await queued}catch{setSaveState('local')}finally{if(itemSaveQueues.current.get(updated.id)===queued)itemSaveQueues.current.delete(updated.id)}";
if(source.includes(oldSave)) source=source.replace(oldSave,newSave);
else if(!source.includes(newSave)) throw new Error('Planner save block not found.');

// Workflow stage and approval status are two views of the same review decision. Keep
// them synchronised so a Changes requested card cannot remain in Ready for Review.
const oldPatch="  const patch=(changes:Partial<PlannerItem>)=>{const normalizedChanges=changes.status==='Changes Required'?{...changes,approvalStatus:'Changes requested' as ApprovalStatus}:changes;onUpdate({...item,...normalizedChanges})};";
const newPatch="  const patch=(changes:Partial<PlannerItem>)=>{let normalizedChanges:Partial<PlannerItem>={...changes};if(changes.status==='Changes Required')normalizedChanges={...normalizedChanges,approvalStatus:'Changes requested' as ApprovalStatus};if(changes.status==='Ready for Review')normalizedChanges={...normalizedChanges,approvalStatus:'Awaiting approval' as ApprovalStatus};if(changes.status==='Approved')normalizedChanges={...normalizedChanges,approvalStatus:'Approved' as ApprovalStatus};if(changes.approvalStatus==='Changes requested')normalizedChanges={...normalizedChanges,status:'Changes Required' as Status};if(changes.approvalStatus==='Awaiting approval'&&item.status==='Changes Required')normalizedChanges={...normalizedChanges,status:'Ready for Review' as Status};if(changes.approvalStatus==='Approved'&&!['Scheduled','Published'].includes(item.status))normalizedChanges={...normalizedChanges,status:'Approved' as Status};onUpdate({...item,...normalizedChanges})};";
if(source.includes(oldPatch)) source=source.replace(oldPatch,newPatch);
else if(!source.includes(newPatch)) throw new Error('Detail drawer patch helper not found.');

// Campaign-child buttons are navigation, not edits. Previously they called onUpdate,
// which could save the child card simply by clicking it and, after selection hardening,
// would not reliably open it. Give the drawer an explicit navigation callback.
source=source.replace(
  "<DetailDrawer item={selected} allItems={items} currentPerson={currentPerson} onClose={()=>setSelected(null)} onUpdate={updateItem} onDuplicate={duplicateItem} onDelete={deleteItem}/>",
  "<DetailDrawer item={selected} allItems={items} currentPerson={currentPerson} onClose={()=>setSelected(null)} onUpdate={updateItem} onSelect={setSelected} onDuplicate={duplicateItem} onDelete={deleteItem}/>"
);
source=source.replace(
  "function DetailDrawer({item,allItems,currentPerson,onClose,onUpdate,onDuplicate,onDelete}:{item:PlannerItem;allItems:PlannerItem[];currentPerson:string;onClose:()=>void;onUpdate:(item:PlannerItem)=>void;onDuplicate:(item:PlannerItem)=>void;onDelete:(item:PlannerItem)=>void}){",
  "function DetailDrawer({item,allItems,currentPerson,onClose,onUpdate,onSelect,onDuplicate,onDelete}:{item:PlannerItem;allItems:PlannerItem[];currentPerson:string;onClose:()=>void;onUpdate:(item:PlannerItem)=>void;onSelect:(item:PlannerItem)=>void;onDuplicate:(item:PlannerItem)=>void;onDelete:(item:PlannerItem)=>void}){"
);
source=source.replace("onClick={()=>onUpdate(child)}","onClick={()=>onSelect(child)}");

fs.writeFileSync(path,source);
console.log('Review statuses stay aligned, card saves are serialized, and child-card navigation is side-effect free.');
