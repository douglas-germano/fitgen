#!/bin/bash

# Script para abrir o projeto Android no Android Studio
# Evita conflitos com arquivos iOS não rastreados

echo "🚀 Abrindo projeto Android no Android Studio..."
echo ""

# Caminho do projeto Android
PROJECT_PATH="/var/www/fitgen/frontend/android"

# Verifica se o diretório existe
if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ Erro: Diretório do projeto Android não encontrado em $PROJECT_PATH"
    exit 1
fi

# Navega para o diretório do projeto
cd "$PROJECT_PATH"

echo "📂 Diretório: $PROJECT_PATH"
echo ""

# Verifica o status do Git
echo "🔍 Verificando status do Git..."
git status --short

echo ""
echo "✅ Abrindo Android Studio..."
echo ""

# Abre o Android Studio no diretório correto
# Tenta diferentes comandos dependendo do sistema
if command -v studio &> /dev/null; then
    # Se o comando 'studio' estiver disponível
    studio "$PROJECT_PATH" &
elif command -v android-studio &> /dev/null; then
    # Se o comando 'android-studio' estiver disponível
    android-studio "$PROJECT_PATH" &
elif [ -f "/snap/bin/android-studio" ]; then
    # Se instalado via Snap
    /snap/bin/android-studio "$PROJECT_PATH" &
elif [ -d "/opt/android-studio" ]; then
    # Se instalado em /opt
    /opt/android-studio/bin/studio.sh "$PROJECT_PATH" &
else
    echo "⚠️  Android Studio não encontrado automaticamente."
    echo "Por favor, abra manualmente o diretório:"
    echo "$PROJECT_PATH"
    exit 1
fi

echo ""
echo "✨ Android Studio está sendo iniciado..."
echo "📌 Dica: Sempre abra a pasta 'android', não a raiz do projeto!"
echo ""
