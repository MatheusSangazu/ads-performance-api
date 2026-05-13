import axios from 'axios';
import type { MetaApiResponse, MetaPreviewResponse } from '../types/index.js';
import { retry } from '../utils/retry.js';

const META_API_BASE = 'https://graph.facebook.com/v23.0';

export async function fetchAllInsights(
  actId: string,
  accessToken: string,
  since: string,
  until: string,
  breakdowns?: string[],
): Promise<{ data: import('../types/index.js').MetaInsight[] }> {
  const allInsights: import('../types/index.js').MetaInsight[] = [];

  let url: string | null = `${META_API_BASE}/${actId}/insights`;
  let params: Record<string, string> = {
    access_token: accessToken,
    level: 'ad',
    fields: 'ad_name,ad_id,campaign_name,campaign_id,actions,action_values,spend,reach,impressions,date_start,ctr',
    time_range: JSON.stringify({ since, until }),
    time_increment: '1',
    action_report_time: 'conversion',
    limit: '500',
  };

  if (breakdowns && breakdowns.length > 0) {
    params.breakdowns = JSON.stringify(breakdowns);
  }

  let page = 1;

  while (url) {
    const response = await retry(() =>
      axios.get<MetaApiResponse>(url!, { params }),
    );

    const insights = response.data.data || [];
    allInsights.push(...insights);

    console.log(`   📄 Página ${page}: +${insights.length} registros (total: ${allInsights.length})`);

    const nextUrl = response.data.paging?.next;
    if (nextUrl) {
      url = nextUrl;
      params = {};
      page++;
    } else {
      url = null;
    }
  }

  return { data: allInsights };
}

export async function fetchPreviewLink(
  adId: string,
  accessToken: string,
): Promise<string> {
  try {
    const res = await retry(() =>
      axios.get<MetaPreviewResponse>(`${META_API_BASE}/${adId}`, {
        params: {
          access_token: accessToken,
          fields: 'preview_shareable_link',
        },
      }),
    );
    return res.data.preview_shareable_link || '';
  } catch {
    return '';
  }
}
