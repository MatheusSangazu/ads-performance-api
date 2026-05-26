import LegalLayout from '../components/LegalLayout';

export default function Terms() {
  return (
    <LegalLayout title="Termos de Uso" lastUpdated="26 de maio de 2026">
      <p>Estes Termos de Uso ("Termos") regulam o acesso e uso da plataforma <strong>GestorFácil</strong>, operada pela <strong>Forjacorp</strong> — Matheus Henrique da Silva Alves (MEI). Ao acessar ou utilizar a plataforma, você concorda com estes Termos.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">1. Descrição do Serviço</h2>
      <p>O GestorFácil é uma plataforma de gestão e monitoramento de campanhas publicitárias que permite:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Visualizar métricas de performance de campanhas (Meta Ads e Google Ads)</li>
        <li>Receber alertas e notificações sobre saúde de contas e saldo</li>
        <li>Gerar relatórios e resumos de performance</li>
        <li>Definir metas e acompanhar projeções</li>
        <li>Gerenciar múltiplos clientes e gestores</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">2. Elegibilidade</h2>
      <p>Para utilizar a plataforma, você deve:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Ser maior de 18 anos</li>
        <li>Fornecer informações verdadeiras e atualizadas</li>
        <li>Possuir contas de anúncios ativas na Meta e/ou Google</li>
        <li>Não estar impedido de utilizar os serviços da Meta ou Google</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">3. Cadastro e Conta</h2>
      <p>O acesso à plataforma é feito por convite. Ao se cadastrar, você é responsável por:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Manter a confidencialidade de suas credenciais de acesso</li>
        <li>Todas as atividades realizadas em sua conta</li>
        <li>Notificar imediatamente qualquer uso não autorizado</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">4. Uso Aceitável</h2>
      <p>Ao utilizar o GestorFácil, você se compromete a:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Não utilizar a plataforma para fins ilegais ou não autorizados</li>
        <li>Não tentar acessar dados de outros usuários sem autorização</li>
        <li>Não realizar engenharia reversa, descompilar ou desmontar a plataforma</li>
        <li>Não interferir no funcionamento da plataforma ou infraestrutura</li>
        <li>Respeitar os termos de uso das APIs da Meta e do Google</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">5. Dados de Terceiros (Meta / Google)</h2>
      <p>A plataforma acessa dados das APIs da Meta e do Google exclusivamente com sua autorização. Você é responsável por:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Garantir que possui autorização para vincular as contas de anúncios</li>
        <li>Manter os tokens de acesso válidos e atualizados</li>
        <li>Responder pelos dados acessados através de sua autorização</li>
      </ul>
      <p>A plataforma não modifica campanhas, orçamentos ou configurações de anúncios — apenas realiza leitura de métricas e envio de notificações.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">6. Planos e Pagamento</h2>
      <p>O GestorFácil oferece diferentes planos com funcionalidades específicas. Os detalhes dos planos, preços e formas de pagamento estão disponíveis na plataforma. Os pagamentos são processados de forma segura e não armazenamos dados de cartão de crédito.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">7. Propriedade Intelectual</h2>
      <p>Todos os direitos de propriedade intelectual da plataforma GestorFácil, incluindo código, design, marcas, logotipos e conteúdo, pertencem à Forjacorp. É proibida a reprodução, distribuição ou modificação sem autorização prévia por escrito.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">8. Limitação de Responsabilidade</h2>
      <p>O GestorFácil é fornecido "como está" e "conforme disponível". A Forjacorp não garante que:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>O serviço será ininterrupto ou livre de erros</li>
        <li>Os dados de terceiros (Meta/Google) serão sempre precisos ou atualizados</li>
        <li>Os resultados obtidos atenderão a expectativas específicas</li>
      </ul>
      <p>A Forjacorp não se responsabiliza por decisões de negócio tomadas com base nos dados apresentados na plataforma.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">9. Encerramento</h2>
      <p>Você pode solicitar o encerramento de sua conta a qualquer momento através do e-mail de suporte. Após o encerramento:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Seus dados serão eliminados em até 30 dias</li>
        <li>As autorizações de API serão revogadas</li>
        <li>Notificações via WhatsApp serão desativadas</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">10. Alterações nos Termos</h2>
      <p>Podemos atualizar estes Termos periodicamente. Notificaremos você sobre alterações significativas por e-mail ou aviso na plataforma. O uso continuado da plataforma após alterações constitui aceitação dos novos Termos.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">11. Lei Aplicável</h2>
      <p>Estes Termos são regidos pela legislação brasileira. Quaisquer disputas serão submetidas ao foro da comarca do titular da Forjacorp, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">12. Contato</h2>
      <p>Para dúvidas sobre estes Termos, entre em contato:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>E-mail:</strong> matheussalvespro@gmail.com</li>
        <li><strong>Empresa:</strong> Forjacorp — Matheus Henrique da Silva Alves (MEI)</li>
      </ul>
    </LegalLayout>
  );
}
