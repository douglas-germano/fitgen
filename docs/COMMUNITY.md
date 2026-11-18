# Comunidade FitGen

Implementação no app Expo e na API Flask. A aba Comunidade abre em Clubes e oferece as guias Clubes, Explorar e Seguindo; Explorar reúne desafios e publicações públicas. Pessoas e privacidade ficam na seção Comunidade das configurações do perfil; as telas auxiliares ficam em `mobile/src/app/community/`.

## Comportamento

- Grupos de até 20 pessoas, convite por código ou `fitgen://community/join/CODIGO`, administração de membros, ranking semanal e resumo solicitado pelo usuário.
- Feed paginado por cursor, reações, comentários e posts com foto. “Minha turma” combina amigos e grupos; “Descobrir” mostra publicações públicas. Tocar em Seguir cria uma solicitação pendente. A outra pessoa aceita ou recusa na tela de notificações; somente o aceite habilita o seguimento e o acesso às publicações destinadas à turma. O seguimento é direcional: seguir de volta exige outra solicitação. Códigos de amigo foram retirados do fluxo; os códigos de convite dos clubes continuam disponíveis. A API reutiliza a tabela community_friendships como registro direcional de solicitação, sem migração destrutiva. Registros antigos de seguimento público não concedem acesso sem aprovação.
- Desafios de treinos, minutos, dias ativos, hidratação ou refeições; participantes veem os respectivos progressos. Desafios públicos são criados pela equipe (API exige papel admin) ou pelo comando de seed.
- Treinos concluídos, conquistas, marcos de sequência, metas de água e conclusões de desafios geram eventos conforme as preferências de compartilhamento. Conclusão do desafio concede 100 XP e a conquista “Desafio Cumprido”; resultado concluído é preservado para impedir saída/reentrada com nova recompensa.
- Notificações da comunidade abrem o grupo, publicação, desafio ou solicitações correspondentes. Solicitações para seguir exibem Aceitar e Recusar na própria notificação. As listas e o indicador de não lidas atualizam a cada 15 segundos enquanto montados.

## Privacidade e moderação

Novas preferências começam com compartilhamento automático e descoberta por nome desligados. Ativar compartilhamento afeta eventos futuros; publicações anteriores podem ser excluídas individualmente. Peso, medidas e fotos de evolução não são copiados para a comunidade.

O ranking e o resumo respeitam as preferências e os bloqueios. A participação voluntária em desafios compartilha o progresso daquele desafio. Fotos manuais exigem decisão explícita de aprovação da IA; indisponibilidade ou resposta inválida impede a publicação. Texto utiliza filtro local se o provedor estiver indisponível. Três denunciantes distintos ocultam um post/comentário. Bloquear desfaz amizade e seguimento e impede acesso ao conteúdo nos dois sentidos.

Fotos são gravadas em `backend/instance/uploads/community`, fora da pasta estática. A API entrega a foto somente após validar JWT e acesso à publicação, com `Cache-Control: no-store`. Esse diretório precisa de volume persistente no servidor. O app evita cache de imagem em disco.

O canto superior esquerdo do Feed fica vazio. O botão flutuante + usa os componentes compartilhados FloatingAddButton e ActionMenu: o card sobe de baixo para cima, com ações de publicar, criar clube, entrar por código, criar desafio e abrir configurações.

## Banco e execução local

A migração é aditiva e idempotente, limitada a bancos configurados em localhost:

```sh
cd backend
venv/bin/python scripts/migrate_community.py
venv/bin/python scripts/run_local.py --host 192.168.18.6 --port 5002
```

O host do servidor deve corresponder à configuração `EXPO_PUBLIC_API_URL` do ambiente de desenvolvimento. A migração cria as tabelas `community_*` e os desafios públicos do mês, sem alterar tabelas anteriores. Foi aplicada no PostgreSQL local nesta implementação. Nenhum deploy de produção foi realizado.

Comandos operacionais (não agendados automaticamente):

```sh
flask --app wsgi community-seed-challenges  # repetir no início de cada mês
flask --app wsgi community-nudge            # lembretes de inatividade
```

## Validação

```sh
cd backend
venv/bin/python -m unittest discover -s tests -q
cd ../mobile
npm test
./node_modules/.bin/tsc --noEmit
npm run lint
./node_modules/.bin/expo export --platform ios --output-dir /tmp/fitgen-community-ios-export
```

Os testes da comunidade usam banco SQLite em memória e simulam o provedor de IA/push; verificam acesso por grupo, limites, administração, convites, opt-in, deduplicação, amizade, seguimento público, bloqueio, paginação, denúncias, proteção da foto, progresso de treino, recompensa e prevenção de recompensa repetida. A suíte de renderização cobre estados de conteúdo, vazio, carregamento e erro nos dois temas. Layout, gestos, compartilhamento nativo e entrega de push precisam de validação em aparelho. A moderação real depende da configuração existente do provedor de IA.


## Desativação temporária da moderação local

`COMMUNITY_MODERATION_ENABLED=false` no `backend/.env` desliga as verificações de texto e imagem do módulo comunidade. Foi aplicado a pedido do usuário para o teste local. Remover essa variável ou definir `true` reativa a moderação (o padrão). Reiniciar a API após mudar o valor. Formato/tamanho da foto, autenticação, acesso por público, denúncias e bloqueios continuam ativos. Essa opção não altera a configuração de IA dos outros módulos.


## Foto do clube

É possível escolher uma foto quadrada na criação do clube ou adicionar/trocar/remover depois na página dele. Somente administradores podem alterar; membros podem visualizar. A miniatura aparece em Clubes e no cabeçalho do grupo, com iniciais como alternativa. O upload é de até 10 MB e respeita a configuração atual de moderação da comunidade.

O campo opcional `community_groups.profile_picture` é incluído de forma aditiva e idempotente por `scripts/migrate_community.py` (já aplicado no banco local). Arquivos ficam em `backend/instance/uploads/community_groups`, fora da pasta pública; o GET autenticado de `/api/community/groups/<id>/image` valida a participação no clube antes de entregar a foto. Trocar ou remover a foto elimina o arquivo anterior. Esse diretório também precisa de armazenamento persistente no servidor.


## Clubes públicos/privados e navegação do feed

A criação e a edição administrativa permitem escolher Público ou Privado. Os clubes existentes permanecem privados por padrão (`community_groups.is_public`, coluna aditiva com DEFAULT FALSE). Clubes públicos aparecem em Explorar; qualquer usuário autenticado pode ver nome, descrição, foto e quantidade de participantes e entrar sem código, respeitando capacidade e bloqueio com administradores. O feed, os comentários, o ranking e os desafios continuam restritos aos membros, inclusive em clubes públicos. Clubes privados só admitem entrada por código de convite e não entram no catálogo público.

A tela de um clube participante mostra somente o cabeçalho com nome, voltar, opções administrativas e o feed. A publicação usa o mesmo botão flutuante + e card de ações das outras abas; foto, descrição, atalhos e botão de publicar não ocupam a parte superior. A foto acompanha o nome do clube no cabeçalho. Informações do clube ficam dentro do card do botão +, junto das opções de publicação e desafio; a saída fica acessível na página de informações. Administradores abrem Opções do clube pelo botão ... no topo direito; Gerenciar clube leva à tela separada de foto, nome, privacidade, membros, convites e exclusão. Membros/ranking e desafios têm páginas próprias. O menu administrativo não aparece para membros comuns.

Os feeds de Clubes/Explorar/Seguindo, dos clubes e dos perfis são atualizados puxando a tela para baixo. O indicador acompanha a atualização das consultas ativas da comunidade; não há botão Atualizar feed. O gesto funciona também com conteúdo curto ou vazio. Validado em testes de ligação do RefreshControl e ciclo do indicador; o gesto físico e o layout final continuam exigindo verificação no aparelho.


## Organização das abas da comunidade

Explorar contém apenas o feed público. Clubes reúne os clubes do usuário e os clubes públicos. A lista de desafios foi movida para uma tela própria, acessada pelo ícone de troféu no canto superior esquerdo do Feed; as notificações ficam à direita. O + ao lado do título Seus clubes foi retirado; permanece o + flutuante que abre o card de ações.
