export const MELBOURNE_TIME_ZONE='Australia/Melbourne';

function partsAt(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Object.fromEntries(parts.map(part=>[part.type,part.value]));
}

export function melbourneLocalToUtc(value:string){
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if(!match) return new Date(NaN);
  const year=Number(match[1]);const month=Number(match[2]);const day=Number(match[3]);const hour=Number(match[4]);const minute=Number(match[5]);
  const target=Date.UTC(year,month-1,day,hour,minute,0);
  let guess=target;
  for(let i=0;i<3;i+=1){
    const p=partsAt(new Date(guess),MELBOURNE_TIME_ZONE);
    const represented=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute),Number(p.second));
    guess+=target-represented;
  }
  return new Date(guess);
}

export function utcToMelbourneInput(value?:string){
  if(!value) return '';
  const p=partsAt(new Date(value),MELBOURNE_TIME_ZONE);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function formatMelbourne(value:string|Date,options:Intl.DateTimeFormatOptions={dateStyle:'medium',timeStyle:'short'}){
  return new Intl.DateTimeFormat('en-AU',{timeZone:MELBOURNE_TIME_ZONE,...options}).format(typeof value==='string'?new Date(value):value);
}
