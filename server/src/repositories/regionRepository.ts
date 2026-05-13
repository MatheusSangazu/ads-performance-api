import prisma from '../config/db.js';
import { Prisma } from '../generated/prisma/client.js';

export interface UpsertRegionData {
  date: Date;
  clientId: string;
  adId: string;
  adName: string;
  campaignName: string;
  campaignId: string;
  region: string;
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

class RegionRepository {
  private decimal(v: number) {
    return new Prisma.Decimal(v);
  }

  private metricFields(data: UpsertRegionData) {
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

  public async upsert(data: UpsertRegionData) {
    return prisma.adRegionPerformance.upsert({
      where: {
        date_adId_region: {
          date: data.date,
          adId: data.adId,
          region: data.region,
        },
      },
      update: this.metricFields(data),
      create: {
        date: data.date,
        clientId: data.clientId,
        adId: data.adId,
        region: data.region,
        ...this.metricFields(data),
      },
    });
  }

  public async deleteByClientId(actId: string) {
    return prisma.adRegionPerformance.deleteMany({ where: { clientId: actId } });
  }
}

export default new RegionRepository();
