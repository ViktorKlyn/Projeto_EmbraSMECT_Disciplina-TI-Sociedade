# EmbraSMECT

Projeto acadêmico simples para gerenciamento de eventos, espaços e recursos.

## Requisitos

- Node.js 18 ou superior
- npm

## Backend

```bash
cd backend
npm install
npm run dev
```

A API ficará disponível em `http://localhost:5000`. O endpoint `GET /api/status` confirma o funcionamento.

Se aparecer `EADDRINUSE`, a porta já está sendo usada por uma instância do backend. Verifique `http://localhost:5000/api/status` e reutilize essa instância; não execute `npm run dev` novamente em outro terminal. Para iniciar uma nova instância, encerre o processo anterior primeiro.

Crie `backend/.env` a partir de `backend/.env.example`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=use-uma-chave-longa-e-aleatoria
EMBRASMECT_DATA_FILE=
```

- `PORT`: porta em que o Express escuta. Localmente usamos `5000` para evitar conflito com processos na porta `3000`; no Railway, o valor fornecido pelo ambiente é usado.
- `FRONTEND_URL`: origem do frontend permitida pelo CORS.
- `JWT_SECRET`: chave privada usada para assinar e validar os tokens de login.
- `EMBRASMECT_DATA_FILE`: caminho opcional para o arquivo JSON persistente. Por padrão, os dados são gravados em `backend/data/app-data.json`, ignorado pelo Git.

## Frontend

Em outro terminal:

```bash
cd frontend2
npm install
npm run dev
```

Para apontar o frontend para o backend local, copie `frontend2/.env.local.example` para `frontend2/.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

O Vite lê `VITE_API_URL` durante o desenvolvimento e o cliente Axios acrescenta `/api` às chamadas. O arquivo `.env.local` é específico da máquina e não deve conter segredos compartilhados.

Em produção na Vercel, configure `VITE_API_URL` nas Environment Variables do projeto com a URL pública do backend. Configure também no backend as variáveis `JWT_SECRET`, `PORT` e `FRONTEND_URL` com os valores da hospedagem.

O frontend de convidados é um projeto Vercel independente em `frontend-convidado`. Configure nele `VITE_API_URL` com a URL pública do backend. No projeto Vercel do portal de gestão, configure `VITE_GUEST_APP_URL` com o domínio publicado do frontend de convidados para que os links e QR codes dos eventos levem ao projeto correto.

## Contas de demonstração

As contas abaixo são fictícias e servem apenas para testar os perfis. A senha comum é `EmbraTeste@2026`.

| Perfil | E-mail |
| --- | --- |
| Organizador | `marina.costa@embrasmect.test` |
| Organizador | `rafael.nunes@embrasmect.test` |
| Convidado | `lia.mendes@embrasmect.test` |
| Convidado | `caio.freitas@embrasmect.test` |

As contas ADM existentes continuam disponíveis com as credenciais anteriores. Usuários, espaços, reservas, inscrições e assentos são persistidos localmente em `backend/data/app-data.json`, inclusive após reiniciar o backend. Não use essas contas ou senhas em produção. Em hospedagens cuja unidade de disco é temporária, configure armazenamento persistente ou defina `EMBRASMECT_DATA_FILE` para um volume durável.

O organizador vê somente as próprias solicitações na tela Reservas; nos relatórios, pode consultar todos os eventos e abrir a página de qualquer um deles para se inscrever com a própria conta. ADM também pode abrir eventos e se inscrever. Cada usuário consulta apenas as próprias inscrições, sem acesso à lista de participantes de eventos de outros organizadores. Somente o ADM principal pode ver os e-mails dos convidados inscritos. Quem cadastrou o evento pode alterá-lo ou excluí-lo na tela **Reservas**; a exclusão também remove as inscrições vinculadas. O brinde ao final é opcional. O total de participantes e a ocupação são calculados pelas inscrições efetivas, limitadas pela capacidade do espaço. O convidado vê eventos aprovados em que se inscreveu. A gestão de assentos é opcional por evento; quando ativada, o organizador atribui assentos individuais.

Reservas criadas por ADM entram diretamente como aprovadas. Reservas solicitadas por organizadores continuam aguardando a aprovação do ADM. Eventos não podem ser criados ou alterados para datas passadas. Quem cadastrou um evento pode alterar seus dados ou excluí-lo na tela Reservas. O brinde ao final é opcional.

Cada evento recebe um código público sequencial, como `EVT-000001`, permite uma descrição opcional de até 2000 caracteres, exige horários de início e término no mesmo dia (a duração é calculada automaticamente) e aceita até 10 recursos técnicos. O app independente de convidados reúne login e cadastro; após entrar, o convidado informa o código para consultar o evento e confirmar a inscrição. A inscrição só pode ser confirmada em eventos aprovados, futuros e com vagas disponíveis. O organizador compartilha o link e o QR code da área do convidado pela tela **Reservas**. A página pública `/evento/<código>` continua disponível para consultar detalhes e também aceita inscrição pública por nome/e-mail. A página exclusiva `/evento/<código>/acesso` abre a área autenticada do convidado com o código já preenchido. O ADM principal gerencia espaços na opção **Espaços**; ao criar ou editar um evento, o usuário pode optar por unir dois espaços configurados para uso conjunto. A capacidade do evento será a soma das capacidades, e os espaços compartilhados não podem ter eventos simultâneos.

## Gestão de acessos

- A sessão permanece ativa ao recarregar a página enquanto o token de acesso estiver válido (2 horas); depois disso, é necessário entrar novamente.
- ADM e organizadores entram pela tela de gestão (`/login`); convidados usam o app separado para criar conta ou entrar e, depois, informar o código do evento para confirmar a inscrição.
- ADM cadastra gestores na tela **Contas** (`/usuarios`) e pode promover um organizador a ADM.
- O ADM principal pode rebaixar ou excluir outros ADMs, além de cadastrar e renomear espaços, editar capacidades, configurar pares de espaços para uso conjunto e remover espaços sem reservas vinculadas na opção **Espaços** da navegação. Renomear um espaço também atualiza os eventos já vinculados a ele.
- O cadastro público em `/cadastro` sempre cria um convidado; o papel enviado pelo navegador não é aceito.
- Após uma promoção, o usuário precisa entrar novamente para receber um token com o novo papel.
- Os dados da aplicação são gravados em arquivo local. Para executar mais de uma instância do backend ou publicar em um ambiente sem disco persistente, configure um armazenamento compartilhado durável antes de usar.

## Banco de dados

Para uma base nova, execute `database/schema.sql` e depois `database/seed.sql`. Em uma base existente, aplique as migrações ainda não executadas na pasta `database/migrations`, incluindo `003_detalhes_evento.sql`, `004_inscricoes_assentos.sql`, `005_nome_codigo_evento.sql` e `006_descricao_evento.sql`.
