import { Shield } from 'lucide-react-native';

import { BadgeIcon, Card, Page, Text, TopBar } from '@/components/ui';

// Content carried over from frontend/src/app/privacidade/page.tsx.
const SECTIONS = [
  ['1. Introdução', 'Bem-vindo ao FitGen. Sua privacidade é nossa prioridade. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais ao utilizar nosso aplicativo de fitness e nutrição.'],
  ['2. Dados que coletamos', 'O FitGen pode coletar os seguintes tipos de dados para fornecer uma experiência personalizada:\n\nInformações de identificação: nome, email e foto de perfil (via login social).\n\nDados de saúde e físicos: idade, peso, altura, nível de atividade física e objetivos de fitness.\n\nDados de uso: registro de exercícios, consumo de água e refeições.'],
  ['3. Como usamos seus dados', 'Utilizamos suas informações exclusivamente para:\n\nGerar planos de treino e dieta personalizados através de nossa IA.\n\nMonitorar seu progresso e fornecer insights detalhados.\n\nMelhorar a funcionalidade e segurança do aplicativo.\n\nO FitGen não vende seus dados pessoais para terceiros.'],
  ['4. Segurança', 'Implementamos medidas de segurança técnicas e organizacionais robustas para proteger seus dados contra acesso não autorizado, alteração ou destruição.'],
  ['Apple Saúde', 'Conectar o Saúde permite escolher os dados que o FitGen pode ler e gravar. Ao conectar o Saúde, treinos e pesos dos últimos 90 dias são enviados para sua conta FitGen com suas datas e origens. A atualização é automática ao abrir ou voltar ao app e a cada minuto enquanto ele estiver aberto. Os passos do resumo são consultados no aparelho. Você pode interromper novas importações desconectando o Saúde no Perfil; os registros já importados permanecem salvos. Excluir um registro no Saúde não exclui sua cópia no FitGen. A importação não publica dados no feed social nem faz chamadas à IA. O peso importado pode atualizar o peso atual do seu perfil.'],
  ['5. Contato', 'Se você tiver dúvidas sobre esta política ou sobre seus dados, entre em contato conosco através do email: suporte@fitgen.com.'],
];

export default function PrivacyScreen() {
  return <Page topBar={<TopBar title="Privacidade" back />}>
    <BadgeIcon icon={Shield} size={48} />
    <Text variant="display">Política de Privacidade</Text>
    <Text variant="caption">Última atualização da política: 09 de janeiro de 2025</Text>
    {SECTIONS.map(([title, content]) => <Card key={title}><Text variant="titleMd">{title}</Text><Text muted selectable>{content}</Text></Card>)}
  </Page>;
}
