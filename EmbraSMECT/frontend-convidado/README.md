# Frontend do convidado

Aplicação independente com inscrição pública, cadastro e acesso à página exclusiva de cada evento. O portal de ADM e organizadores continua em `frontend2`.

## Executar localmente

```bash
npm install
```

Crie `.env.local` com a URL da API:

```env
VITE_API_URL=http://localhost:5000
```

Inicie ou gere a versão de produção:

```bash
npm run dev
npm run build
```

## Publicar no Vercel

Crie um projeto Vercel apontando para este repositório e defina **Root Directory** como `EmbraSMECT/frontend-convidado`. O Vercel detecta Vite automaticamente; o diretório de saída é `dist`. Configure `VITE_API_URL` com a URL pública do backend, sem precisar acrescentar `/api`.

O arquivo `vercel.json` encaminha rotas como `/evento/EVT-000001/acesso` para o app, permitindo abrir e atualizar links de evento diretamente.
