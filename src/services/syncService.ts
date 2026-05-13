import prisma from '../config/db.js';
import axios from 'axios';

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaInsight {
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

interface MetaApiResponse {
  data: MetaInsight[];
}

interface MetaPreviewResponse {
  preview_shareable_link: string;
  id: string;
}

class SyncService {
  private previewCache: Map<string, string> = new Map();

  private async getPreviewLink(adId: string, accessToken: string): Promise<string> {
    if (this.previewCache.has(adId)) return this.previewCache.get(adId)!;

    try {
      const res = await axios.get<MetaPreviewResponse>(`https://graph.facebook.com/v23.0/${adId}`, {
        params: {
          access_token: accessToken,
          fields: 'preview_shareable_link'
        }
      });

      const link = res.data.preview_shareable_link || '';
      this.previewCache.set(adId, link);
      return link;
    } catch {
      return '';
    }
  }

  private splitDates(since: string, until: string) {
    const chunks = [];
    const [sYear, sMonth, sDay] = since.split('-').map(Number);
    const [uYear, uMonth, uDay] = until.split('-').map(Number);
    let start = new Date(sYear!, sMonth! - 1, sDay!);
    const endLimit = new Date(uYear!, uMonth! - 1, uDay!);

    while (start <= endLimit) {
      let endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      let chunkEnd = endOfMonth > endLimit ? endLimit : endOfMonth;
      const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      chunks.push({ start: formatDate(start), end: formatDate(chunkEnd) });
      start = new Date(chunkEnd.getFullYear(), chunkEnd.getMonth(), chunkEnd.getDate() + 1);
    }
    return chunks;
  }

  public async syncAccount(actId: string, dateSince: string, dateUntil: string) {
    const client = await prisma.client.findUnique({ where: { actId } });
    if (!client) throw new Error(`Cliente ${actId} não encontrado.`);

    const dateChunks = this.splitDates(dateSince, dateUntil);
    console.log(`🚀 Iniciando Sync Completo: ${client.clientName}`);
    this.previewCache.clear();

    let totalRecords = 0;

    for (const chunk of dateChunks) {
      console.log(`⏳ Puxando: ${chunk.start} até ${chunk.end}...`);

      const response = await axios.get<MetaApiResponse>(`https://graph.facebook.com/v23.0/${actId}/insights`, {
        params: {
          access_token: client.accessToken,
          level: 'ad',
          fields: 'ad_name,ad_id,campaign_name,campaign_id,actions,action_values,spend,reach,impressions,date_start,ctr',
          time_range: JSON.stringify({ since: chunk.start, until: chunk.end }),
          time_increment: 1,
          action_report_time: 'conversion',
          limit: 500,
        },
      });

      const insights = response.data.data || [];

      for (const item of insights) {
        const getQty = (type: string) => parseInt(item.actions?.find((a) => a.action_type === type)?.value || '0');
        const getVal = (type: string) => parseFloat(item.action_values?.find((a) => a.action_type === type)?.value || '0');

        const previewLink = await this.getPreviewLink(item.ad_id, client.accessToken);

        const spend = parseFloat(item.spend || '0');
        const purchaseVal = getVal('purchase');
        const customConvCount = client.customEventId ? getQty(client.customEventId) : 0;
        const customConvValue = client.customEventId ? getVal(client.customEventId) : 0;
        const totalConvValue = purchaseVal + customConvValue;
        const roas = spend > 0 ? totalConvValue / spend : 0;

        await prisma.adPerformance.upsert({
          where: {
            date_adId: {
              date: new Date(item.date_start),
              adId: item.ad_id,
            },
          },
          update: {
            adName: item.ad_name,
            campaignName: item.campaign_name,
            reach: parseInt(item.reach || '0'),
            impressions: parseInt(item.impressions || '0'),
            spend,
            linkClicks: getQty('link_click'),
            ctr: parseFloat(item.ctr || '0'),
            messagingConversations: getQty('onsite_conversion.messaging_conversation_started_7d'),
            leads: getQty('lead'),
            leadsForm: getQty('lead'),
            pageViews: getQty('landing_page_view'),
            addToCart: getQty('add_to_cart'),
            initiateCheckout: getQty('initiate_checkout'),
            purchases: getQty('purchase'),
            purchaseValue: purchaseVal,
            customConversionCount: customConvCount,
            customConversionValue: customConvValue,
            totalConversionValue: totalConvValue,
            roas,
            previewLink,
          },
          create: {
            date: new Date(item.date_start),
            clientId: actId,
            adId: item.ad_id,
            adName: item.ad_name,
            campaignName: item.campaign_name,
            campaignId: item.campaign_id,
            reach: parseInt(item.reach || '0'),
            impressions: parseInt(item.impressions || '0'),
            spend,
            linkClicks: getQty('link_click'),
            ctr: parseFloat(item.ctr || '0'),
            messagingConversations: getQty('onsite_conversion.messaging_conversation_started_7d'),
            leads: getQty('lead'),
            leadsForm: getQty('lead'),
            pageViews: getQty('landing_page_view'),
            addToCart: getQty('add_to_cart'),
            initiateCheckout: getQty('initiate_checkout'),
            purchases: getQty('purchase'),
            purchaseValue: purchaseVal,
            customConversionCount: customConvCount,
            customConversionValue: customConvValue,
            totalConversionValue: totalConvValue,
            roas,
            previewLink,
          },
        });
      }
      totalRecords += insights.length;
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { success: true, records: totalRecords };
  }
}

export default new SyncService();
