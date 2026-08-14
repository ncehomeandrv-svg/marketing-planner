export type Channel = 'Email'|'Organic'|'LinkedIn'|'Website'|'Print'|'Video'|'Research'|'Operations'|'Other';
export type Segment = 'OEM'|'Dealer'|'Retail'|'Repairer'|'Commercial'|'Multiple';
export type Status = 'Brief Required'|'Brief Ready'|'In Production'|'Ready for Review'|'Changes Required'|'Approved'|'Scheduled'|'Published'|'Blocked';
export type ApprovalStatus = 'Not required'|'Awaiting approval'|'Changes requested'|'Approved';
export type ItemType = 'campaign'|'ticket'|'important-date'|'strategy';
export type Priority = 'Low'|'Normal'|'High'|'Urgent';
export type Quarter = 'Q1'|'Q2'|'Q3'|'Q4';

export interface Attachment {
  id:string;
  name:string;
  size:number;
  type:string;
  uploadedAt:string;
  downloadUrl?:string;
}

export interface SharedPreviewRecord {
  id:string;
  url:string;
  fileName:string;
  mediaUrls?:string[];
  uploadedAt:string;
}

export interface MetaMediaAsset {
  id:string;
  url:string;
  fileName:string;
  type:string;
  size:number;
  uploadedAt:string;
}


export interface PlannerComment {
  id:string;
  itemId:string;
  author:string;
  message:string;
  kind:'Comment'|'Change request';
  createdAt:string;
  resolvedAt?:string;
  resolvedBy?:string;
}

export interface PlannerNotification {
  id:string;
  person:string;
  itemId?:string;
  title:string;
  message:string;
  createdAt:string;
  readAt?:string;
  link?:string;
}

export interface PublishFailure {
  id:string;
  channel:'Meta'|'LinkedIn'|'Dotdigital'|'Outlook';
  itemId?:string;
  title:string;
  message:string;
  payload?:Record<string,unknown>;
  endpoint?:string;
  createdAt:string;
  resolvedAt?:string;
  retryCount?:number;
}

export interface PlannerItem {
  id:string;
  title:string;
  type:ItemType;
  date:string;
  endDate?:string;
  channel:Channel;
  segment:Segment;
  status:Status;
  owner:string;
  briefOwner?:string;
  assetCreator?:string;
  accountable?:string;
  approver?:string;
  publisher?:string;
  approvalStatus?:ApprovalStatus;
  description:string;
  priority:Priority;
  quarter?:Quarter;
  strategyCode?:string;
  cadence?:string;
  source?:'FY27 Strategy'|'Retail Calendar'|'Monthly Content Plan';
  attachments?:Attachment[];
  dotdigitalCampaignId?:number;
  dotdigitalCampaignName?:string;
  dotdigitalAudienceIds?:number[];
  dotdigitalAudienceKeys?:string[];
  dotdigitalTestEmails?:string;
  dotdigitalSendId?:string;
  dotdigitalSendStatus?:string;
  dotdigitalScheduledAt?:string;
  metaPlatforms?:string[];
  metaCaption?:string;
  metaMediaUrl?:string;
  metaMediaUrls?:string[];
  metaMediaAssets?:MetaMediaAsset[];
  metaPostType?:'image'|'carousel'|'video';
  metaSourceUrl?:string;
  metaLinkUrl?:string;
  metaScheduledAt?:string;
  metaJobId?:string;
  metaStatus?:string;
  linkedinCaption?:string;
  linkedinMediaUrls?:string[];
  linkedinWebsiteUrl?:string;
  linkedinSourceUrl?:string;
  linkedinScheduledAt?:string;
  linkedinJobId?:string;
  linkedinStatus?:string;
  sharedPreviewId?:string;
  sharedPreviewUrl?:string;
  sharedPreviewFileName?:string;
  sharedPreviews?:SharedPreviewRecord[];
}

export interface StrategyPillar {
  code:string;
  title:string;
  floor:string;
  owner:string;
  executor:string;
  cadence:string;
}
