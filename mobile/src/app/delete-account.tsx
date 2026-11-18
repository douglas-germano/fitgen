import { AppAlert } from '@/lib/feedback';
import { Mail, Trash2 } from 'lucide-react-native';
import { Linking } from 'react-native';

import { BadgeIcon, Button, Card, Page, Text, TopBar } from '@/components/ui';
import { useProfile } from '@/hooks/queries';

/** Account deletion currently uses the support request flow offered by the site. */
export default function DeleteAccountScreen() {
  const { data: profile } = useProfile();
  const requestDeletion = () => {
    const subject = encodeURIComponent('Exclusão de Conta');
    const body = encodeURIComponent(`Solicito a exclusão da minha conta FitGen e dos dados associados.\n\nEmail da conta: ${profile?.email ?? ''}`);
    Linking.openURL(`mailto:suporte@fitgen.com?subject=${subject}&body=${body}`).catch(() => AppAlert.alert('Solicitar exclusão', 'Envie um email para suporte@fitgen.com com o assunto “Exclusão de Conta”, usando o email cadastrado.'));
  };
  return (
    <Page topBar={<TopBar title="Excluir minha conta" back />}>
      <BadgeIcon icon={Trash2} size={48} tone="chip" />
      <Text variant="display">Solicitação de exclusão</Text>
      <Card><Text variant="titleMd">Seus dados de treino e alimentação</Text><Text muted>A solicitação inclui a conta, seu histórico de treinos, refeições e preferências. Confirme com o suporte os dados que serão removidos antes da exclusão.</Text></Card>
      <Text muted>Envie a solicitação pelo email cadastrado na sua conta. O botão abre uma mensagem para você revisar e enviar no seu aplicativo de email.</Text>
      <Button size="lg" variant="inverse" icon={Mail} title="Abrir email de solicitação" onPress={requestDeletion} />
      <Text variant="caption">Sua conta continua ativa até o atendimento da solicitação pelo suporte.</Text>
    </Page>
  );
}
