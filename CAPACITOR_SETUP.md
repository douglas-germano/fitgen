# Preparação Capacitor para Android - Fitgen

## Resumo da Configuração

Este documento descreve como preparar e construir o app Android usando Capacitor com o frontend hospedado na nuvem.

### Arquitetura

- **Frontend**: Hospedado em `https://fitgen.suacozinha.site`
- **Backend**: Rodando em `https://fitgen.suacozinha.site/api` (ou domínio configurado)
- **WebView Android**: Irá carregar a URL hospedada via Capacitor
- **Build**: APK/AAB gerado via Android Studio ou Gradle CLI

### Arquivos Preparados

1. **`capacitor.config.json`**: Configuração do Capacitor
   - `appId`: `com.douglas.fitgen`
   - `appName`: `fitgen`
   - `webDir`: `out` (para export estático, se usado)
   - `server.url`: `https://fitgen.suacozinha.site` (aponta para frontend hospedado)

2. **`package.json`**: Capacitor adicionado às dependências

### Próximos Passos (Requer Node.js >= 22.0.0)

#### 1. Atualizar Node.js

```bash
# Verifique a versão atual
node --version

# Se < 22.0.0, instale a versão LTS 22 (ex: usando nvm)
nvm install 22
nvm use 22
```

#### 2. Adicionar Plataforma Android

```bash
cd /root/fitgen/frontend

# Instalar Capacitor (caso necessário, após atualizar Node)
npm install @capacitor/core @capacitor/cli --save --legacy-peer-deps

# Adicionar Android
npx cap add android

# Sincronizar (copiar web assets)
npx cap copy
npx cap sync

# Abrir Android Studio
npx cap open android
```

#### 3. Configurar no Android Studio

1. Abra a pasta `/root/fitgen/frontend/android` como projeto no Android Studio.
2. Sincronize o Gradle:
   - `File → Sync Now`
3. Configure o device/emulador:
   - AVD Manager (para emulador) ou conecte um dispositivo USB
4. Build e run:
   - `Run → Run 'app'` ou `Build → Build Bundle(s) / APK(s)`

#### 4. Ajustes Necessários

**AndroidManifest.xml** (geralmente em `android/app/src/main/AndroidManifest.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest ...>
    <!-- Permissões básicas -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:usesCleartextTraffic="false"
        ...>
        <!-- Activities e configs -->
    </application>
</manifest>
```

**Observação**: Como o app aponta para `https://fitgen.suacozinha.site`, o tráfego é seguro (HTTPS). `usesCleartextTraffic="false"` é o padrão seguro.

#### 5. Build para Produção

**Via Android Studio**:
1. `Build → Generate Signed Bundle / APK`
2. Selecione "Android App Bundle (AAB)" para Google Play
3. Crie ou selecione um keystore (certificado)
4. Assine o bundle

**Via CLI (Gradle)**:

```bash
cd /root/fitgen/frontend/android
./gradlew bundleRelease
# Gera: android/app/build/outputs/bundle/release/app-release.aab
```

#### 6. Testar em Emulador/Dispositivo

```bash
# Se usar emulador Android local e backend também local (ex: localhost:5000)
adb reverse tcp:5000 tcp:5000

# Ou atualize capacitor.config.json para apontar para backend de staging/prod
```

#### 7. Distribuição via Google Play

1. **Crie conta no Google Play Console** (https://play.google.com/console)
2. Suba o AAB gerado
3. Configure store listing, screenshots, política de privacidade
4. Submeta para review

### Variáveis de Ambiente

Para ambiente mobile, edite `NEXT_PUBLIC_API_URL` em `frontend/.env.local` (antes do build):

```bash
NEXT_PUBLIC_API_URL=https://fitgen.suacozinha.site/api
NEXT_PUBLIC_APP_NAME=fitgen
```

O build estático ou standalone inclui essas variáveis.

### Troubleshooting

**Erro**: `The Capacitor CLI requires NodeJS >=22.0.0`
- **Solução**: Atualize Node.js para v22 LTS

**Erro**: `appId already exists` ao adicionar Android
- **Solução**: Delete `android/` e tente `npx cap add android` novamente

**WebView não carrega URL**
- Verifique conectividade (WiFi, ADB reverse se necessário)
- Confira `capacitor.config.json` - `server.url` deve estar correto
- Se offline, use export estático (`output: export` em next.config.ts) e aponte `webDir` para `out/`

**Build lento no Android Studio**
- Espere sincronização do Gradle (primeira vez é lenta)
- Aumente heap da JVM: `File → Settings → Build, Execution, Deployment → Gradle → JVM heap size: 2GB+`

### Commits Necessários

Após completar a setup, faça commit:

```bash
cd /root/fitgen
git add frontend/capacitor.config.json frontend/package.json frontend/android/ frontend/package-lock.json
git commit -m "feat: add Capacitor and Android app structure for mobile"
git push origin main
```

### Referências

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Studio Setup](https://developer.android.com/studio)
- [Google Play Console](https://play.google.com/console)
