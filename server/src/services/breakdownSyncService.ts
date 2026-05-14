import clientRepository from '../repositories/clientRepository.js';
import audienceRepository from '../repositories/audienceRepository.js';
import placementRepository from '../repositories/placementRepository.js';
import regionRepository from '../repositories/regionRepository.js';
import { fetchAllInsights } from '../integrations/metaApi.js';
import { splitDates } from '../utils/dateUtils.js';
import { resolveToken } from '../utils/tokenUtils.js';
import type { MetaInsight, MetaAction, SyncResult, BreakdownType } from '../types/index.js';
import syncProgress from './syncProgress.js';

const BREAKDOWN_CONFIG: Record<BreakdownType, { param: string[]; label: string }> = {
  audience: { param: ['gender', 'age'], label: 'Público (sexo × idade)' },
  placement: { param: ['publisher_platform'], label: 'Plataforma' },
  region: { param: ['region'], label: 'Região' },
};

class BreakdownSyncService {
  private extractActionValue(actions: MetaAction[] | undefined, type: string): number {
    return parseInt(actions?.find((a) => a.action_type === type)?.value || '0');
  }

  private extractActionValueFloat(actions: MetaAction[] | undefined, type: string): number {
    return parseFloat(actions?.find((a) => a.action_type === type)?.value || '0');
  }

  private buildMetrics(item: MetaInsight, customEventId: string | null) {
    const getQty = (type: string) => this.extractActionValue(item.actions, type);
    const getVal = (type: string) => this.extractActionValueFloat(item.action_values, type);

    const spend = parseFloat(item.spend || '0');
    const purchaseVal = getVal('purchase');
    const customConvCount = customEventId ? getQty(customEventId) : 0;
    const customConvValue = customEventId ? getVal(customEventId) : 0;
    const totalConvValue = purchaseVal + customConvValue;
    const roas = spend > 0 ? totalConvValue / spend : 0;

    return {
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
    };
  }

  public async syncBreakdown(
    actId: string,
    dateSince: string,
    dateUntil: string,
    type: BreakdownType,
  ): Promise<SyncResult> {
    const client = await clientRepository.findByActId(actId);
    if (!client) throw new Error(`Cliente ${actId} não encontrado.`);

    const { accessToken } = await resolveToken(actId);

    const config = BREAKDOWN_CONFIG[type];
    const dateChunks = splitDates(dateSince, dateUntil);

    syncProgress.send({ type: 'start', message: `[SYNC] ${config.label}: ${client.clientName} | ${dateChunks.length} chunk(s)`, step: type, progress: 0 });

    let totalRecords = 0;
    let totalErrors = 0;
    const details: string[] = [];

    for (let i = 0; i < dateChunks.length; i++) {
      const chunk = dateChunks[i];
      const chunkProgress = Math.round(((i) / dateChunks.length) * 100);

      syncProgress.send({
        type: 'progress',
        message: `[CHUNK] ${config.label} chunk ${i + 1}/${dateChunks.length}: ${chunk.start} → ${chunk.end}`,
        step: type,
        progress: chunkProgress,
      });

      try {
        const response = await fetchAllInsights(actId, accessToken, chunk.start, chunk.end, config.param);
        const insights = response.data || [];

        if (insights.length === 0) {
          syncProgress.send({ type: 'log', message: `   [INFO] ${config.label}: nenhum dado para ${chunk.start} → ${chunk.end}`, step: type });
          details.push(`${chunk.start} → ${chunk.end}: 0 registros`);
          continue;
        }

        syncProgress.send({ type: 'log', message: `   [DATA] ${insights.length} registros de ${config.label}`, step: type });

        syncProgress.send({ type: 'progress', message: `   [SAVE] Salvando ${insights.length} registros de ${config.label} em lote...`, step: type, progress: Math.round(((i + 0.5) / dateChunks.length) * 100) });

        const allBaseData = insights.map((item) => {
          const metrics = this.buildMetrics(item, client.customEventId);
          return {
            date: new Date(item.date_start),
            clientId: actId,
            adId: item.ad_id,
            adName: item.ad_name,
            campaignName: item.campaign_name,
            campaignId: item.campaign_id,
            ...metrics,
          };
        });

        try {
          if (type === 'audience') {
            const audienceData = allBaseData.map((d) => ({ ...d, gender: (insights[allBaseData.indexOf(d)] as MetaInsight).gender || 'unknown', ageRange: (insights[allBaseData.indexOf(d)] as MetaInsight).age || 'unknown' }));
            await audienceRepository.batchUpsert(audienceData);
          } else if (type === 'placement') {
            const placementData = allBaseData.map((d, idx) => ({ ...d, platform: insights[idx].publisher_platform || 'unknown' }));
            await placementRepository.batchUpsert(placementData);
          } else if (type === 'region') {
            const regionData = allBaseData.map((d, idx) => ({ ...d, region: insights[idx].region || 'unknown' }));
            await regionRepository.batchUpsert(regionData);
          }

          totalRecords += insights.length;
          syncProgress.send({ type: 'log', message: `   [OK] ${config.label}: ${insights.length} salvos em lote`, step: type });
          details.push(`${chunk.start} → ${chunk.end}: ${insights.length} salvos`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          totalErrors++;
          syncProgress.send({ type: 'error', message: `   [ERROR] Erro ao salvar lote ${config.label}: ${msg}`, step: type });
          details.push(`${chunk.start} → ${chunk.end}: FALHA - ${msg}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        syncProgress.send({ type: 'error', message: `   [ERROR] Falha ${config.label} ${chunk.start} → ${chunk.end}: ${msg}`, step: type });
        details.push(`${chunk.start} → ${chunk.end}: FALHA - ${msg}`);
        totalErrors++;
      }
    }

    syncProgress.send({
      type: 'done',
      message: `[DONE] ${config.label} concluído: ${totalRecords} registros, ${totalErrors} erros`,
      step: type,
      progress: 100,
      records: totalRecords,
      errors: totalErrors,
    });

    return { success: totalErrors === 0, records: totalRecords, errors: totalErrors, details };
  }

  public async syncAllBreakdowns(
    actId: string,
    dateSince: string,
    dateUntil: string,
  ): Promise<Record<BreakdownType, SyncResult>> {
    const results = {} as Record<BreakdownType, SyncResult>;

    for (const type of Object.keys(BREAKDOWN_CONFIG) as BreakdownType[]) {
      try {
        results[type] = await this.syncBreakdown(actId, dateSince, dateUntil, type);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results[type] = { success: false, records: 0, errors: 1, details: [msg] };
      }
    }

    return results;
  }
}

export default new BreakdownSyncService();
