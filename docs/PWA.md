# FitGen Web

O PWA usa as mesmas telas, componentes, tipografia Plus Jakarta Sans e tema Volt Fit do app Expo. O Worker `fitgen-pwa` serve o frontend em `web.fitgen.pro`. As chamadas do navegador passam por `/api` no mesmo domínio e seguem para o backend FitGen em `dev-api.fitgen.pro`. O painel administrativo continua no projeto Pages existente.

## Mapa de páginas

| Área | Rotas |
|---|---|
| Acesso | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/onboarding` |
| Início | `/`, `/coach`, `/hydration`, `/notifications`, `/achievements` |
| Treino | `/workouts`, `/workout/history`, `/workout/:id`, `/workout/:id/play/:dayId` |
| Alimentação e evolução | `/diet`, `/diet-plan`, `/diet-preferences`, `/shopping-list`, `/nutrition-history`, `/metrics` |
| Comunidade | `/social`, `/community/people`, `/community/post`, `/community/activity/:id`, `/community/user/:id`, `/community/settings` |
| Clubes | `/community/create-group`, `/community/join`, `/community/join/:code`, `/community/group/:id` e suas telas `members`, `settings` e `challenges` |
| Desafios | `/community/challenges`, `/community/create-challenge`, `/community/challenge/:id` |
| Conta | `/profile`, `/profile-edit`, `/privacy`, `/delete-account`, `/paywall` |

A instalação usa o manifesto e os ícones do FitGen. O service worker guarda a interface e os arquivos estáticos. Dados pessoais e gravações dependem de conexão. A caixa de notificações usa a API. Push nativo, integração Apple Saúde e compra via App Store ficam no app nativo. O PWA respeita o acesso da conta retornado pelo backend.

## Build e hospedagem

A partir da raiz do repo, com as dependências de `mobile` e `frontend` instaladas:

```sh
npm --prefix mobile run build:pwa
cd frontend
npx wrangler dev --config ../mobile/wrangler.pwa.toml --port 8788
```

Publicação após verificar o build e autenticar o Wrangler:

```sh
cd frontend
npx wrangler deploy --config ../mobile/wrangler.pwa.toml
```

O backend usa `FRONTEND_URL` para montar o link de recuperação enviado por e-mail. O Compose do backend define esse endereço como `https://web.fitgen.pro`.
