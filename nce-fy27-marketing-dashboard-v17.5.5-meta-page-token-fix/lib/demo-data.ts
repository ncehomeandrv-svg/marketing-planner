import { addDays, endOfMonth, format, getDay } from 'date-fns';
import type { Channel, PlannerItem, Quarter, Segment } from './types';

const important = (
  id:string,
  title:string,
  date:string,
  description:string,
  options:Partial<PlannerItem> = {}
):PlannerItem => ({
  id,
  title,
  type:'important-date',
  date,
  channel:'Other',
  segment:'Retail',
  status:'Scheduled',
  owner:'Kieren',
  accountable:'Jenna',
  approver:'Jenna',
  approvalStatus:'Not required',
  description,
  priority:'Normal',
  source:'Retail Calendar',
  ...options
});

const retailDates:PlannerItem[] = [
  important('jul-fy27','Start of FY27','2026-07-01','New financial year messaging, new pricing and catalogue updates.',{priority:'High',quarter:'Q1'}),
  important('jul-eofy-extension','EOFY Sale Extension','2026-07-02','Early July final clearance and “last chance” campaign window.',{endDate:'2026-07-10',priority:'High',quarter:'Q1'}),
  important('jul-winter-sales','Winter Sales','2026-07-01','Throughout July: heating, indoor appliances, entertainment and clearance.',{endDate:'2026-07-31',quarter:'Q1'}),
  important('jul-xmas','Christmas in July','2026-07-01','Throughout July: bundles, entertaining and cooking campaigns.',{endDate:'2026-07-31',quarter:'Q1'}),
  important('jul-prime','Amazon Prime Day Period — Date TBC','2026-07-15','Planning marker for the July Prime Day period. Expect increased online price comparison and discount activity.',{quarter:'Q1'}),
  important('jul-friendship','International Friendship Day','2026-07-30','Lower-priority organic social content opportunity.',{priority:'Low',quarter:'Q1'}),

  important('aug-spring-prep','Spring Campaign Preparation Begins','2026-08-01','Prepare outdoor, travel and caravan-season creative.',{priority:'High',quarter:'Q1'}),
  important('aug-launches','Spring Product Launches','2026-08-01','Throughout August: new-season product introductions.',{endDate:'2026-08-31',quarter:'Q1'}),
  important('aug-afterpay','Afterpay Day — Date TBC','2026-08-15','Planning marker for the August event. Strong promotional opportunity for appliances and higher-value products.',{priority:'High',quarter:'Q1'}),
  important('aug-fathers-buying','Father’s Day Buying Period','2026-08-24','Late-August gift guides for cooking, entertainment and outdoor products.',{endDate:'2026-09-06',priority:'High',quarter:'Q1'}),

  important('sep-spring','First Day of Spring','2026-09-01','Spring sale and outdoor-living campaign.',{priority:'High',quarter:'Q1'}),
  important('sep-fathers','Father’s Day','2026-09-06','Major gift and promotional opportunity.',{priority:'Urgent',quarter:'Q1'}),
  important('sep-afl-holiday','Friday Before AFL Grand Final','2026-09-25','Victorian public holiday; AFL and long-weekend messaging.',{priority:'High',quarter:'Q1'}),
  important('sep-afl-final','Expected AFL Grand Final Weekend','2026-09-26','BBQ, TV, outdoor entertaining and travel campaigns.',{priority:'High',quarter:'Q1'}),
  important('sep-school-holidays','Victorian School Holidays','2026-09-21','Late-September caravan, camping and family travel demand.',{endDate:'2026-10-04',quarter:'Q1'}),

  important('oct-q4','Christmas Quarter Begins','2026-10-01','Christmas campaign and stock-readiness checkpoint.',{priority:'High',quarter:'Q2'}),
  important('oct-labour-interstate','Labour Day — Several States','2026-10-05','Interstate long-weekend promotions; not a Victorian holiday.',{priority:'Low',quarter:'Q2'}),
  important('oct-daylight','Daylight Saving Begins','2026-10-04','Summer, outdoor and travel messaging.',{quarter:'Q2'}),
  important('oct-prime-big','Amazon Prime Big Deal Days — Date TBC','2026-10-13','Planning marker for the competitive online sales period.',{quarter:'Q2'}),
  important('oct-halloween','Halloween','2026-10-31','Mainly useful for organic social content and selected retail categories.',{priority:'Low',quarter:'Q2'}),

  important('nov-cup','Melbourne Cup Day','2026-11-03','Victorian public holiday; promotional or store-hours messaging.',{priority:'High',quarter:'Q2'}),
  important('nov-singles','Singles’ Day','2026-11-11','Online promotion opportunity.',{quarter:'Q2'}),
  important('nov-click','Click Frenzy Main Event — Date TBC','2026-11-17','Planning marker for the major Australian ecommerce sale.',{priority:'High',quarter:'Q2'}),
  important('nov-black','Black Friday','2026-11-27','One of the most important retail dates of FY27.',{priority:'Urgent',quarter:'Q2'}),
  important('nov-cyber','Cyber Monday','2026-11-30','Online-focused continuation of Black Friday.',{priority:'Urgent',quarter:'Q2'}),
  important('nov-shipping','Christmas Shipping Campaign Begins','2026-11-23','Publish order and delivery cut-offs.',{priority:'High',quarter:'Q2'}),

  important('dec-summer','First Day of Summer','2026-12-01','Summer road-trip, caravan and outdoor campaigns.',{priority:'High',quarter:'Q2'}),
  important('dec-cutoffs','Christmas Delivery Cut-offs Begin','2026-12-01','Separate metro, regional and bulky-freight dates.',{endDate:'2026-12-18',priority:'Urgent',quarter:'Q2'}),
  important('dec-two-weeks','Two Weeks Before Christmas','2026-12-11','Urgency and “order now” messaging.',{priority:'High',quarter:'Q2'}),
  important('dec-last-sat','Final Saturday Before Christmas','2026-12-19','Important last-minute retail weekend.',{priority:'High',quarter:'Q2'}),
  important('dec-eve','Christmas Eve','2026-12-24','Reduced hours and final collection messaging.',{quarter:'Q2'}),
  important('dec-day','Christmas Day','2026-12-25','Victorian public holiday.',{priority:'High',quarter:'Q2'}),
  important('dec-boxing','Boxing Day','2026-12-26','Major clearance and promotional event.',{priority:'Urgent',quarter:'Q2'}),
  important('dec-boxing-additional','Additional Boxing Day Public Holiday','2026-12-28','Victorian public holiday.',{quarter:'Q2'}),
  important('dec-nye','New Year’s Eve','2026-12-31','Clearance and summer-event messaging.',{quarter:'Q2'}),

  important('jan-new-year','New Year’s Day','2027-01-01','Public holiday and New Year sale.',{priority:'High',quarter:'Q3'}),
  important('jan-holidays','Summer Holiday Period','2027-01-02','Early-January caravan, camping, cooling and entertainment demand.',{endDate:'2027-01-24',quarter:'Q3'}),
  important('jan-back-school','Back-to-School Buying Period','2027-01-04','Throughout January. Useful for general retail; lower priority for NCE.',{endDate:'2027-01-27',priority:'Low',quarter:'Q3'}),
  important('jan-aus','Australia Day','2027-01-26','Public holiday; summer, BBQ and outdoor-living promotion.',{priority:'High',quarter:'Q3'}),
  important('jan-term','Victorian Term 1 Begins','2027-01-27','End of summer-school-holiday campaign.',{quarter:'Q3'}),

  important('feb-lunar','Lunar New Year','2027-02-06','Relevant for multicultural audiences and selected campaigns.',{quarter:'Q3'}),
  important('feb-valentine','Valentine’s Day','2027-02-14','Gift, lifestyle and organic social campaign opportunity.',{priority:'Low',quarter:'Q3'}),
  important('feb-autumn-prep','Autumn Campaign Preparation','2027-02-22','Late-February shift toward cooler-weather travel and appliances.',{quarter:'Q3'}),

  important('mar-autumn','First Day of Autumn','2027-03-01','Seasonal campaign change.',{priority:'High',quarter:'Q3'}),
  important('mar-labour','Labour Day — Victoria','2027-03-08','Public holiday and long-weekend promotion.',{priority:'High',quarter:'Q3'}),
  important('mar-women','International Women’s Day','2027-03-08','Corporate, staff and organic social content.',{priority:'Low',quarter:'Q3'}),
  important('mar-afterpay','Afterpay Day — Date TBC','2027-03-15','Planning marker for the major ecommerce promotion.',{priority:'High',quarter:'Q3'}),
  important('mar-good-friday','Good Friday','2027-03-26','Victorian public holiday.',{priority:'High',quarter:'Q3'}),
  important('mar-easter-sat','Saturday Before Easter Sunday','2027-03-27','Victorian public holiday.',{quarter:'Q3'}),
  important('mar-easter','Easter Sunday','2027-03-28','Victorian public holiday.',{quarter:'Q3'}),
  important('mar-easter-mon','Easter Monday','2027-03-29','Victorian public holiday.',{quarter:'Q3'}),
  important('mar-travel','Easter Travel Period','2027-03-20','Late-March caravan, camping and road-trip opportunity.',{endDate:'2027-03-29',priority:'Urgent',quarter:'Q3'}),

  important('apr-school','Easter and School Holiday Period','2027-04-01','Early-April travel, replacement appliance and outdoor-product demand.',{endDate:'2027-04-11',priority:'High',quarter:'Q4'}),
  important('apr-earth','Earth Day','2027-04-22','Sustainability and efficient-product content.',{priority:'Low',quarter:'Q4'}),
  important('apr-anzac','Anzac Day','2027-04-25','Restricted promotional tone recommended.',{priority:'High',quarter:'Q4'}),
  important('apr-substitute','Possible Substitute/Public Holiday Arrangements','2027-04-26','Confirm operating requirements closer to the date.',{quarter:'Q4'}),
  important('apr-mothers','Mother’s Day Campaign Begins','2027-04-26','Late-April gift guide and promotional launch.',{priority:'High',quarter:'Q4'}),

  important('may-final-week','Mother’s Day Final Campaign Week','2027-05-01','Increase urgency and remarketing.',{endDate:'2027-05-09',priority:'High',quarter:'Q4'}),
  important('may-mothers','Mother’s Day','2027-05-09','Major gift and lifestyle opportunity.',{priority:'Urgent',quarter:'Q4'}),
  important('may-click','Click Frenzy Mayhem — Date TBC','2027-05-18','Planning marker for a potential mid-year online sale.',{quarter:'Q4'}),
  important('may-eofy-prep','EOFY Campaign Preparation','2027-05-17','Mid-to-late May: finalise offers, stock and creative.',{endDate:'2027-05-30',priority:'High',quarter:'Q4'}),
  important('may-countdown','EOFY Countdown Begins','2027-05-31','“30 days remaining” campaign.',{priority:'Urgent',quarter:'Q4'}),

  important('jun-winter','First Day of Winter','2027-06-01','Winter and indoor-living campaigns.',{priority:'High',quarter:'Q4'}),
  important('jun-eofy','EOFY Sale Launch','2027-06-01','Major retail campaign period.',{endDate:'2027-06-30',priority:'Urgent',quarter:'Q4'}),
  important('jun-kings','King’s Birthday — Victoria','2027-06-14','Public holiday and long-weekend promotion.',{priority:'High',quarter:'Q4'}),
  important('jun-freight','Final Freight/Order Cut-off for FY27','2027-06-16','Important for B2B invoicing and dispatch.',{priority:'Urgent',quarter:'Q4'}),
  important('jun-final-weekend','Final Weekend Before EOFY','2027-06-25','Strong urgency campaign.',{priority:'Urgent',quarter:'Q4'}),
  important('jun-end','End of FY27','2027-06-30','Final-day sale, invoicing and stocktake messaging.',{priority:'Urgent',quarter:'Q4'}),
];

function nthWeekday(year:number, monthIndex:number, weekday:number, nth:number):Date {
  const first = new Date(year, monthIndex, 1);
  const delta = (weekday - getDay(first) + 7) % 7;
  return addDays(first, delta + (nth - 1) * 7);
}

function quarterFor(date:Date):Quarter {
  const year=date.getFullYear();
  const monthIndex=date.getMonth();
  if(year===2026 && monthIndex>=6 && monthIndex<=8) return 'Q1';
  if(year===2026 && monthIndex>=9 && monthIndex<=11) return 'Q2';
  if(year===2027 && monthIndex>=0 && monthIndex<=2) return 'Q3';
  return 'Q4';
}

function contentItem(
  id:string,
  title:string,
  date:Date,
  channel:Channel,
  segment:Segment,
  description:string,
  priority:'Low'|'Normal'|'High'|'Urgent'='Normal'
):PlannerItem {
  return {
    id,
    title,
    type:'campaign',
    date:format(date,'yyyy-MM-dd'),
    channel,
    segment,
    status:'Brief Required',
    owner:'Kieren',
    briefOwner:'Jenna',
    assetCreator:'Kieren',
    accountable:'Jenna',
    approver:'Jenna',
    publisher:'Kieren',
    approvalStatus:'Awaiting approval',
    description,
    priority,
    quarter:quarterFor(date),
    cadence:'Monthly content plan',
    source:'Monthly Content Plan',
    attachments:[]
  };
}

function monthlyContent(year:number, monthIndex:number):PlannerItem[] {
  const monthName=format(new Date(year,monthIndex,1),'MMMM yyyy');
  const code=format(new Date(year,monthIndex,1),'yyyy-MM');
  const items:PlannerItem[]=[];

  items.push({
    id:`${code}-kickoff`,title:`${monthName} Content & Campaign Kick-off`,type:'ticket',date:`${code}-01`,channel:'Operations',segment:'Multiple',status:'Brief Required',owner:'Kieren',briefOwner:'Jenna',assetCreator:'Kieren',accountable:'Jenna',approver:'Jenna',publisher:'Kieren',approvalStatus:'Awaiting approval',priority:'High',quarter:quarterFor(new Date(year,monthIndex,1)),source:'Monthly Content Plan',attachments:[],
    description:'Jenna uploads the month’s briefs and supporting documents here. Kieren then creates and uploads EDM, social and campaign assets for revision and approval. Confirm offers, stock, freight considerations, owners and approval deadlines before production starts.'
  });

  for(let i=1;i<=4;i++){
    const retail=nthWeekday(year,monthIndex,3,i);
    const social=nthWeekday(year,monthIndex,5,i);
    const linkedin=nthWeekday(year,monthIndex,2,i);
    items.push(contentItem(`${code}-retail-edm-${i}`,`Retail EDM ${i} of 4`,retail,'Email','Retail',`Weekly retail EDM for ${monthName}. Upload copy, creative, links and test proofs for revision and approval before deployment.`,'High'));
    items.push(contentItem(`${code}-social-${i}`,`Organic Social Post ${i} of 4`,social,'Organic','Retail',`Weekly organic social post for ${monthName}. Attach final artwork/video, caption and platform notes for approval.`));
    const linkedInItem=contentItem(`${code}-linkedin-${i}`,`LinkedIn Post ${i} of 4`,linkedin,'LinkedIn','Multiple',`Weekly LinkedIn post for ${monthName}, mapped to the FY27 content pillars. Jenna owns the brief and approval. Kieren creates the assets, and Jenna publishes the approved post.`);
    linkedInItem.briefOwner='Jenna'; linkedInItem.assetCreator='Kieren'; linkedInItem.owner='Kieren'; linkedInItem.accountable='Jenna'; linkedInItem.approver='Jenna'; linkedInItem.publisher='Jenna'; linkedInItem.approvalStatus='Awaiting approval';
    items.push(linkedInItem);
  }

  items.push(contentItem(`${code}-dealer-edm-1`,`Dealer & Repairer EDM 1 of 2`,nthWeekday(year,monthIndex,2,1),'Email','Dealer',`First monthly dealer and repairer EDM for ${monthName}. Attach the brief, product content, flyer or landing-page links and test proof.`,'High'));
  items.push(contentItem(`${code}-dealer-edm-2`,`Dealer & Repairer EDM 2 of 2`,nthWeekday(year,monthIndex,2,3),'Email','Repairer',`Second monthly dealer and repairer EDM for ${monthName}. Attach the brief, product content, flyer or landing-page links and test proof.`,'High'));
  items.push(contentItem(`${code}-commercial-edm`,`Commercial EDM`,nthWeekday(year,monthIndex,4,2),'Email','Commercial',`Monthly commercial EDM for ${monthName}. Use spec-led messaging, availability and account-support proof. Attach all documents for revision and approval.`,'High'));
  items.push(contentItem(`${code}-oem-edm`,`OEM / Trade EDM`,nthWeekday(year,monthIndex,4,4),'Email','OEM',`Monthly OEM/trade operational EDM for ${monthName}, focused on reorder, supply, availability or production support. Attach all documents for approval.`,'High'));

  let blogNumber=1;
  for(let blogDate=nthWeekday(year,monthIndex,5,1);blogDate.getMonth()===monthIndex;blogDate=addDays(blogDate,7)){
    const blogItem=contentItem(`${code}-blog-${blogNumber}`,`Blog ${blogNumber}`,blogDate,'Website','Retail',`Weekly NCE blog for ${monthName}. Kieren owns the brief, research, writing, page build and publication. No approval is required.`);
    blogItem.briefOwner='Kieren'; blogItem.assetCreator='Kieren'; blogItem.owner='Kieren'; blogItem.accountable='Kieren'; blogItem.approver='Kieren'; blogItem.publisher='Kieren'; blogItem.approvalStatus='Not required';
    items.push(blogItem); blogNumber++;
  }

  // Two Commercial blogs per month. Kieren owns the full workflow and no approval is required.
  const b2bBlogs:[string,string,Date,Segment,string][]=[
    [`${code}-commercial-blog-1`,`Commercial Blog 1 of 2`,nthWeekday(year,monthIndex,1,1),'Commercial',`First commercial blog for ${monthName}. Focus on specification-led information, project applications, availability or commercial support.`],
    [`${code}-commercial-blog-2`,`Commercial Blog 2 of 2`,nthWeekday(year,monthIndex,1,3),'Commercial',`Second commercial blog for ${monthName}. Focus on specification-led information, project applications, availability or commercial support.`]
  ];
  for(const [id,title,date,blogSegment,description] of b2bBlogs){
    const blogItem=contentItem(id,title,date,'Website',blogSegment,`${description} Kieren owns the brief, research, writing, page build and publication. No approval is required.`);
    blogItem.briefOwner='Kieren'; blogItem.assetCreator='Kieren'; blogItem.owner='Kieren'; blogItem.accountable='Kieren'; blogItem.approver='Kieren'; blogItem.publisher='Kieren'; blogItem.approvalStatus='Not required';
    items.push(blogItem);
  }

  return items.filter(item=>new Date(`${item.date}T00:00:00`)<=endOfMonth(new Date(year,monthIndex,1)));
}

const recurringContent:PlannerItem[]=[];
for(const [year,monthIndex] of [[2026,7],[2026,8],[2026,9],[2026,10],[2026,11],[2027,0],[2027,1],[2027,2],[2027,3],[2027,4],[2027,5]] as const){
  recurringContent.push(...monthlyContent(year,monthIndex));
}

export const demoItems:PlannerItem[]=[...retailDates,...recurringContent];
