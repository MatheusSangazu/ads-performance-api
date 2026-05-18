import clientRepository from '../repositories/clientRepository.js';
import adRepository from '../repositories/adRepository.js';
import type { UpsertInsightData } from '../repositories/adRepository.js';
import { fetchAllInsights, fetchPreviewLink, validateAccount } from '../integrations/metaApi.js';
import { splitDates } from '../utils/dateUtils.js';
import { resolveToken } from '../utils/tokenUtils.js';
import type { MetaInsight, MetaAction, SyncResult } from '../types/index.js';
import syncProgress from './syncProgress.js';
import alertService from './alertService.js';
import healthCheckService from './healthCheckService.js';
import { downloadCreativesBatch } from './creativeDownloadService.js';

class SyncService {
  private previewCache: Map<string, string> = new Map();

  private extractActionValue(actions: MetaAction[] | undefined, type: string): number {
    return parseInt(actions?.find((a) => a.action_type === type)?.value || '0');
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

  private async fetchPreviewLinks(adIds: string[], accessToken: string): Promise<Map<string, string>> {
    const linkMap = new Map<string, string>();
    const uniqueIds = [...new Set(adIds.filter((id) => !this.previewCache.has(id)))];
    const batchSize = 50;

    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const batch = uniqueIds.slice(i, i + batchSize);
      const promises = batch.map(async (adId) => {
        try {
          const link = await fetchPreviewLink(adId, accessToken);
          linkMap.set(adId, link);
        } catch {
          linkMap.set(adId, '');
        }
      });
      await Promise.all(promises);
      syncProgress.send({ type: 'log', message: `   [LINK] Preview links: ${Math.min(i + batchSize, uniqueIds.length)}/${uniqueIds.length}`, step: 'main' });
    }

    for (const [adId, link] of linkMap) {
      this.previewCache.set(adId, link);
    }
    return linkMap;
  }

  public async syncAccount(actId: string, dateSince: string, dateUntil: string): Promise<SyncResult> {
    const client = await clientRepository.findByActId(actId);
    if (!client) throw new Error(`Cliente ${actId} não encontrado.`);

    const { accessToken } = await resolveToken(actId);

    syncProgress.send({ type: 'start', message: `[SYNC] Validando acesso à conta ${actId}...`, step: 'main', progress: 0 });
    const validation = await validateAccount(actId, accessToken);
    if (!validation.valid) {
      const errMsg = `Não foi possível acessar a conta ${actId}: ${validation.error}`;
      syncProgress.send({ type: 'error', message: `[ERROR] ${errMsg}`, step: 'main' });
      syncProgress.send({ type: 'done', message: `[DONE] Sync abortado: acesso inválido`, step: 'main', progress: 100, records: 0, errors: 1 });
      return { success: false, records: 0, errors: 1, details: [errMsg] };
    }

    const dateChunks = splitDates(dateSince, dateUntil);
    syncProgress.send({ type: 'start', message: `[SYNC] Sync: ${client.clientName} | ${dateChunks.length} chunk(s)`, step: 'main', progress: 0 });
    this.previewCache.clear();

    let totalRecords = 0;
    let totalErrors = 0;
    const details: string[] = [];

    for (let i = 0; i < dateChunks.length; i++) {
      const chunk = dateChunks[i];
      const chunkProgress = Math.round(((i) / dateChunks.length) * 100);

      syncProgress.send({
        type: 'progress',
        message: `[CHUNK] Chunk ${i + 1}/${dateChunks.length}: ${chunk.start} → ${chunk.end}`,
        step: 'main',
        progress: chunkProgress,
      });

      try {
        const response = await fetchAllInsights(actId, accessToken, chunk.start, chunk.end);
        const insights: MetaInsight[] = response.data || [];

        if (insights.length === 0) {
          syncProgress.send({ type: 'log', message: `   [INFO] Nenhum dado para ${chunk.start} → ${chunk.end}`, step: 'main' });
          details.push(`${chunk.start} → ${chunk.end}: 0 registros`);
          continue;
        }

        syncProgress.send({ type: 'log', message: `   [DATA] ${insights.length} registros encontrados`, step: 'main' });

        const adIds = insights.map((item) => item.ad_id);
        syncProgress.send({ type: 'log', message: `   [LINK] Buscando preview links...`, step: 'main' });
        await this.fetchPreviewLinks(adIds, accessToken);

        syncProgress.send({ type: 'progress', message: `   [SAVE] Salvando ${insights.length} registros em lote...`, step: 'main', progress: Math.round(((i + 0.5) / dateChunks.length) * 100) });

        const allData = insights.map((item) =>
          this.buildInsightData(item, actId, client.customEventId, this.previewCache.get(item.ad_id) || ''),
        );

        try {
          await adRepository.batchUpsert(allData);
          totalRecords += allData.length;
          syncProgress.send({ type: 'log', message: `   [OK] ${allData.length} salvos em lote`, step: 'main' });
          details.push(`${chunk.start} → ${chunk.end}: ${allData.length} salvos`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          totalErrors++;
          syncProgress.send({ type: 'error', message: `   [ERROR] Erro ao salvar lote: ${msg}`, step: 'main' });
          details.push(`${chunk.start} → ${chunk.end}: FALHA - ${msg}`);
        }
      } catch (err: any) {
        const metaError = err?.response?.data?.error?.message;
        const metaCode = err?.response?.data?.error?.code;
        const msg = metaError
          ? `Meta API ${err.response.status} (code ${metaCode}): ${metaError}`
          : (err instanceof Error ? err.message : String(err));
        syncProgress.send({ type: 'error', message: `   [ERROR] Falha no chunk ${chunk.start} → ${chunk.end}: ${msg}`, step: 'main' });
        details.push(`${chunk.start} → ${chunk.end}: FALHA - ${msg}`);
        totalErrors++;
      }
    }

    syncProgress.send({
      type: 'done',
      message: `[DONE] Sync concluído: ${totalRecords} registros, ${totalErrors} erros`,
      step: 'main',
      progress: 100,
      records: totalRecords,
      errors: totalErrors,
    });

    if (totalRecords > 0) {
      const allAdIds = Array.from(this.previewCache.keys());
      downloadCreativesBatch(actId, accessToken, allAdIds, 5, (downloaded, total) => {
        syncProgress.send({ type: 'log', message: `   [CREATIVE] ${downloaded}/${total} mídias baixadas`, step: 'main' });
      }).catch((err) => {
        console.error('[CREATIVE] Erro ao baixar criativos:', err instanceof Error ? err.message : String(err));
      });
    }

    alertService.evaluate(actId).catch((err) => {
      console.error('[ALERT] Erro ao avaliar alertas:', err instanceof Error ? err.message : String(err));
    });

    healthCheckService.updateClientHealth(actId, accessToken).catch((err) => {
      console.error('[HealthCheck] Erro ao atualizar saúde:', err instanceof Error ? err.message : String(err));
    });

    if (totalErrors > 0) {
      alertService.onSyncFailed(actId, `${totalErrors} erro(s) durante sync`).catch(() => {});
    }

    return { success: totalErrors === 0, records: totalRecords, errors: totalErrors, details };
  }
}

export default new SyncService();
