#!/bin/bash

# Script para configurar exclusões Git locais
# Evita que o Android Studio reclame de arquivos iOS

echo "⚙️  Configurando exclusões Git locais..."
echo ""

# Caminho do arquivo de exclusão local
EXCLUDE_FILE="/var/www/fitgen/.git/info/exclude"

# Adiciona padrões de exclusão para arquivos iOS
cat >> "$EXCLUDE_FILE" << 'EOF'

# Excluir arquivos iOS do tracking local (não afeta .gitignore compartilhado)
frontend/ios/App/App/Assets.xcassets/
frontend/ios/App/App/Base.lproj/
frontend/ios/App/App/*.swift
frontend/ios/App/App/*.plist
frontend/ios/App/App/*.storyboard
frontend/ios/App/App.xcodeproj/
frontend/ios/App/App.xcworkspace/
frontend/ios/CapApp-SPM/

EOF

echo "✅ Exclusões configuradas em: $EXCLUDE_FILE"
echo ""
echo "📋 Arquivos iOS agora serão ignorados localmente pelo Git"
echo "   (Isso não afeta outros desenvolvedores)"
echo ""
