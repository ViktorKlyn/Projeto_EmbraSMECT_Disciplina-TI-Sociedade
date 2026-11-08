# Auditoria técnica — Embrapa Meeting

**Data:** 08/11/2026  
**Etapa:** A — diagnóstico, sem correções de código

## Escopo e limites

Esta auditoria foi feita sobre o estado atual do repositório. Nenhum código,
configuração existente ou dado foi alterado. O arquivo da base SQLite não foi
aberto nem modificado. Também não iniciei os servidores: o backend antigo
executa criação/atualização de schema e seed no início, e a base já aparece
alterada no Git.

Não encontrei planilha de equipes/papéis, contrato de Sprint 1 ou outro
documento oficial Word, Excel ou PDF rastreado no repositório. Portanto, não é
possível decidir por esses documentos se Google Calendar, ordens de serviço ou
interface de convidados são requisitos aprovados.

Não foram executados builds, testes de aplicação, fluxo de reservas ou
integração Google. As verificações de dependências abaixo são apenas do estado
local da instalação; não provam que o sistema funciona após reinstalar os
pacotes.

## Estrutura e aplicações encontradas

| Caminho | Aplicação/propósito | Entrada e configuração | Persistência observada |
|---|---|---|---|
| `frontend/` | Portal React legado, criado com Create React App | `src/index.js`, `src/App.js`; `REACT_APP_API_URL`; build direcionado por `scripts/build.js` | Usa a API da raiz |
| `backend/` | API CommonJS/Express legada, com reuniões, reservas e integração Google | `src/server.js`; porta padrão 3000; `DATABASE_PATH` | SQLite em `database/embrasmect.db`, usando `node:sqlite` |
| `EmbraSMECT/frontend2/` | Portal de gestão React/Vite, com rotas por perfil | `src/main.jsx`, `src/App.jsx`; `VITE_API_URL` | Usa o backend de `EmbraSMECT/backend/` |
| `EmbraSMECT/frontend-convidado/` | Aplicação Vite separada para convidados e páginas públicas | `src/main.jsx`, `src/App.jsx`; `VITE_API_URL` | Usa o backend de `EmbraSMECT/backend/` |
| `EmbraSMECT/backend/` | API ESM/Express, autenticação JWT, gestão de eventos, salas e recursos | `src/server.js`; porta padrão 5000; `FRONTEND_URL`, `JWT_SECRET`, `EMBRASMECT_DATA_FILE` | Arquivo JSON em `backend/data/app-data.json` por padrão |
| `EmbraSMECT/Public/PaginaHMTL_EmbraSMECT/` | Página estática antiga e imagens | `index.html` | Nenhuma |
| `EmbraSMECT/Public/Tela/meu-projeto-react` | Referência Git do modo `160000` (gitlink), não uma pasta de fontes versionada normalmente neste repositório | Commit referenciado pelo Git | Não verificada |

O diretório `EmbraSMECT/frontend2/src/app/` também contém arquivos com aparência
de scaffold Expo, mas o ponto de entrada atual é `src/main.jsx` e não há
evidência de que esse scaffold seja usado pelo portal web. Não deve ser removido
sem confirmar seu uso.

### Qual aplicação é utilizada?

Não é possível comprovar qual aplicação está publicada sem acesso às
configurações dos projetos de hospedagem. O repositório contém sinais
contraditórios:

- O `vercel.json` da raiz publica `frontend/build`; o `README.md` da raiz
  descreve `frontend/` + `backend/`.
- `EmbraSMECT/README.md` descreve o portal de gestão em
  `EmbraSMECT/frontend2/`, o app de convidados em
  `EmbraSMECT/frontend-convidado/` e a API em `EmbraSMECT/backend/`.

Assim, há uma implantação raiz configurada e uma implantação EmbraSMECT
documentada, mas não há prova local de qual está efetivamente em uso. A
segunda pilha contém o fluxo mais amplo de papéis, espaços, recursos, eventos
e convidados; isso, por si só, não autoriza descartar a pilha raiz.

## Tecnologias e integração entre camadas

- **Pilha raiz:** React 18/Create React App → Axios → Express 4 → SQLite nativo
  do Node. O frontend usa `http://localhost:3000` como padrão, compatível com
  a porta padrão do backend. A API monta as rotas de reuniões e reservas sob
  `/api`.
- **Pilha `EmbraSMECT/`:** React 18/Vite/React Router → Axios → Express 4 em
  módulos ESM → repositórios que leem e gravam JSON. Os dois frontends usam
  `VITE_API_URL` e acrescentam `/api`; o backend monta login, eventos,
  reservas, recursos técnicos e usuários.
- **SQL/documentação:** há scripts SQL nas duas árvores, mas eles não
  identificam uma tecnologia única para o projeto. O runtime da pilha raiz é
  SQLite; o runtime da pilha `EmbraSMECT/` usa JSON, embora seu `schema.sql`
  descreva tabelas em sintaxe MySQL. As migrações SQL não são o mecanismo de
  persistência usado pelo repositório JSON.

Em termos simples, o frontend envia uma requisição HTTP pelo Axios; o Express
aplica autenticação e roteia para controladores/serviços; a camada de
repositório lê ou grava SQLite ou JSON, dependendo da pilha. Esse fluxo muda
entre as duas implementações.

## Diagnóstico por prioridade

### P0 — Bloqueia a execução no estado local verificado

1. **Dependências não instaladas para a pilha `EmbraSMECT/`.** `npm ls
   --depth=0` encontrou dependências ausentes no backend (incluindo
   `bcryptjs`, `dotenv`, `express-rate-limit`, `helmet` e `jsonwebtoken`) e no
   app de convidados. O portal `frontend2/` e os projetos raiz listaram suas
   dependências instaladas. No estado atual, não é possível iniciar/testar
   todas as aplicações sem restaurar as dependências. Os lockfiles existem;
   não executei instalação nesta etapa.

### P1 — Bloqueia ou compromete fluxos essenciais

1. **Não há uma única pilha claramente definida como versão de entrega.** As
   duas pilhas têm nomes, endpoints, autenticação, portas e persistências
   diferentes, e os arquivos de publicação e documentação discordam. Corrigir
   a aplicação errada pode deixar a versão publicada intacta.
2. **Autenticação não é real na pilha raiz.** A tela `frontend/src/pages/Login.js`
   só exige nome e uma senha mínima e chama a função de entrada local; não
   valida credenciais na API. O middleware raiz aceita um ID numérico como
   credencial e também permite `usuario_id` na query string. A interface de
   perfis não substitui autenticação/autorização no servidor. A pilha
   `EmbraSMECT/` possui login com senha, bcrypt, JWT e verificações de perfil,
   mas não foi testada nesta auditoria.
3. **Conflitos de reserva são tratados de modo diferente.** Na pilha raiz, o
   formulário não coleta intervalo de horário; a checagem de conflito ocorre
   no frontend, por sala e data, e o controlador da API não repete essa regra.
   Requisições concorrentes podem contornar uma checagem somente no navegador.
   A pilha `EmbraSMECT/` implementa horários e verificações de sobreposição
   para salas e recursos no backend, mas seu fluxo ainda precisa de teste.
4. **Persistência e schema divergem entre implementações.** A raiz grava em
   SQLite, enquanto `EmbraSMECT/backend/` grava JSON. Os scripts SQL não
   representam os dois runtimes de forma coerente. Além disso,
   `database/embrasmect.db` já está modificado no worktree; não se deve
   migrá-lo, recriá-lo ou rodar inicializações com escrita antes de confirmar
   os dados e a pilha oficial.
5. **Agenda/calendário e sincronização externa não estão unificados.** A
   integração Google aparece no backend e no README da raiz; não encontrei a
   mesma integração no backend `EmbraSMECT/`. O README da raiz informa que
   reservas são eventos de dia inteiro por não haver horário no formulário.
   Não encontrei evidência de uma visualização geral de calendário que permita
   validar duas semanas de agenda real. A integração Google não foi testada
   por depender de credenciais e configuração externa.

### P2 — Não bloqueia sozinho, mas precisa de decisão/registro

1. **Requisitos oficiais indisponíveis.** Sem o contrato/backlog, não é
   possível classificar Google Calendar, ordens de serviço ou interface de
   convidados como obrigatórios ou fora do escopo. A auditoria não os converte
   em requisitos.
2. **Documentação divergente e nome antigo persistente.** Existem dois
   READMEs de raiz de aplicação, um para cada pilha; textos, respostas da API e
   arquivos ainda usam `EmbraSMECT`. A nomenclatura não é uniforme.
3. **Testes não estão integrados à execução do backend raiz.** Há testes em
   `backend/tests/`, mas o `backend/package.json` não declara script `test`.
   O frontend raiz declara teste; nenhum teste foi executado nesta etapa.
4. **Possíveis itens sem uso confirmado.** A página estática, o gitlink e o
   scaffold em `frontend2/src/app/` coexistem com as aplicações React atuais.
   Não foram removidos nem consolidados.
5. **Ordens de serviço.** Não encontrei rotas ou páginas de ordem de serviço
   nas aplicações inspecionadas. Sua obrigatoriedade depende do contrato
   ainda não disponível.

## Funcionalidades observadas versus escopo

| Requisito | Situação observada |
|---|---|
| Autenticação e perfis | **Parcial:** simulação local na pilha raiz; login JWT e papéis implementados na pilha `EmbraSMECT/`, não testados |
| Cadastro/consulta de espaços | **Parcial:** espaços fixos na raiz; gestão de espaços documentada/implementada na pilha `EmbraSMECT/`, não testada |
| Reservas e aprovação | **Implementação existente nas duas pilhas**, mas com modelos e API incompatíveis; fluxo ponta a ponta **não testado** |
| Conflito de sala/horário | **Parcial na raiz** (checagem só no frontend, sem intervalos); regras por horário no backend `EmbraSMECT/`, não testadas |
| Recursos técnicos | **Parcial:** campo textual na raiz; cadastro e associação com salas/eventos na pilha `EmbraSMECT/`, não testados |
| Calendário de duas semanas | **Não confirmado:** há listas e consultas de eventos por data/mês, mas não evidência suficiente de uma agenda geral utilizável para duas semanas sem planilha |
| Google Calendar | **Parcial e isolado na pilha raiz;** escopo contratual e credenciais não disponíveis; **não testado** |
| Relatórios | **Implementados como telas/rotas nas duas pilhas; não testados** |
| Ordens de serviço técnicas | **Não encontrada**; requisito depende do contrato |
| Interface de convidados | **Existe** na pilha `EmbraSMECT/`; obrigatoriedade não presumida |

## Verificações executadas

- Runtime local: Node.js `v24.19.0`, npm `11.17.0`.
- `npm ls --depth=0`:
  - `frontend/`: dependências presentes.
  - `backend/`: dependências declaradas presentes.
  - `EmbraSMECT/frontend2/`: dependências presentes.
  - `EmbraSMECT/backend/`: dependências ausentes.
  - `EmbraSMECT/frontend-convidado/`: dependências ausentes.
- Builds, inicialização dos servidores, testes automatizados, fluxo de reservas,
  reinício/persistência e Google Calendar: **NÃO TESTADOS**.

## Riscos e plano mínimo após autorização

**Riscos a preservar:** o worktree já contém alterações locais em `README.md`,
`database/embrasmect.db`, `frontend/package.json`, `frontend/src/App.js`,
`vercel.json` e o diretório não rastreado `frontend/scripts/`. Essas alterações
foram preservadas. Iniciar o backend raiz pode gravar no SQLite; uma migração
ou troca de persistência pode causar perda de dados.

**Plano mínimo, sem consolidação de pastas:**

1. Confirmar com a equipe qual par frontend/backend está publicado e qual
   contrato/backlog é o aprovado.
2. Restaurar dependências pelo lockfile da pilha escolhida; registrar build e
   inicialização reais sem tocar na outra pilha.
3. Alinhar URLs, CORS e rotas apenas para o frontend/backend confirmados.
4. Validar login/perfis e o fluxo de reserva no servidor, incluindo conflito,
   aprovação, calendário e persistência após reinício.
5. Só então decidir sobre Google Calendar e recursos complementares e
   atualizar a documentação técnica correspondente.

**Fluxo a estudar:** entrada React em `frontend/src/index.js` ou
`EmbraSMECT/frontend2/src/main.jsx` → serviço Axios em
`src/services/api.js` → rotas/controladores Express → serviço/regra de negócio →
repositório → SQLite ou JSON. As duas opções de caminho correspondem a
aplicações distintas; não devem ser misturadas.

## Atualização após autorização da Etapa B

O usuário definiu `frontend/` + `backend/` como a pilha a corrigir e autorizou
uma migração aditiva e um provisionamento local de credenciais. Também definiu
que reservas ocupam o dia inteiro e que registros existentes devem ser
tratados como ocupação de dia inteiro.

- **Implementado e testado:** autenticação por e-mail/senha com hash scrypt,
  token de sessão assinado com `AUTH_SECRET`, restauração/logout de sessão no
  React e restrição de aprovação para perfis admin/gestor.
- **Implementado e testado:** criação de reservas serializada no SQLite,
  rejeição de outra reserva ativa para a mesma sala/data e revalidação antes
  da aprovação; edição da reserva pelo criador, com validação de conflito e
  controle de acesso.
- **Implementado e testado em banco temporário:** consulta de salas e cadastro
  restrito ao perfil admin, com validação de capacidade e rejeição de nomes
  duplicados.
- **Implementado; build verificado:** seleção de salas consultadas na API,
  exibição de capacidade e agenda de 14 dias com solicitações pendentes e
  aprovadas. A data é calculada em `America/Sao_Paulo`.
- **Implementado, aplicação à base original pendente:** coluna `senha_hash`
  aditiva. O provisionamento de cada usuário requer backup e execução local do
  comando documentado no README. Em 08/11/2026, um comando de testes legado foi
  executado sem `DATABASE_PATH` e pode ter alterado o SQLite padrão; detalhes
  e cópia de preservação estão em `RELATORIO_INCIDENTE_SQLITE.md`.
- **Testes executados:** após as correções do incidente, `npm test --prefix
  backend` passou nos 5 arquivos, cada um com SQLite temporário independente;
  incluem verificação de falha sem caminho e recusa do caminho padrão.
  `node --check` e `git diff --check` concluídos sem erro. A execução anterior
  de `node --test tests/*.test.js` foi insegura e não conta como validação.
- **Comportamento definido:** não há horários na reserva; sala e data formam
  uma ocupação de dia inteiro. Não foi feita migração deliberada. Uma
  execução de testes legados tentou usar a base original sem isolamento,
  conforme o incidente documentado; não houve teste funcional planejado com
  dados reais e o impacto não pode ser determinado sem baseline.
- **Parcial/não testado:** recursos são associados como texto livre; não há
  catálogo nem prevenção de conflitos de equipamentos. A visualização de 14
  dias foi compilada, mas não testada visualmente ou contra dados de produção.
- **Não testado:** integração Google Calendar, por depender de credenciais e
  serviço externo. A obrigatoriedade permanece dependente do contrato
  acadêmico, que não estava disponível.
- **Não encontrado na pilha selecionada:** ordens de serviço técnicas. Sua
  obrigatoriedade e o escopo de relatórios avançados dependem do contrato
  acadêmico indisponível. A aplicação de convidados da outra pilha não foi
  alterada.
- **Proteção de testes após incidente:** o runner atribui um SQLite temporário
  individual a cada arquivo; `db.js` rejeita ausência de `DATABASE_PATH` ou
  caminhos persistentes quando `NODE_ENV=test`. Runner completo verificado;
  hashes confirmaram que o banco original não mudou durante essa validação.
