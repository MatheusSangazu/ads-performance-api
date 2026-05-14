import prisma from '../config/db.js';
import { Prisma } from '../generated/prisma/client.js';

export interface UpsertAudienceData {
  date: Date;
  clientId: string;
  adId: string;
  adName: string;
  campaignName: string;
  campaignId: string;
  gender: string;
  ageRange: string;
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
}

class AudienceRepository {
  private decimal(v: number) {
    return new Prisma.Decimal(v);
  }

  private metricFields(data: UpsertAudienceData) {
    return {
      adName: data.adName,
      campaignName: data.campaignName,
      campaignId: data.campaignId,
      reach: data.reach,
      impressions: data.impressions,
      spend: this.decimal(data.spend),
      linkClicks: data.linkClicks,
      ctr: this.decimal(data.ctr),
      messagingConversations: data.messagingConversations,
      leads: data.leads,
      leadsForm: data.leadsForm,
      pageViews: data.pageViews,
      addToCart: data.addToCart,
      initiateCheckout: data.initiateCheckout,
      purchases: data.purchases,
      purchaseValue: this.decimal(data.purchaseValue),
      customConversionCount: data.customConversionCount,
      customConversionValue: this.decimal(data.customConversionValue),
      totalConversionValue: this.decimal(data.totalConversionValue),
      roas: this.decimal(data.roas),
    };
  }

  public async upsert(data: UpsertAudienceData) {
    return prisma.adAudiencePerformance.upsert({
      where: {
        date_adId_gender_ageRange: {
          date: data.date,
          adId: data.adId,
          gender: data.gender,
          ageRange: data.ageRange,
        },
      },
      update: this.metricFields(data),
      create: {
        date: data.date,
        clientId: data.clientId,
        adId: data.adId,
        gender: data.gender,
        ageRange: data.ageRange,
        ...this.metricFields(data),
      },
    });
  }

  public async batchUpsert(dataList: UpsertAudienceData[]) {
    if (dataList.length === 0) return;

    const METRIC_COLS = [
      'ad_name', 'campaign_name', 'campaign_id', 'reach', 'impressions', 'spend',
      'link_clicks', 'ctr', 'messaging_conversations', 'leads', 'leads_form', 'page_views',
      'add_to_cart', 'initiate_checkout', 'purchases', 'purchase_value',
      'custom_conversion_count', 'custom_conversion_value', 'total_conversion_value', 'roas',
    ];
    const setClauses = METRIC_COLS.map((c) => `${c} = VALUES(${c})`).join(', ');

    const cols = [
      'date', 'client_id', 'ad_id', 'ad_name', 'campaign_name', 'campaign_id',
      'gender', 'age_range', 'reach', 'impressions', 'spend', 'link_clicks', 'ctr',
      'messaging_conversations', 'leads', 'leads_form', 'page_views',
      'add_to_cart', 'initiate_checkout', 'purchases', 'purchase_value',
      'custom_conversion_count', 'custom_conversion_value', 'total_conversion_value', 'roas',
    ];
    const placeholders = `(${cols.map(() => '?').join(',')})`;
    const colCount = cols.length;
    const BATCH_SIZE = Math.floor(65000 / colCount);

    for (let i = 0; i < dataList.length; i += BATCH_SIZE) {
      const batch = dataList.slice(i, i + BATCH_SIZE);
      await prisma.$executeRawUnsafe(
        `INSERT INTO ad_audience_performance (${cols.join(',')}) VALUES ${batch.map(() => placeholders).join(',')}
        ON DUPLICATE KEY UPDATE ${setClauses}`,
        ...batch.flatMap((d) => [
          d.date, d.clientId, d.adId, d.adName, d.campaignName, d.campaignId,
          d.gender, d.ageRange, d.reach, d.impressions, d.spend, d.linkClicks, d.ctr,
          d.messagingConversations, d.leads, d.leadsForm, d.pageViews,
          d.addToCart, d.initiateCheckout, d.purchases, d.purchaseValue,
          d.customConversionCount, d.customConversionValue, d.totalConversionValue, d.roas,
        ]),
      );
    }
  }

  public async deleteByClientId(actId: string) {
    return prisma.adAudiencePerformance.deleteMany({ where: { clientId: actId } });
  }
}

export default new AudienceRepository();
