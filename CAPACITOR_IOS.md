# Guia de Configuração iOS (Capacitor)

Este guia explica como preparar e gerar o aplicativo iOS para o FitGen.

> [!IMPORTANT]
> **Requisito Obrigatório**: Para gerar builds iOS (`.ipa`), você **PRECISA** de um computador **macOS** com **Xcode** instalado.
> Você **NÃO** pode gerar o build final iOS em Linux ou Windows.

## Pré-requisitos

1.  **Node.js >= 22.0.0**: O framework Capacitor 8 exige Node 22.
    ```bash
    node -v
    # Se for menor que 22, atualize:
    nvm install 22
    nvm use 22
    ```
2.  **Cocoapods**: Gerenciador de dependências do iOS.
    ```bash
    sudo gem install cocoapods
    ```

## 1. Preparação (no Linux/Windows/Mac)

Você pode preparar o projeto em qualquer sistema operacional:

```bash
cd frontend

# 1. Instalar dependência iOS
npm install @capacitor/ios --save --legacy-peer-deps

# 2. Adicionar plataforma iOS
# Isso cria a pasta 'ios/' com o projeto nativo
npx cap add ios

# 3. Sincronizar assets (HTML/CSS/JS)
npx cap sync ios
```

Ao final, você terá uma pasta `ios/` no seu projeto. Você deve versionar essa pasta no Git.

## 2. Build e Execução (APENAS macOS)

No seu Mac, após clonar o projeto e rodar `npm install`:

1.  **Abrir no Xcode**:
    ```bash
    npx cap open ios
    ```
    Isso abrirá o projeto nativo no Xcode.

2.  **Configurar Assinatura (Signing)**:
    *   No Xcode, clique no projeto (raiz) à esquerda (App).
    *   Vá na aba **Signing & Capabilities**.
    *   Selecione seu **Team** de desenvolvimento (Apple ID).
    *   Certifique-se que o Bundle Identifier é `com.douglas.fitgen`.

3.  **Rodar no Simulador**:
    *   Selecione um simulador (ex: iPhone 16 Pro) no topo.
    *   Clique no botão **Play** (Run).

4.  **Gerar Build para TestFlight / App Store**:
    *   Menu **Product** -> **Archive**.
    *   Após o archive, a janela Organizer abrirá.
    *   Clique em **Distribute App** para enviar para a App Store Connect.

## Troubleshooting

### Erro: `NodeJS >=22.0.0`
O Capacitor 8 exige Node 22. Atualize sua versão do Node.

### Erro de Dependências (Peer Deps)
Use sempre `--legacy-peer-deps` ao instalar pacotes:
```bash
npm install --legacy-peer-deps
```
