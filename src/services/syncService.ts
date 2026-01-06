import pool from '../config/db.js';
import axios from 'axios';

// --- INTERFACES PARA O TYPESCRIPT ---
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

// Tipo específico para a chamada do Preview Link
interface MetaPreviewResponse {
  preview_shareable_link: string;
  id: string;
}

class SyncService {
  private previewCache: Map<string, string> = new Map();

  /**
   * Busca o link de preview com tipagem correta
   */
  private async getPreviewLink(adId: string, accessToken: string): Promise<string> {
    if (this.previewCache.has(adId)) return this.previewCache.get(adId)!;
    
    try {
      // Passamos <MetaPreviewResponse> para o axios saber o que tem no .data
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
    try {
      const [rows]: any = await pool.query('SELECT * FROM clients_config WHERE act_id = ?', [actId]);
      if (!rows || rows.length === 0) throw new Error(`Cliente ${actId} não encontrado.`);
      const client = rows[0];

      const dateChunks = this.splitDates(dateSince, dateUntil);
      console.log(`🚀 Iniciando Sync Completo: ${client.client_name}`);
      this.previewCache.clear();

      let totalRecords = 0;

      for (const chunk of dateChunks) {
        console.log(`⏳ Puxando: ${chunk.start} até ${chunk.end}...`);

        // Aqui também usamos o Generic <MetaApiResponse>
        const response = await axios.get<MetaApiResponse>(`https://graph.facebook.com/v23.0/${actId}/insights`, {
          params: {
            access_token: client.access_token,
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

          const previewLink = await this.getPreviewLink(item.ad_id, client.access_token);

          const spend = parseFloat(item.spend || '0');
          const purchaseVal = getVal('purchase');
          const customConvCount = client.custom_event_id ? getQty(client.custom_event_id) : 0;
          const customConvValue = client.custom_event_id ? getVal(client.custom_event_id) : 0;
          const totalConvValue = purchaseVal + customConvValue;
          const roas = spend > 0 ? totalConvValue / spend : 0;

          const sql = `
            INSERT INTO meta_ads_performance 
            (date, client_id, ad_id, ad_name, campaign_name, campaign_id, reach, impressions, spend, 
             link_clicks, ctr, messaging_conversations, leads, leads_form, page_views, add_to_cart, 
             initiate_checkout, purchases, purchase_value, custom_conversion_count, 
             custom_conversion_value, total_conversion_value, roas, preview_link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              ad_name = VALUES(ad_name), campaign_name = VALUES(campaign_name),
              reach = VALUES(reach), impressions = VALUES(impressions), spend = VALUES(spend),
              link_clicks = VALUES(link_clicks), ctr = VALUES(ctr),
              messaging_conversations = VALUES(messaging_conversations), leads = VALUES(leads),
              leads_form = VALUES(leads_form), page_views = VALUES(page_views),
              add_to_cart = VALUES(add_to_cart), initiate_checkout = VALUES(initiate_checkout),
              purchases = VALUES(purchases), purchase_value = VALUES(purchase_value),
              custom_conversion_count = VALUES(custom_conversion_count),
              custom_conversion_value = VALUES(custom_conversion_value),
              total_conversion_value = VALUES(total_conversion_value), roas = VALUES(roas),
              preview_link = VALUES(preview_link)
          `;

          await pool.query(sql, [
            item.date_start, actId, item.ad_id, item.ad_name, item.campaign_name, item.campaign_id,
            parseInt(item.reach || '0'), parseInt(item.impressions || '0'), spend,
            getQty('link_click'), parseFloat(item.ctr || '0'),
            getQty('onsite_conversion.messaging_conversation_started_7d'),
            getQty('lead'), getQty('lead'), getQty('landing_page_view'), getQty('add_to_cart'),
            getQty('initiate_checkout'), getQty('purchase'), purchaseVal,
            customConvCount, customConvValue, totalConvValue, roas, previewLink
          ]);
        }
        totalRecords += insights.length;
        await new Promise((r) => setTimeout(r, 1000));
      }
      return { success: true, records: totalRecords };
    } catch (error: any) {
      console.error(`❌ Erro: ${error.message}`);
      throw error;
    }
  }
}
export default new SyncService();