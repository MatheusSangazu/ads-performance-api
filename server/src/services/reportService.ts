import adRepository from '../repositories/adRepository.js';
import type { AdPerformanceModel } from '../generated/prisma/models/AdPerformance.js';
import ExcelJS from 'exceljs';

class ReportService {
  public async generateExcel(actId: string) {
    const rows: AdPerformanceModel[] = await adRepository.findByClientId(actId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório Full Domus');

    worksheet.columns = [
      { header: 'Data', key: 'date', width: 12 },
      { header: 'Status Ad', key: 'ad_status', width: 12 },
      { header: 'Anúncio', key: 'ad_name', width: 35 },
      { header: 'Campanha', key: 'campaign_name', width: 30 },
      { header: 'Investimento (R$)', key: 'spend', width: 15 },
      { header: 'Alcance', key: 'reach', width: 10 },
      { header: 'Impressões', key: 'impressions', width: 10 },
      { header: 'CTR (%)', key: 'ctr', width: 10 },
      { header: 'Cliques Link', key: 'link_clicks', width: 12 },
      { header: 'Page Views', key: 'page_views', width: 12 },
      { header: 'Taxa Conexão', key: 'taxa_conexao', width: 12 },
      { header: 'Carrinhos', key: 'add_to_cart', width: 12 },
      { header: 'Checkouts', key: 'initiate_checkout', width: 12 },
      { header: 'Mensagens', key: 'messaging_conversations', width: 12 },
      { header: 'Leads', key: 'leads', width: 10 },
      { header: 'Compras', key: 'purchases', width: 10 },
      { header: 'Valor Compras', key: 'purchase_value', width: 15 },
      { header: 'Conversão Custom', key: 'custom_conversion_count', width: 15 },
      { header: 'Valor Total (R$)', key: 'total_conversion_value', width: 15 },
      { header: 'ROAS', key: 'roas', width: 10 },
      { header: 'Link de Preview', key: 'preview_link', width: 40 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4267B2' },
    };

    rows.forEach((row) => {
      const linkClicks = row.linkClicks ?? 0;
      const pageViews = row.pageViews ?? 0;
      const taxaConexao = linkClicks > 0 ? pageViews / linkClicks : 0;

      worksheet.addRow({
        date: row.date.toISOString().split('T')[0],
        ad_status: row.adStatus,
        ad_name: row.adName,
        campaign_name: row.campaignName,
        spend: Number(row.spend ?? 0),
        reach: row.reach,
        impressions: row.impressions,
        ctr: Number(row.ctr ?? 0) / 100,
        link_clicks: row.linkClicks,
        page_views: row.pageViews,
        taxa_conexao: taxaConexao,
        add_to_cart: row.addToCart,
        initiate_checkout: row.initiateCheckout,
        messaging_conversations: row.messagingConversations,
        leads: row.leads,
        purchases: row.purchases,
        purchase_value: Number(row.purchaseValue ?? 0),
        custom_conversion_count: row.customConversionCount,
        total_conversion_value: Number(row.totalConversionValue ?? 0),
        roas: Number(row.roas ?? 0),
        preview_link: row.previewLink,
      });
    });

    worksheet.getColumn('spend').numFmt = '"R$" #,##0.00';
    worksheet.getColumn('purchase_value').numFmt = '"R$" #,##0.00';
    worksheet.getColumn('total_conversion_value').numFmt = '"R$" #,##0.00';
    worksheet.getColumn('ctr').numFmt = '0.00%';
    worksheet.getColumn('taxa_conexao').numFmt = '0.00%';
    worksheet.getColumn('roas').numFmt = '0.00';

    return workbook;
  }
}

export default new ReportService();
