# Apple Saúde no FitGen

O app iOS importa treinos e pesos dos últimos 90 dias quando está aberto, após a pessoa conectar o Saúde. A conexão fica vinculada à conta que a ativou; outra conta precisa reconectar. Conexões anteriores à vinculação são associadas uma única vez à conta atual. Ao voltar ao app a sincronização se repete e, enquanto aberto, o app verifica novos registros a cada minuto. Perfil, Medidas e resumo exibem o status, sem botões de sincronização. Não há execução em segundo plano nesta versão.

## Persistência

`POST /api/health/sync` recebe `{user_id, samples}` em lotes de até 100. O usuário informado deve coincidir com o JWT. A tabela privada `health_imports` possui unicidade por usuário, tipo e UUID do Saúde, inclusive em requisições simultâneas. Os registros exportados pelo bundle do FitGen são excluídos antes da importação.

Treinos externos são armazenados sem criar planos ou sessões fictícias de musculação. `GET /api/health/workouts` retorna somente os treinos da conta autenticada, com data, duração ativa, calorias disponíveis e origem. O app reúne esses treinos com as sessões nativas no histórico e no resumo semanal. Importações não concedem XP nem completam automaticamente dias do plano de musculação.

Pesos geram `BodyMetric` com a data original e sem estimar gordura ou músculo. A conversão para data sem fuso segue o fuso legado do backend (`BRT_TZ`); o payload original permanece em UTC. O peso atual do perfil segue a medida mais recente, inclusive quando há uma medida manual mais nova que o lote importado. Nenhum registro importado é gravado de volta no Saúde.

O resumo compara sete datas locais incluindo hoje com as sete anteriores. Exibe quantidade e duração de treinos, último peso de cada período e passos registrados, com cobertura dos dias disponíveis. Ausência de leitura não é tratada como zero: o HealthKit não diferencia leitura negada de base vazia. Os passos são consultados no aparelho; a importação não faz chamadas a provedores de IA nem publica no feed social.

## Banco e execução local

Antes de iniciar o backend atualizado:

```sh
cd backend
venv/bin/python scripts/migrate_health.py
```

A migração é aditiva e idempotente; cria apenas `health_imports` e exige um banco em localhost. Para release em outro ambiente, aplicar a criação equivalente de `HealthImport.__table__` em uma migração revisada antes de iniciar o serviço. Não basta publicar só o JavaScript: os endpoints do backend também precisam estar disponíveis.

## Limites

- A sincronização depende do app aberto, da conexão com o servidor e das permissões do Saúde.
- Desconectar interrompe novas importações, mantendo os registros já importados no FitGen.
- Excluir um registro no Saúde não exclui automaticamente a cópia previamente importada no FitGen.
- Há deduplicação por UUID e exclusão das exportações do FitGen. Duas fontes externas que gravem UUIDs diferentes para a mesma atividade permanecem registros distintos.
- O HealthKit não identifica quem está usando a conta FitGen: conectar em outra conta exige nova autorização e importa os dados disponíveis naquele iPhone.

## Validação

`backend/tests/test_health_sync.py` verifica idempotência, isolamento, troca de conta, datas, preservação de peso manual recente e validação atômica do lote em SQLite isolado. Os testes mobile `health-reader.test.mjs` e `health-summary.test.mjs` verificam leitura nativa com fixtures, exclusão das próprias exportações, erros, janelas semanais e ausência de dados. Permissões e amostras reais exigem confirmação no iPhone.

## Android: Health Connect

No Android a mesma integração usa o Health Connect (`mobile/src/lib/health-connect.ts`, chamado por `health.ts`). O backend, a tabela `health_imports` e o fluxo de sincronização são os mesmos do iOS; os `sample_id` vêm do `metadata.id` do Health Connect.

- **Requisitos:** Android 14+ já traz o Health Connect; no Android 9–13 é preciso o app "Health Connect" da Play Store (o FitGen abre a loja se faltar). `minSdkVersion` 26. Não funciona no Expo Go, só em build nativo (`npx expo prebuild --platform android` e `npx expo run:android`).
- **Leitura:** treinos (`ExerciseSession`) e pesos dos últimos 90 dias, passos por dia, passos/energia ativa/distância de hoje, peso, gordura e massa magra. A leitura além de 30 dias usa a permissão `READ_HEALTH_DATA_HISTORY`, pedida à parte.
- **Escrita:** treino de musculação (com energia ativa), água, refeição (energia, proteína, carboidrato, gordura), peso, gordura e massa magra. Circunferência da cintura não existe no Health Connect e não é gravada.
- **Registros do próprio app:** são excluídos da importação pelo pacote `com.douglas.fitgen` (`metadata.dataOrigin`).
- **Permissões:** declaradas em `app.json` (`android.permissions`). O plugin `react-native-health-connect` adiciona a tela de justificativa exigida pelo Health Connect.
- **Play Store:** para publicar é preciso preencher a declaração de acesso a dados de saúde no Play Console.
- **Validação:** `mobile/tests/health-connect.test.mjs` cobre importação, exclusão dos próprios registros, falta de permissão, Play Store e escrita. O build `assembleDebug` compila com a lib. Permissões e dados reais precisam ser confirmados em um aparelho Android.
