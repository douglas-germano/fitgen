# FitGen Mobile

App nativo do FitGen para iOS e Android, em **React Native + Expo (SDK 58)** com **Expo Router**.
Consome a mesma API Flask do frontend web (`../backend`).

## Rodando

```bash
cd mobile
npm install
npx expo start          # abre o Metro; pressione i (iOS) ou a (Android)
```

Push notifications e alguns módulos nativos exigem um **development build** (não funcionam no Expo Go):

```bash
npx expo run:ios        # precisa de Xcode
npx expo run:android    # precisa de Android Studio / SDK
# ou na nuvem, sem Xcode/Android Studio:
npx eas-cli@latest build --profile development --platform all
```

Para apontar para um backend local, copie `.env.example` para `.env.local` e use o IP da sua máquina
na rede (ex.: `http://192.168.0.10:5001/api`) — `localhost` não funciona no celular.

## Estrutura

```
src/
  app/                 rotas (Expo Router)
    _layout.tsx        providers + rotas protegidas (logado / deslogado)
    (tabs)/            Painel, Treino, IA Coach, Dieta, Medidas (abas nativas)
    workout/[id]/      plano de treino e player (play/[dayId])
    hydration.tsx, profile.tsx, login.tsx, forgot-password.tsx
  components/          UI compartilhada (ui.tsx) e registro de refeição
  hooks/queries.ts     todas as chamadas da API via React Query
  lib/api.ts           cliente HTTP, tokens no SecureStore, refresh automático
  providers/auth.tsx   sessão (login/logout)
  types/api.ts         tipos das respostas da API
```

## API local no Mac

Na pasta `backend/`, execute o servidor sem processos prefork:

```bash
venv/bin/python scripts/run_local.py --host 192.168.18.6 --port 5002
```

Use o IP atual do Mac no lugar do exemplo. O `mobile/.env.local` deve apontar
`EXPO_PUBLIC_API_URL` para `http://<IP-DO-MAC>:5002/api`, e o iPhone deve estar
na mesma rede. Esse servidor é para desenvolvimento local. Ele evita as quedas
de workers do Gunicorn causadas pela inicialização de bibliotecas Objective-C
após `fork()` no macOS. Reinicie o comando depois de alterar código Python.

## Verificação

```bash
npm run lint
npx tsc --noEmit
npm test
```

Os testes de renderização usam React Native Web com APIs nativas simuladas para
verificar conteúdo, carregamento, estado vazio e erro nas páginas. Gestos,
teclado e layout nativo também precisam ser conferidos no aparelho.

## Publicação

```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios      # App Store Connect
npx eas-cli@latest submit --platform android  # Google Play
```

O `bundleIdentifier`/`package` é `com.douglas.fitgen`, o mesmo do app Capacitor, então o novo app
substitui o antigo nas lojas como uma atualização.
