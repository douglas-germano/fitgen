# Armazenamento de imagens (Cloudflare R2)

Fotos de perfil, de posts e de clubes ficam num bucket **privado** do Cloudflare R2 (API S3).
O servidor confere quem pode ver cada imagem e entrega um **link temporário assinado** (1 h por padrão).
Sem as variáveis abaixo, o backend continua gravando em disco (modo local).

## Variáveis (`backend/.env`, fora do git)

| Variável | Descrição |
|---|---|
| `R2_ACCOUNT_ID` | ID da conta (32 hex), usado no endpoint `https://<id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | Nome do bucket (sem acesso público) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Par S3 do R2 |
| `R2_ENDPOINT` | Opcional: substitui o endpoint padrão |
| `R2_URL_TTL` | Opcional: validade dos links, em segundos (mín. 60, padrão 3600) |

Token de conta (`cfat_…`): Access Key ID = ID do token (`/accounts/<id>/tokens/verify`),
Secret = SHA-256 do valor do token.

## Como é guardado

No banco, o valor é `r2:<chave>` (ex.: `r2:avatars/user_<id>_<uuid>.jpg`, `r2:posts/<uuid>.png`,
`r2:groups/<grupo>_<uuid>.png`). Caminhos antigos (`uploads/...`) e URLs externas continuam válidos.
Código: `backend/app/shared/storage.py`.

## Migrar imagens já existentes

```bash
docker compose exec api python scripts/migrate_media_to_r2.py --dry-run
docker compose exec api python scripts/migrate_media_to_r2.py
```

Idempotente; não apaga os arquivos locais (remova depois de conferir o app).
Em produção, instale `boto3` (já em `requirements.txt`) e defina as variáveis no serviço.
