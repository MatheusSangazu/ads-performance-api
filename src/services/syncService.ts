import clientRepository from '../repositories/clientRepository.js';
import adRepository from '../repositories/adRepository.js';
import type { UpsertInsightData } from '../repositories/adRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import { fetchAllInsights, fetchPreviewLink } from '../integrations/metaApi.js';
import { splitDates } from '../utils/dateUtils.js';
import type { MetaInsight, MetaAction, SyncResult } from '../types/index.js';

class SyncService {
  private previewCache: Map<string, string> = new Map();

  private extractActionValue(actions: MetaAction[] | undefined, type: string): number {
    return parseInt(actions?.find((a) => a.action_type === type)?.value || '0');
  }

  private async getPreviewLink(adId: string, accessToken: string): Promise<string> {
    if (this.previewCache.has(adId)) return this.previewCache.get(adId)!;
    const link = await fetchPreviewLink(adId, accessToken);
    this.previewCache.set(adId, link);
    return link;
  }

  private buildInsightData(
    item: MetaInsight,
    actId: string,
    customEventId: string | null,
    previewLink: string,
  ): UpsertInsightData {
    const getQty = (type: string) => this.extractActionValue(item.actions, type);
    const getVal = (type: string) =>
      parseFloat(item.action_values?.find((a) => a.action_type === type)?.value || '0');

    const spend = parseFloat(item.spend || '0');
    const purchaseVal = getVal('purchase');
    const customConvCount = customEventId ? getQty(customEventId) : 0;
    const customConvValue = customEventId ? getVal(customEventId) : 0;
    const totalConvValue = purchaseVal + customConvValue;
    const roas = spend > 0 ? totalConvValue / spend : 0;

    return {
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
    };
  }

  public async syncAccount(actId: string, dateSince: string, dateUntil: string): Promise<SyncResult> {
    const client = await clientRepository.findByActId(actId);
    if (!client) throw new Error(`Cliente ${actId} não encontrado.`);

    const accessToken = client.accessToken || (await settingsRepository.get('global_access_token'));
    if (!accessToken) throw new Error(`Nenhum token disponível para o cliente ${actId}. Defina um token para o cliente ou configure o token global.`);

    const dateChunks = splitDates(dateSince, dateUntil);
    console.log(`🚀 Iniciando Sync: ${client.clientName} | ${dateChunks.length} chunk(s) | ${dateSince} → ${dateUntil}`);
    this.previewCache.clear();

    let totalRecords = 0;
    let totalErrors = 0;
    const details: string[] = [];

    for (let i = 0; i < dateChunks.length; i++) {
      const chunk = dateChunks[i];
      console.log(`⏳ Chunk ${i + 1}/${dateChunks.length}: ${chunk.start} → ${chunk.end}`);

      try {
        const response = await fetchAllInsights(actId, accessToken, chunk.start, chunk.end);
        const insights: MetaInsight[] = response.data || [];

        if (insights.length === 0) {
          console.log(`   ℹ️ Nenhum dado para ${chunk.start} → ${chunk.end}`);
          details.push(`${chunk.start} → ${chunk.end}: 0 registros`);
          continue;
        }

        let chunkSaved = 0;
        let chunkErrors = 0;

        for (const item of insights) {
          try {
            const previewLink = await this.getPreviewLink(item.ad_id, accessToken);
            const insightData = this.buildInsightData(item, actId, client.customEventId, previewLink);
            await adRepository.upsertInsight(insightData);
            chunkSaved++;
          } catch (err) {
            chunkErrors++;
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`   ❌ Erro ao salvar ad ${item.ad_id} (${item.date_start}): ${msg}`);
          }
        }

        totalRecords += chunkSaved;
        totalErrors += chunkErrors;

        const status = chunkErrors > 0 ? `⚠️ ${chunkSaved} salvos, ${chunkErrors} erros` : `✅ ${chunkSaved} salvos`;
        console.log(`   ${status}`);
        details.push(`${chunk.start} → ${chunk.end}: ${chunkSaved} salvos${chunkErrors > 0 ? `, ${chunkErrors} erros` : ''}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`   ❌ Falha no chunk ${chunk.start} → ${chunk.end}: ${msg}`);
        details.push(`${chunk.start} → ${chunk.end}: FALHA - ${msg}`);
        totalErrors++;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`🏁 Sync concluído: ${totalRecords} registros salvos, ${totalErrors} erros`);

    return {
      success: totalErrors === 0,
      records: totalRecords,
      errors: totalErrors,
      details,
    };
  }
}

export default new SyncService();
