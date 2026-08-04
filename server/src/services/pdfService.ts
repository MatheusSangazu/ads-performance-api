import PDFDocument from 'pdfkit';
import adRepository from '../repositories/adRepository.js';
import clientRepository from '../repositories/clientRepository.js';
import type { AdPerformanceModel } from '../generated/prisma/models/AdPerformance.js';

class PdfService {
  public async generatePdf(actId: string): Promise<Buffer> {
    const client = await clientRepository.findByActId(actId);
    if (!client) throw new Error('Cliente não encontrado');

    const rows: AdPerformanceModel[] = await adRepository.findByClientId(actId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderHeader(doc, client.clientName, actId);
      this.renderKpis(doc, rows);
      this.renderCampaigns(doc, rows);
      this.renderDailyBreakdown(doc, rows);
      this.renderFooter(doc);

      doc.end();
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, clientName: string, actId: string) {
    doc
      .rect(0, 0, 595.28, 80)
      .fill('#4267B2');

    doc
      .fontSize(22)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .text('GestorFácil', 40, 25, { continued: true })
      .fontSize(12)
      .font('Helvetica')
      .text('  Relatório de Performance', { baseline: 'alphabetic' });

    doc
      .fontSize(10)
      .fillColor('#E0E0E0')
      .text(`Cliente: ${clientName}  |  Conta: ${actId}`, 40, 55);

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    doc
      .fontSize(9)
      .fillColor('#E0E0E0')
      .text(`Gerado em: ${dateStr}`, 40, 68);

    doc.moveDown(4);
  }

  private renderKpis(doc: PDFKit.PDFDocument, rows: AdPerformanceModel[]) {
    const y = 100;

    doc
      .fontSize(13)
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text('Resumo Geral', 40, y);

    doc
      .moveTo(40, y + 18)
      .lineTo(555, y + 18)
      .lineWidth(1)
      .strokeColor('#E0E0E0')
      .stroke();

    const totalSpend = rows.reduce((s, r) => s + Number(r.spend ?? 0), 0);
    const totalLeads = rows.reduce((s, r) => s + (r.leads ?? 0), 0);
    const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const totalClicks = rows.reduce((s, r) => s + (r.linkClicks ?? 0), 0);
    const totalMessaging = rows.reduce((s, r) => s + (r.messagingConversations ?? 0), 0);
    const totalPurchases = rows.reduce((s, r) => s + (r.purchases ?? 0), 0);
    const totalPurchaseValue = rows.reduce((s, r) => s + Number(r.purchaseValue ?? 0), 0);
    const totalConversionValue = rows.reduce((s, r) => s + Number(r.totalConversionValue ?? 0), 0);
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCtr = rows.length > 0
      ? rows.reduce((s, r) => s + Number(r.ctr ?? 0), 0) / rows.length
      : 0;
    const avgRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    const cards: { label: string; value: string; x: number; y: number }[] = [
      { label: 'Investimento Total', value: `R$ ${totalSpend.toFixed(2)}`, x: 40, y: y + 28 },
      { label: 'Total Leads', value: totalLeads.toLocaleString('pt-BR'), x: 200, y: y + 28 },
      { label: 'CPL Médio', value: `R$ ${avgCpl.toFixed(2)}`, x: 360, y: y + 28 },
      { label: 'ROAS', value: `${avgRoas.toFixed(2)}x`, x: 40, y: y + 78 },
      { label: 'Cliques', value: totalClicks.toLocaleString('pt-BR'), x: 200, y: y + 78 },
      { label: 'CTR Médio', value: `${avgCtr.toFixed(2)}%`, x: 360, y: y + 78 },
      { label: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), x: 40, y: y + 128 },
      { label: 'Mensagens', value: totalMessaging.toLocaleString('pt-BR'), x: 200, y: y + 128 },
      { label: 'Compras', value: totalPurchases.toLocaleString('pt-BR'), x: 360, y: y + 128 },
    ];

    if (totalPurchaseValue > 0) {
      cards.push({ label: 'Faturamento', value: `R$ ${totalPurchaseValue.toFixed(2)}`, x: 40, y: y + 178 });
    }

    for (const card of cards) {
      doc
        .rect(card.x, card.y, 150, 42)
        .fill('#F5F7FA')
        .roundedRect(card.x, card.y, 150, 42, 4)
        .fill('#F5F7FA');

      doc
        .fontSize(8)
        .fillColor('#888888')
        .font('Helvetica')
        .text(card.label, card.x + 8, card.y + 6, { width: 134 });

      doc
        .fontSize(14)
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text(card.value, card.x + 8, card.y + 20, { width: 134 });
    }

    doc.moveDown(10);
  }

  private renderCampaigns(doc: PDFKit.PDFDocument, rows: AdPerformanceModel[]) {
    const y = 290;

    doc
      .fontSize(13)
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text('Top Campanhas por Investimento', 40, y);

    doc
      .moveTo(40, y + 18)
      .lineTo(555, y + 18)
      .lineWidth(1)
      .strokeColor('#E0E0E0')
      .stroke();

    const campaignMap = new Map<string, { spend: number; leads: number; impressions: number; clicks: number; purchases: number; purchaseValue: number }>();

    for (const row of rows) {
      const name = row.campaignName || 'Sem nome';
      const existing = campaignMap.get(name) || { spend: 0, leads: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0 };
      existing.spend += Number(row.spend ?? 0);
      existing.leads += row.leads ?? 0;
      existing.impressions += row.impressions ?? 0;
      existing.clicks += row.linkClicks ?? 0;
      existing.purchases += row.purchases ?? 0;
      existing.purchaseValue += Number(row.purchaseValue ?? 0);
      campaignMap.set(name, existing);
    }

    const sorted = [...campaignMap.entries()]
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 10);

    const tableY = y + 28;
    const headers = ['Campanha', 'Investimento', 'Leads', 'CPL', 'CTR', 'Compras', 'ROAS'];
    const colWidths = [160, 75, 55, 60, 55, 60, 55];
    let colX = 40;

    for (let i = 0; i < headers.length; i++) {
      doc
        .fontSize(8)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text(headers[i], colX + 4, tableY, { width: colWidths[i] - 8, align: 'left' });
      colX += colWidths[i];
    }

    doc
      .rect(40, tableY - 2, 515, 16)
      .fill('#4267B2');

    colX = 40;
    for (let i = 0; i < headers.length; i++) {
      doc
        .fontSize(8)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text(headers[i], colX + 4, tableY, { width: colWidths[i] - 8, align: 'left' });
      colX += colWidths[i];
    }

    for (let i = 0; i < sorted.length; i++) {
      const [name, data] = sorted[i];
      const rowY = tableY + 20 + i * 18;
      const bgColor = i % 2 === 0 ? '#FFFFFF' : '#F5F7FA';

      doc
        .rect(40, rowY - 2, 515, 18)
        .fill(bgColor);

      const cpl = data.leads > 0 ? data.spend / data.leads : 0;
      const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      const roas = data.spend > 0 && data.purchaseValue > 0 ? data.purchaseValue / data.spend : 0;

      const values = [
        name.length > 25 ? name.substring(0, 22) + '...' : name,
        `R$ ${data.spend.toFixed(2)}`,
        data.leads.toLocaleString('pt-BR'),
        `R$ ${cpl.toFixed(2)}`,
        `${ctr.toFixed(1)}%`,
        data.purchases.toLocaleString('pt-BR'),
        `${roas.toFixed(1)}x`,
      ];

      colX = 40;
      for (let j = 0; j < values.length; j++) {
        doc
          .fontSize(8)
          .fillColor('#333333')
          .font('Helvetica')
          .text(values[j], colX + 4, rowY, { width: colWidths[j] - 8, align: 'left' });
        colX += colWidths[j];
      }
    }

    doc.moveDown(5);
  }

  private renderDailyBreakdown(doc: PDFKit.PDFDocument, rows: AdPerformanceModel[]) {
    const currentY = doc.y;
    const pageHeight = doc.page.height;

    if (currentY > pageHeight - 200) {
      doc.addPage();
    }

    const y = Math.max(currentY + 10, 100);

    doc
      .fontSize(13)
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text('Desempenho Diário', 40, y);

    doc
      .moveTo(40, y + 18)
      .lineTo(555, y + 18)
      .lineWidth(1)
      .strokeColor('#E0E0E0')
      .stroke();

    const dailyMap = new Map<string, { spend: number; leads: number; impressions: number; purchases: number; purchaseValue: number }>();

    for (const row of rows) {
      const date = row.date.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { spend: 0, leads: 0, impressions: 0, purchases: 0, purchaseValue: 0 };
      existing.spend += Number(row.spend ?? 0);
      existing.leads += row.leads ?? 0;
      existing.impressions += row.impressions ?? 0;
      existing.purchases += row.purchases ?? 0;
      existing.purchaseValue += Number(row.purchaseValue ?? 0);
      dailyMap.set(date, existing);
    }

    const sorted = [...dailyMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 15);

    const tableY = y + 28;
    const headers = ['Data', 'Investimento', 'Leads', 'CPL', 'Impressões', 'Compras'];
    const colWidths = [80, 90, 60, 70, 100, 70];
    let colX = 40;

    doc
      .rect(40, tableY - 2, 515, 16)
      .fill('#4267B2');

    for (let i = 0; i < headers.length; i++) {
      doc
        .fontSize(8)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text(headers[i], colX + 4, tableY, { width: colWidths[i] - 8, align: 'left' });
      colX += colWidths[i];
    }

    for (let i = 0; i < sorted.length; i++) {
      const [date, data] = sorted[i];
      const rowY = tableY + 20 + i * 18;

      if (rowY > pageHeight - 60) {
        doc.addPage();
      }

      const bgColor = i % 2 === 0 ? '#FFFFFF' : '#F5F7FA';
      doc
        .rect(40, rowY - 2, 515, 18)
        .fill(bgColor);

      const cpl = data.leads > 0 ? data.spend / data.leads : 0;
      const formattedDate = date.split('-').reverse().join('/');

      const values = [
        formattedDate,
        `R$ ${data.spend.toFixed(2)}`,
        data.leads.toLocaleString('pt-BR'),
        `R$ ${cpl.toFixed(2)}`,
        data.impressions.toLocaleString('pt-BR'),
        data.purchases.toLocaleString('pt-BR'),
      ];

      colX = 40;
      for (let j = 0; j < values.length; j++) {
        doc
          .fontSize(8)
          .fillColor('#333333')
          .font('Helvetica')
          .text(values[j], colX + 4, rowY, { width: colWidths[j] - 8, align: 'left' });
        colX += colWidths[j];
      }
    }
  }

  private renderFooter(doc: PDFKit.PDFDocument) {
    const pageHeight = doc.page.height;
    const y = pageHeight - 30;

    doc
      .fontSize(7)
      .fillColor('#AAAAAA')
      .font('Helvetica')
      .text(
        'GestorFácil — Relatório gerado automaticamente',
        40,
        y,
        { align: 'center', width: 515 }
      );
  }
}

export default new PdfService();
