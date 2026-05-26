import LegalLayout from '../components/LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout title="Política de Privacidade" lastUpdated="26 de maio de 2026">
      <p>A <strong>Forjacorp</strong>, inscrita sob o CNPJ/MEI de Matheus Henrique da Silva Alves, operadora da plataforma <strong>GestorFácil</strong> ("nós", "nosso" ou "plataforma"), está comprometida em proteger a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">1. Informações que Coletamos</h2>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-4">1.1 Dados fornecidos por você</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nome completo e endereço de e-mail</li>
        <li>Credenciais de acesso (senha armazenada de forma criptografada)</li>
        <li>Informações de faturamento e plano contratado</li>
        <li>Dados de contas de anúncios vinculadas (Meta Ads, Google Ads)</li>
      </ul>

      <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-4">1.2 Dados coletados automaticamente</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Métricas de performance de campanhas publicitárias (investimento, leads, cliques, impressões, conversões, ROAS, CTR)</li>
        <li>Status de contas de anúncios e alertas de saúde</li>
        <li>Dados de uso da plataforma (logs de acesso, funcionalidades utilizadas)</li>
      </ul>

      <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-4">1.3 Dados de terceiros (Meta / Google)</h3>
      <p>Utilizamos as APIs oficiais da Meta (Facebook/Instagram) e do Google para acessar dados de suas campanhas publicitárias. Os dados acessados incluem:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Performance de campanhas, conjuntos de anúncios e anúncios</li>
        <li>Métricas de público, posicionamento e região</li>
        <li>Saldo e status da conta de anúncios</li>
        <li>Conversões personalizadas configuradas</li>
      </ul>
      <p>Todos os dados de terceiros são acessados exclusivamente através de autorização prévia do usuário, conforme os termos de cada plataforma.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">2. Como Utilizamos suas Informações</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Prestar e melhorar os serviços da plataforma GestorFácil</li>
        <li>Gerar relatórios de performance e resumos de campanhas</li>
        <li>Enviar alertas e notificações sobre a saúde das contas de anúncios</li>
        <li>Enviar resumos periódicos via WhatsApp para gestores cadastrados</li>
        <li>Processar metas e projeções de campanhas</li>
        <li>Garantir a segurança e integridade da plataforma</li>
        <li>Cumprir obrigações legais e regulatórias</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">3. Compartilhamento de Dados</h2>
      <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais. Podemos compartilhar dados apenas nas seguintes situações:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Gestores vinculados:</strong> Gestores designados por você podem visualizar métricas e resumos dos clientes que gerenciam</li>
        <li><strong>Prestadores de serviço:</strong> Provedores de infraestrutura (hospedagem, banco de dados) sob acordos de confidencialidade</li>
        <li><strong>Obrigação legal:</strong> Quando exigido por lei, ordem judicial ou solicitação de autoridade competente</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">4. Armazenamento e Segurança</h2>
      <p>Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS) e em repouso. Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">5. Retenção de Dados</h2>
      <p>Mantemos seus dados pelo tempo necessário para prestar os serviços contratados e cumprir obrigações legais. Ao encerrar sua conta, os dados serão eliminados em até 30 dias, salvo quando a retenção for exigida por lei.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">6. Seus Direitos (LGPD)</h2>
      <p>De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Confirmar a existência de tratamento de seus dados pessoais</li>
        <li>Acessar seus dados pessoais</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
        <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
        <li>Solicitar a portabilidade dos dados</li>
        <li>Revogar o consentimento a qualquer momento</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">7. Uso de Cookies e Tecnologias Similares</h2>
      <p>Utilizamos tokens de autenticação (JWT) armazenados no navegador para manter sua sessão ativa. Não utilizamos cookies de rastreamento ou publicidade de terceiros.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">8. Notificações via WhatsApp</h2>
      <p>Ao cadastrar um número de WhatsApp para recebimento de notificações, você autoriza o envio de:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Resumos de performance dos clientes gerenciados</li>
        <li>Alertas de saldo baixo e status de contas</li>
        <li>Resumos semanais e de saúde das contas</li>
      </ul>
      <p>Você pode desativar as notificações a qualquer momento nas configurações da plataforma ou solicitando pelo e-mail de suporte.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">9. Alterações nesta Política</h2>
      <p>Podemos atualizar esta Política periodicamente. Notificaremos você sobre alterações significativas por e-mail ou aviso na plataforma.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">10. Contato</h2>
      <p>Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>E-mail:</strong> matheussalvespro@gmail.com</li>
        <li><strong>Empresa:</strong> Forjacorp — Matheus Henrique da Silva Alves (MEI)</li>
      </ul>

      <p className="mt-6 text-sm text-gray-400">Esta política foi elaborada em conformidade com a LGPD (Lei nº 13.709/2018) e os termos de uso das APIs da Meta e do Google.</p>
    </LegalLayout>
  );
}
