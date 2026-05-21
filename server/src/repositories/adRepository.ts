import prisma from '../config/db.js';
import { Prisma } from '../generated/prisma/client.js';

export interface UpsertInsightData {
  date: Date;
  clientId: string;
  adId: string;
  adName: string;
  campaignName: string;
  campaignId: string;
  reach: number;
  impressions: number;
  spend: number;
  linkClicks: number;
  ctr: number;
  messagingConversations: number;
  leads: number;
  leadsForm: number;
  pageViews: number;
  addToCart: number;
  initiateCheckout: number;
  purchases: number;
  purchaseValue: number;
  customConversionCount: number;
  customConversionValue: number;
  totalConversionValue: number;
  roas: number;
  previewLink: string;
  pageLikes: number;
  adStatus: string;
  campaignStatus: string;
}

class AdRepository {
  public async upsertInsight(data: UpsertInsightData) {
    const decimal = (v: number) => new Prisma.Decimal(v);

    return prisma.adPerformance.upsert({
      where: {
        date_adId: {
          date: data.date,
          adId: data.adId,
        },
      },
      update: {
        adName: data.adName,
        campaignName: data.campaignName,
        campaignId: data.campaignId,
        reach: data.reach,
        impressions: data.impressions,
        spend: decimal(data.spend),
        linkClicks: data.linkClicks,
        ctr: decimal(data.ctr),
        messagingConversations: data.messagingConversations,
        leads: data.leads,
        leadsForm: data.leadsForm,
        pageViews: data.pageViews,
        addToCart: data.addToCart,
        initiateCheckout: data.initiateCheckout,
        purchases: data.purchases,
        purchaseValue: decimal(data.purchaseValue),
        customConversionCount: data.customConversionCount,
        customConversionValue: decimal(data.customConversionValue),
        totalConversionValue: decimal(data.totalConversionValue),
        roas: decimal(data.roas),
        previewLink: data.previewLink,
        pageLikes: data.pageLikes,
        adStatus: data.adStatus,
        campaignStatus: data.campaignStatus,
      },
      create: {
        date: data.date,
        clientId: data.clientId,
        adId: data.adId,
        adName: data.adName,
        campaignName: data.campaignName,
        campaignId: data.campaignId,
        reach: data.reach,
        impressions: data.impressions,
        spend: decimal(data.spend),
        linkClicks: data.linkClicks,
        ctr: decimal(data.ctr),
        messagingConversations: data.messagingConversations,
        leads: data.leads,
        leadsForm: data.leadsForm,
        pageViews: data.pageViews,
        addToCart: data.addToCart,
        initiateCheckout: data.initiateCheckout,
        purchases: data.purchases,
        purchaseValue: decimal(data.purchaseValue),
        customConversionCount: data.customConversionCount,
        customConversionValue: decimal(data.customConversionValue),
        totalConversionValue: decimal(data.totalConversionValue),
        roas: decimal(data.roas),
        previewLink: data.previewLink,
        pageLikes: data.pageLikes,
        adStatus: data.adStatus,
        campaignStatus: data.campaignStatus,
      },
    });
  }

  public async batchUpsert(dataList: UpsertInsightData[]) {
    if (dataList.length === 0) return;

    const METRIC_COLS = [
      'ad_name', 'campaign_name', 'campaign_id', 'reach', 'impressions', 'spend',
      'link_clicks', 'ctr', 'messaging_conversations', 'leads', 'leads_form', 'page_views',
      'add_to_cart', 'initiate_checkout', 'purchases', 'purchase_value',
      'custom_conversion_count', 'custom_conversion_value', 'total_conversion_value', 'roas', 'preview_link',
      'ad_status', 'campaign_status', 'page_likes',
    ];
    const setClauses = METRIC_COLS.map((c) => `${c} = VALUES(${c})`).join(', ');

    const cols = [
      'date', 'client_id', 'ad_id', 'ad_name', 'campaign_name', 'campaign_id',
      'reach', 'impressions', 'spend', 'link_clicks', 'ctr',
      'messaging_conversations', 'leads', 'leads_form', 'page_views',
      'add_to_cart', 'initiate_checkout', 'purchases', 'purchase_value',
      'custom_conversion_count', 'custom_conversion_value', 'total_conversion_value',
      'roas', 'preview_link', 'ad_status', 'campaign_status', 'page_likes',
    ];
    const placeholders = `(${cols.map(() => '?').join(',')})`;
    const colCount = cols.length;
    const BATCH_SIZE = Math.floor(65000 / colCount);

    for (let i = 0; i < dataList.length; i += BATCH_SIZE) {
      const batch = dataList.slice(i, i + BATCH_SIZE);
      await prisma.$executeRawUnsafe(
        `INSERT INTO meta_ads_performance (${cols.join(',')}) VALUES ${batch.map(() => placeholders).join(',')}
        ON DUPLICATE KEY UPDATE ${setClauses}`,
        ...batch.flatMap((d) => [
          d.date, d.clientId, d.adId, d.adName, d.campaignName, d.campaignId,
          d.reach, d.impressions, d.spend, d.linkClicks, d.ctr,
          d.messagingConversations, d.leads, d.leadsForm, d.pageViews,
          d.addToCart, d.initiateCheckout, d.purchases, d.purchaseValue,
          d.customConversionCount, d.customConversionValue, d.totalConversionValue, d.roas, d.previewLink,
          d.adStatus, d.campaignStatus,
          d.pageLikes,
        ]),
      );
    }
  }

  public async findByClientId(actId: string) {
    return prisma.adPerformance.findMany({
      where: { clientId: actId },
      orderBy: { date: 'desc' },
    });
  }
}

export default new AdRepository();
