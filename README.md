# Embrapa Meeting

Projeto acadêmico simples para gerenciamento de salas e reservas.

## Backend

```bash
cd backend
npm install
npm start
```

A API estará disponível em `http://localhost:3000`. A rota `GET /` retorna uma mensagem de funcionamento.

Para executar todos os testes de backend:

```bash
cd backend
npm test
```

O runner cria um SQLite temporário isolado para cada arquivo de teste, exige
`DATABASE_PATH` explícito, imprime os caminhos usados e remove somente as pastas
temporárias que ele próprio criou. O banco padrão do projeto é recusado quando
`NODE_ENV=test`. A execução termina com código diferente de zero se algum teste
falhar. Não execute os arquivos de teste diretamente sem o runner.

Crie o arquivo local `backend/.env` (ele é ignorado pelo Git) e configure uma chave de sessão persistente. Gere-a uma vez e guarde-a em um local seguro; não a publique nem gere uma chave diferente a cada reinício:

```powershell
Set-Location backend
$secret = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
Set-Content .env "AUTH_SECRET=$secret"
npm start
```

O comando `npm start` carrega `backend/.env`. O backend valida sessões assinadas com essa chave. Sem `AUTH_SECRET`, as rotas protegidas recusam autenticação. Para fazer login, a conta também precisa ter uma senha configurada; consulte a seção **Banco de dados**. Nunca publique `.env`, a chave ou senhas.

## Salas e reservas

Usuários autenticados consultam as salas cadastradas e suas capacidades na tela **Reservas**. Administradores também podem cadastrar salas; nomes duplicados não são aceitos. Novas reservas, edições e aprovações são validadas no backend. Uma sala fica ocupada durante o dia inteiro quando há uma solicitação pendente ou aprovada; a agenda apresenta os próximos 14 dias. Recursos são informados como texto na solicitação e ainda não têm catálogo ou controle de disponibilidade próprio.

Para validar manualmente, inicie o backend e o frontend, entre com uma conta provisionada e:

1. Consulte a lista de salas e, com perfil admin, cadastre uma sala.
2. Crie uma reserva futura para essa sala e confirme que ela aparece na agenda.
3. Tente criar outra reserva para a mesma sala/data; a API deve rejeitar o conflito.
4. Com perfil admin/gestor, aprove a solicitação na tela de aprovação e confirme o status atualizado.
5. Reinicie o backend e consulte novamente a reserva persistida.

## Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm start
```

O React abrirá a aplicação em `http://localhost:3001` ou na próxima porta disponível.

Na Vercel, mantenha o **Root Directory** na raiz do repositório: o `vercel.json` instala e compila o frontend em `frontend/` e publica a pasta `frontend/build`. Configure `REACT_APP_API_URL` nas Environment Variables do projeto com a URL pública do backend (sem acrescentar `/api`); o build também aceita `VITE_API_URL` para compatibilidade. Depois de salvar a variável, faça um novo deploy. O build de produção falha se nenhuma URL de API estiver configurada, em vez de publicar uma aplicação que tenta acessar `localhost`.

## Banco de dados

O backend inicializa e atualiza o SQLite em `database/embrasmect.db` ao iniciar.

As contas existentes precisam receber uma senha individual antes do primeiro login. Faça um backup do banco, pare o backend e configure a senha no terminal interativo; o comando não aceita senhas pela linha de comando e grava somente o hash:

```powershell
Set-Location backend
Copy-Item ..\database\embrasmect.db ..\database\embrasmect.db.bak
$env:DATABASE_PATH = (Resolve-Path ..\database\embrasmect.db).Path
npm run set-password -- usuario@exemplo.org
```

Use um e-mail de usuário já cadastrado. Repita para cada conta que precisa acessar o sistema. O script pede a senha no terminal e atualiza somente `senha_hash`; ele não inicializa a aplicação, executa seeds ou migrations. Se a coluna não existir, o script para sem modificar o banco. Não adicione o backup, senhas ou `AUTH_SECRET` ao Git.

As contas EQ-01 restauradas usam os e-mails históricos `joaoklein@email.com`,
`fernandovinicius@email.com`, `gustavolira@email.com`,
`nicolastoshio@email.com` e `lormiluskendy@email.com`. Cada integrante precisa
definir uma senha individual com o comando acima antes de entrar. Para múltiplas
contas, repita `npm run set-password -- email` para cada endereço; a senha é
digitada no prompt oculto e nunca deve ser compartilhada pelo chat.

Se for necessário provisionar novamente a equipe em um banco existente, faça
backup e pare o backend antes de executar. O comando exige o caminho explícito,
cria somente contas ausentes, preserva contas existentes e não define senhas:

```powershell
Set-Location backend
$env:DATABASE_PATH = (Resolve-Path ..\database\embrasmect.db).Path
npm run provision-eq01-users
```

## Google Agenda

O projeto sincroniza reuniões criadas e reservas aprovadas com a agenda principal da conta Google do criador. Reservas só são sincronizadas após aprovação; ao conectar uma conta, eventos anteriores ainda ativos/aprovados também são sincronizados. Reservas são eventos de dia inteiro, pois o formulário de reserva não solicita horário. Reuniões usam os horários informados e o fuso `America/Sao_Paulo` por padrão.

Para habilitar:

1. No Google Cloud Console, habilite a Google Calendar API e configure a tela de consentimento OAuth, incluindo sua conta como usuária de teste se o app estiver em modo de teste.
2. Crie um OAuth Client ID do tipo aplicação Web com URI de redirecionamento `http://localhost:3000/api/google-calendar/callback`.
3. Gere uma chave de criptografia uma vez e guarde-a em local seguro:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Copie as variáveis abaixo para `backend/.env` (preservando as configurações já existentes) e preencha as credenciais OAuth criadas no Google Cloud. Gere uma chave de criptografia com o comando acima e mantenha-a persistente:

```powershell
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_TOKEN_ENCRYPTION_KEY=chave-hexadecimal-persistente-de-64-caracteres
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
GOOGLE_CALENDAR_TIME_ZONE=America/Sao_Paulo
FRONTEND_URL=http://localhost:3001
```

`backend/.env.example` lista as variáveis sem credenciais. No cliente OAuth Web do Google, cadastre exatamente `http://localhost:3000/api/google-calendar/callback` como URI de redirecionamento autorizado. Se o frontend usar outra porta, ajuste `FRONTEND_URL`. Reinicie o backend após editar `.env`. Nunca publique `backend/.env`, o segredo do cliente ou a chave de criptografia.

Na tela **Reuniões**, conecte a conta Google e use o formulário para criar reuniões. O backend usa OAuth para sincronizar reuniões e reservas aprovadas na agenda principal da conta autorizada; os tokens são armazenados criptografados no SQLite local. Em produção, configure a URI de callback pública do backend no Google Cloud e defina a mesma URI em `GOOGLE_REDIRECT_URI`; configure `FRONTEND_URL` com a origem pública do frontend.

As contas do Embrapa Meeting autenticam-se por e-mail e senha configurada localmente. A integração Google continua vinculada à conta Google que cada usuário autoriza; mantenha `AUTH_SECRET` e as credenciais OAuth fora do repositório.

## Versão legada

A implementação anterior EmbraSMECT foi removida do workspace a pedido; ela
não é necessária para iniciar a aplicação atual. A auditoria e as referências
históricas, incluindo quais arquivos não devem ser usados como configuração ou
seed, estão em [docs/versao-legada.md](docs/versao-legada.md) e
[AUDITORIA_TECNICA.md](AUDITORIA_TECNICA.md). Não misture os frontends, APIs ou
bancos das duas versões.
