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
      },
    });
  }

  public async findByClientId(actId: string) {
    return prisma.adPerformance.findMany({
      where: { clientId: actId },
      orderBy: { date: 'desc' },
    });
  }
}

export default new AdRepository();
