import pool from '../config/db.js';

class ClientService {
    public async saveClient(name: string, actId: string, token: string, customEventId?: string, isEcommerce: number = 0) {
        const sql = `
    INSERT INTO clients_config (client_name, act_id, access_token, custom_event_id, is_ecommerce)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      client_name = VALUES(client_name),
      access_token = VALUES(access_token),
      custom_event_id = VALUES(custom_event_id),
      is_ecommerce = VALUES(is_ecommerce)
  `;

        await pool.query(sql, [name, actId, token, customEventId || null, isEcommerce]);
        return { success: true, message: `Cliente ${name} configurado com sucesso!` };
    }

    public async listClients() {
        const [rows] = await pool.query('SELECT client_name, act_id, custom_event_id FROM clients_config');
        return rows;
    }
}

export default new ClientService();