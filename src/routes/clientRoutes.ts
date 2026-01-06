import { Router } from 'express';
import clientService from '../services/clientService.js';
import reportService from '../services/reportService.js';

const router = Router();

// Rota para cadastrar ou atualizar token
router.post('/', async (req, res) => {
  const { name, act_id, access_token, custom_event_id } = req.body;
  
  if (!name || !act_id || !access_token) {
    return res.status(400).json({ error: 'Nome, act_id e access_token são obrigatórios.' });
  }

  try {
    const result = await clientService.saveClient(name, act_id, access_token, custom_event_id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para listar clientes
router.get('/', async (req, res) => {
  try {
    const clients = await clientService.listClients();
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:actId/download', async (req, res) => {
  const { actId } = req.params;

  try {
    const workbook = await reportService.generateExcel(actId);
    
    // Configura os headers para o navegador entender que é um download de arquivo
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=relatorio_${actId}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;