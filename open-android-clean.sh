#!/bin/bash

# Script avançado para abrir o projeto Android
# Limpa cache e configurações VCS problemáticas

echo "🧹 Limpando cache do Android Studio..."
echo ""

# Caminho do projeto Android
PROJECT_PATH="/var/www/fitgen/frontend/android"

# Remove arquivos de cache do IntelliJ/Android Studio (se existirem)
if [ -d "$PROJECT_PATH/.idea" ]; then
    echo "🗑️  Removendo pasta .idea antiga..."
    rm -rf "$PROJECT_PATH/.idea"
fi

if [ -d "$PROJECT_PATH/.gradle" ]; then
    echo "🗑️  Limpando cache Gradle local..."
    rm -rf "$PROJECT_PATH/.gradle"
fi

# Remove arquivos de build
if [ -d "$PROJECT_PATH/app/build" ]; then
    echo "🗑️  Limpando pasta build..."
    rm -rf "$PROJECT_PATH/app/build"
fi

echo ""
echo "✅ Cache limpo com sucesso!"
echo ""

# Navega para o diretório do projeto
cd "$PROJECT_PATH"

# Configura Git para ignorar arquivos iOS no contexto do Android
echo "⚙️  Configurando Git local..."
git update-index --assume-unchanged ../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png 2>/dev/null || true

echo ""
echo "🚀 Abrindo Android Studio..."
echo ""

# Abre o Android Studio no diretório correto
if command -v studio &> /dev/null; then
    studio "$PROJECT_PATH" &
elif command -v android-studio &> /dev/null; then
    android-studio "$PROJECT_PATH" &
elif [ -f "/snap/bin/android-studio" ]; then
    /snap/bin/android-studio "$PROJECT_PATH" &
elif [ -d "/opt/android-studio" ]; then
    /opt/android-studio/bin/studio.sh "$PROJECT_PATH" &
else
    echo "⚠️  Android Studio não encontrado."
    echo "Abra manualmente: $PROJECT_PATH"
    exit 1
fi

echo "✨ Pronto! Android Studio está sendo iniciado..."
echo ""
echo "📌 IMPORTANTE:"
echo "   - O projeto foi aberto APENAS na pasta 'android'"
echo "   - Isso evita conflitos com arquivos iOS"
echo "   - Cache foi limpo para uma sessão fresca"
echo ""
