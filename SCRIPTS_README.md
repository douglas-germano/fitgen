# Scripts para Gerenciamento do Android Studio

Este diretório contém scripts úteis para facilitar o desenvolvimento Android e evitar problemas com o Git.

## 🚀 Scripts Disponíveis

### 1. `open-android.sh`
**Uso básico** - Abre o Android Studio diretamente na pasta `android`

```bash
./open-android.sh
```

**Quando usar:**
- Abertura normal do projeto Android
- Evita conflitos com arquivos iOS

---

### 2. `open-android-clean.sh`
**Uso avançado** - Limpa cache e abre o Android Studio

```bash
./open-android-clean.sh
```

**Quando usar:**
- Quando o Android Studio estiver lento
- Após mudanças grandes no projeto
- Para resolver problemas de sincronização Gradle
- Antes de começar um novo desenvolvimento

**O que faz:**
- Remove pasta `.idea` (configurações antigas)
- Limpa cache `.gradle`
- Remove arquivos de build
- Abre o projeto limpo

---

### 3. `setup-git-excludes.sh`
**Configuração única** - Configura exclusões Git locais

```bash
./setup-git-excludes.sh
```

**Quando usar:**
- ✅ **JÁ EXECUTADO!** Você não precisa rodar novamente
- Rode apenas se clonar o projeto em outro lugar

**O que faz:**
- Adiciona arquivos iOS ao `.git/info/exclude`
- Evita que o Android Studio reclame de arquivos iOS
- Não afeta outros desenvolvedores (local apenas)

---

## 🛠️ Solução de Problemas

### Problema: "Untracked Files Preventing Merge/Rebase"

**Solução rápida:**
1. Feche o Android Studio
2. Execute: `./open-android-clean.sh`
3. Isso abrirá o projeto corretamente

**Solução permanente:**
- Sempre use os scripts para abrir o Android Studio
- Nunca abra a pasta raiz `/var/www/fitgen`, sempre abra `/var/www/fitgen/frontend/android`

### Problema: Gradle não sincroniza

```bash
./open-android-clean.sh
```

### Problema: Android Studio detecta arquivos iOS

- ✅ Já resolvido com `setup-git-excludes.sh`
- Use `open-android.sh` para abrir o projeto

---

## 📌 Dicas

1. **Sempre abra o projeto usando os scripts**
2. **Marque os scripts como favoritos** no seu file manager
3. **Se o problema persistir**, use `open-android-clean.sh`

---

## 🎯 Atalhos Rápidos

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
# Adicione ao final do arquivo ~/.bashrc
alias android-fitgen='cd /var/www/fitgen && ./open-android.sh'
alias android-clean='cd /var/www/fitgen && ./open-android-clean.sh'
```

Depois, você pode usar:
```bash
android-fitgen      # Abre o projeto
android-clean       # Abre com limpeza
```

---

**Criado em:** 26/12/2025
**Localização:** `/var/www/fitgen/`
