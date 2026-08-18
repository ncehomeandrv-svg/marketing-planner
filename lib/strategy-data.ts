import type { StrategyPillar } from './types';

export const strategyPillars: StrategyPillar[] = [
  {code:'NN1',title:'Segment EDM Engine',floor:'Always-on lifecycle EDM per segment. Welcome, re-engagement and post-purchase journeys; no segment goes dark.',owner:'Jenna',executor:'Kieren',cadence:'Lifecycle / segment'},
  {code:'NN2',title:'Always-On Social',floor:'1–2 posts each week with LinkedIn mandatory weekly, mapped to the FY27 content pillars.',owner:'Jenna / Kieren',executor:'Jenna: LinkedIn · Kieren: IG/FB',cadence:'1–2 per week'},
  {code:'NN3',title:'Review-Generation Engine',floor:'Customer Service asks every eligible customer and an automated product-review trigger runs after every purchase.',owner:'Olga',executor:'Olga / CS + Kieren trigger',cadence:'Every purchase'},
  {code:'NN4',title:'Content Production Supply Line',floor:'Monthly product or brand shoot, quarterly lifestyle shoot and output-based UGC creators aligned to NPD and the campaign calendar.',owner:'Jenna',executor:'Kieren',cadence:'Monthly + quarterly'},
  {code:'NN5',title:'Measurement & Competitor Discipline',floor:'Monthly outcome report and quarterly competitor scan, beginning with the Q1 Consumer / OEM / Trade brand-sentiment baseline.',owner:'Jenna',executor:'Kieren',cadence:'Monthly + quarterly'}
];

export const quarterFocus = {
  Q1:{label:'REVIEW',range:'Jul – Sep 2026',text:'Structure the engines, establish the baseline and rebuild core lifecycle journeys.'},
  Q2:{label:'RESET',range:'Oct – Dec 2026',text:'Test products and creative faster while building peak-season conversion momentum.'},
  Q3:{label:'REBUILD',range:'Jan – Mar 2027',text:'Scale always-on acquisition, post-purchase activity and seasonal retail campaigns.'},
  Q4:{label:'EXECUTE',range:'Apr – Jun 2027',text:'Expand full-price range activity, commercial support and EOFY execution.'}
} as const;
