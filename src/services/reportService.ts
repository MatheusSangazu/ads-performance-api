import pool from '../config/db.js';
import ExcelJS from 'exceljs';

class ReportService {
  public async generateExcel(actId: string) {
    const [rows]: any = await pool.query(
      'SELECT * FROM meta_ads_performance WHERE client_id = ? ORDER BY date DESC',
      [actId]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório Full Domus');

    // 1. Definição de TODAS as colunas do seu banco
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

    // 2. Estilização do Cabeçalho (Azul Domus/Facebook)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4267B2' },
    };

    // 3. Adicionando os dados com cálculos extras
    rows.forEach((row: any) => {
      // Cálculo da Taxa de Conexão: (Page Views / Cliques) * 100
      const linkClicks = parseInt(row.link_clicks) || 0;
      const pageViews = parseInt(row.page_views) || 0;
      const taxaConexao = linkClicks > 0 ? (pageViews / linkClicks) : 0;

      worksheet.addRow({
        ...row,
        date: row.date.toISOString().split('T')[0],
        spend: parseFloat(row.spend),
        ctr: parseFloat(row.ctr) / 100, // Ajuste para formato de % no Excel
        taxa_conexao: taxaConexao,
        purchase_value: parseFloat(row.purchase_value),
        total_conversion_value: parseFloat(row.total_conversion_value),
        roas: parseFloat(row.roas)
      });
    });

    // 4. Formatação de Células (Dinheiro e Porcentagem)
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