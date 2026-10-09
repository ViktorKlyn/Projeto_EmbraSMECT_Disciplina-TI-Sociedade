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

O portal de gestão é publicado na Vercel com **Root Directory** `EmbraSMECT/frontend2`; a configuração de rewrites desse frontend encaminha rotas como `/login` para o app React, inclusive ao abrir ou atualizar o endereço diretamente. O frontend de convidados é um projeto Vercel independente com **Root Directory** `EmbraSMECT/frontend-convidado`. Configure `VITE_API_URL` em ambos com a URL pública do backend. No projeto Vercel do portal de gestão, configure `VITE_GUEST_APP_URL` com o domínio publicado do frontend de convidados para que os links e QR codes dos eventos levem ao projeto correto.

## Contas de demonstração

As contas abaixo são fictícias e servem apenas para testar os perfis. A senha comum é `EmbraTeste@2026`.

| Perfil | E-mail |
| --- | --- |
| Organizador | `marina.costa@embrasmect.test` |
| Organizador | `rafael.nunes@embrasmect.test` |
| Convidado | `lia.mendes@embrasmect.test` |
| Convidado | `caio.freitas@embrasmect.test` |

As contas administrativas existentes continuam disponíveis com as credenciais anteriores. Na interface, a conta administrativa principal aparece como **ADM** e as demais contas administrativas como **Gestor**. ADM e Gestores podem aprovar reservas e gerenciar contas; apenas ADM pode gerenciar espaços, rebaixar ou excluir Gestores e ver e-mails de convidados. Usuários, espaços, reservas, inscrições e recursos técnicos são persistidos localmente em `backend/data/app-data.json`, inclusive após reiniciar o backend. Não use essas contas ou senhas em produção. Em hospedagens cuja unidade de disco é temporária, configure armazenamento persistente ou defina `EMBRASMECT_DATA_FILE` para um volume durável.

Na tela **Reservas**, o ADM visualiza e pode editar ou excluir qualquer evento; Gestores e organizadores visualizam e gerenciam somente os eventos que criaram. A aprovação de solicitações continua disponível na tela **Aprovação**. Nos relatórios, organizadores podem consultar todos os eventos e abrir a página de qualquer um deles para se inscrever com a própria conta. ADM e Gestores também podem abrir eventos e se inscrever. Cada usuário consulta apenas as próprias inscrições, sem acesso à lista de participantes de eventos de outros organizadores. Somente o ADM pode ver os e-mails dos convidados inscritos. O brinde ao final é opcional. O total de participantes e a ocupação são calculados pelas inscrições efetivas, limitadas pela capacidade do espaço. O convidado vê eventos aprovados em que se inscreveu.

Reservas criadas por ADM ou Gestores entram diretamente como aprovadas. Reservas solicitadas por organizadores continuam aguardando a aprovação do ADM ou de um Gestor. Eventos não podem ser criados ou alterados para datas passadas. O ADM pode editar e excluir qualquer evento; Gestores e organizadores podem alterar ou remover somente os eventos que cadastraram. O brinde ao final é opcional.

Cada evento recebe um código sequencial, como `EVT-000001`, permite uma descrição opcional de até 2000 caracteres, exige horários de início e término no mesmo dia (a duração é calculada automaticamente) e permite selecionar qualquer quantidade de recursos técnicos previamente cadastrados. Um recurso técnico não pode ser reservado em eventos com horários sobrepostos; o backend valida essa disponibilidade tanto na criação quanto na edição. Ao criar ou editar um evento, o responsável pode marcá-lo como **reservado**. O app independente de convidados reúne login e cadastro; após entrar, o convidado vê os eventos públicos aprovados do mês selecionado (mês atual por padrão); se o mês atual estiver vazio, abre automaticamente o próximo mês com eventos. O convidado pode navegar entre meses e se inscrever diretamente nos eventos futuros com vagas disponíveis. Eventos reservados não aparecem nessa lista nem na página pública; ao abrir um endereço de evento reservado, o convidado ou membro da equipe pode informar o ID ou código para prosseguir pelo fluxo autenticado. Na gestão, o ADM pode localizar qualquer evento reservado; Gestores e organizadores podem localizar os próprios. O organizador compartilha o código de um evento reservado apenas com os convidados autorizados; para eventos públicos, continua podendo compartilhar o link e o QR code pela tela **Reservas**. A página pública `/evento/<código>` continua disponível para consultar eventos públicos e também aceita inscrição pública por nome/e-mail. A página exclusiva `/evento/<código>/acesso` abre a área autenticada do convidado. O ADM gerencia espaços na opção **Espaços**; ao criar ou editar um evento, o usuário pode optar por unir dois espaços configurados para uso conjunto. A capacidade do evento será a soma das capacidades, e os espaços compartilhados não podem ter eventos simultâneos.

A opção **Recursos técnicos** na navegação permite que ADM, Gestores e organizadores cadastrem e excluam equipamentos por categoria (**Áudio**, **Vídeo**, **Informática**, **Iluminação** ou **Outros**), editem seus nomes e atualizem o status para **OK** ou **Manutenção**. Apenas o ADM pode fixar um equipamento em um espaço; ao remover esse espaço, os equipamentos são automaticamente desvinculados.

## Gestão de acessos

- A sessão permanece ativa ao recarregar a página enquanto o token de acesso estiver válido (2 horas); depois disso, é necessário entrar novamente.
- ADM, Gestores e organizadores entram pela tela de gestão (`/login`); convidados usam o app separado para criar conta ou entrar e, depois, informar o código do evento para confirmar a inscrição.
- ADM e Gestores podem gerenciar contas na tela **Contas** (`/usuarios`) e promover organizadores a Gestor.
- Apenas o ADM pode rebaixar ou excluir Gestores, além de cadastrar e renomear espaços, editar capacidades, configurar pares de espaços para uso conjunto e remover espaços sem reservas vinculadas na opção **Espaços** da navegação. Renomear um espaço também atualiza os eventos já vinculados a ele.
- O cadastro público em `/cadastro` sempre cria um convidado; o papel enviado pelo navegador não é aceito.
- Após uma promoção, o usuário precisa entrar novamente para receber um token com o novo papel.
- Os dados da aplicação são gravados em arquivo local. Para executar mais de uma instância do backend ou publicar em um ambiente sem disco persistente, configure um armazenamento compartilhado durável antes de usar.

## Banco de dados

Para uma base nova, execute `database/schema.sql` e depois `database/seed.sql`. Em uma base existente, aplique as migrações ainda não executadas na pasta `database/migrations`, incluindo `003_detalhes_evento.sql`, `004_inscricoes_assentos.sql`, `005_nome_codigo_evento.sql` e `006_descricao_evento.sql`.
