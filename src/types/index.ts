export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaInsight {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  campaign_id: string;
  date_start: string;
  reach?: string;
  impressions?: string;
  spend?: string;
  ctr?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
}

export interface MetaApiPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
}

export interface MetaApiResponse {
  data: MetaInsight[];
  paging?: MetaApiPaging;
}

export interface MetaPreviewResponse {
  preview_shareable_link: string;
  id: string;
}

export interface SyncResult {
  success: boolean;
  records: number;
  errors: number;
  details: string[];
}
