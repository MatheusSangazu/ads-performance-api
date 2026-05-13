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

  public async deleteByClientId(actId: string) {
    return prisma.adAudiencePerformance.deleteMany({ where: { clientId: actId } });
  }
}

export default new AudienceRepository();
