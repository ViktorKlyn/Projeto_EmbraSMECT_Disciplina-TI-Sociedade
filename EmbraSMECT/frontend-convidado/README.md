# Frontend do convidado

Aplicação frontend independente para cadastro e login de convidados. Ela usa a mesma API/backend já existente do projeto (Railway); não é necessário criar ou publicar outro backend. Depois de entrar, o convidado vê os eventos públicos aprovados do mês selecionado (o mês atual por padrão). Se o mês atual estiver vazio, a tela abre automaticamente o próximo mês com eventos. O convidado também pode navegar entre meses e se inscrever diretamente. Eventos marcados como reservados não aparecem na lista nem na página pública; o convidado precisa informar o código exato no campo de busca para localizá-los. O sistema mostra quando já está inscrito, quando o evento passou ou quando não há vagas. O portal de ADM, Gestores e organizadores continua em `frontend2`.

No cadastro, nome, e-mail e hash da senha são gravados pelo backend do projeto. No login, e-mail e senha são enviados ao mesmo backend para autenticação; a senha não é gravada novamente nem armazenada em texto simples.

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

Crie um projeto Vercel apontando para este repositório e defina **Root Directory** como `EmbraSMECT/frontend-convidado`. O Vercel detecta Vite automaticamente; o diretório de saída é `dist`. Nas Environment Variables desse projeto Vercel, configure `VITE_API_URL` com a URL pública do backend Railway já existente (por exemplo, `https://<seu-backend>.up.railway.app`), sem acrescentar `/api`. Faça um novo deploy após salvar a variável. O build de produção falha explicitamente se ela não estiver configurada, em vez de tentar chamar `localhost`.

O arquivo `vercel.json` encaminha rotas como `/evento/EVT-000001/acesso` para o app, permitindo abrir e atualizar links de evento diretamente. A rota `/cadastro` também abre a tela unificada de login/cadastro.
