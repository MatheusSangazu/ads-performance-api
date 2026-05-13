import clientRepository from '../repositories/clientRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import audienceRepository from '../repositories/audienceRepository.js';
import placementRepository from '../repositories/placementRepository.js';
import regionRepository from '../repositories/regionRepository.js';
import { fetchAllInsights } from '../integrations/metaApi.js';
import { splitDates } from '../utils/dateUtils.js';
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

    const clientToken = client.accessToken?.trim();
    const globalToken = (await settingsRepository.get('global_access_token'))?.trim();
    const accessToken = clientToken || globalToken;
    if (!accessToken) throw new Error(`Nenhum token disponível para o cliente ${actId}.`);

    const config = BREAKDOWN_CONFIG[type];
    const dateChunks = splitDates(dateSince, dateUntil);

    syncProgress.send({ type: 'start', message: `🔍 ${config.label}: ${client.clientName} | ${dateChunks.length} chunk(s)`, step: type, progress: 0 });

    let totalRecords = 0;
    let totalErrors = 0;
    const details: string[] = [];

    for (let i = 0; i < dateChunks.length; i++) {
      const chunk = dateChunks[i];
      const chunkProgress = Math.round(((i) / dateChunks.length) * 100);

      syncProgress.send({
        type: 'progress',
        message: `⏳ ${config.label} chunk ${i + 1}/${dateChunks.length}: ${chunk.start} → ${chunk.end}`,
        step: type,
        progress: chunkProgress,
      });

      try {
        const response = await fetchAllInsights(actId, accessToken, chunk.start, chunk.end, config.param);
        const insights = response.data || [];

        if (insights.length === 0) {
          syncProgress.send({ type: 'log', message: `   ℹ️ ${config.label}: nenhum dado para ${chunk.start} → ${chunk.end}`, step: type });
          details.push(`${chunk.start} → ${chunk.end}: 0 registros`);
          continue;
        }

        syncProgress.send({ type: 'log', message: `   📥 ${insights.length} registros de ${config.label}`, step: type });

        let chunkSaved = 0;
        let chunkErrors = 0;

        for (const item of insights) {
          try {
            const metrics = this.buildMetrics(item, client.customEventId);
            const base = {
              date: new Date(item.date_start),
              clientId: actId,
              adId: item.ad_id,
              adName: item.ad_name,
              campaignName: item.campaign_name,
              campaignId: item.campaign_id,
              ...metrics,
            };

            if (type === 'audience') {
              await audienceRepository.upsert({ ...base, gender: item.gender || 'unknown', ageRange: item.age || 'unknown' });
            } else if (type === 'placement') {
              await placementRepository.upsert({ ...base, platform: item.publisher_platform || 'unknown' });
            } else if (type === 'region') {
              await regionRepository.upsert({ ...base, region: item.region || 'unknown' });
            }

            chunkSaved++;
          } catch (err) {
            chunkErrors++;
            const msg = err instanceof Error ? err.message : String(err);
            syncProgress.send({ type: 'error', message: `   ❌ Erro breakdown ${item.ad_id}: ${msg}`, step: type });
          }
        }

        totalRecords += chunkSaved;
        totalErrors += chunkErrors;
        syncProgress.send({ type: 'log', message: `   ✅ ${config.label}: ${chunkSaved} salvos${chunkErrors > 0 ? `, ${chunkErrors} erros` : ''}`, step: type });
        details.push(`${chunk.start} → ${chunk.end}: ${chunkSaved} salvos${chunkErrors > 0 ? `, ${chunkErrors} erros` : ''}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        syncProgress.send({ type: 'error', message: `   ❌ Falha ${config.label} ${chunk.start} → ${chunk.end}: ${msg}`, step: type });
        details.push(`${chunk.start} → ${chunk.end}: FALHA - ${msg}`);
        totalErrors++;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    syncProgress.send({
      type: 'done',
      message: `🏁 ${config.label} concluído: ${totalRecords} registros, ${totalErrors} erros`,
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
