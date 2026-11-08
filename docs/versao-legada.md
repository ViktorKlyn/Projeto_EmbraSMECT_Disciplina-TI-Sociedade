# Referência da versão legada EmbraSMECT

Este documento registra referências da implementação antiga `EmbraSMECT/`,
removida do workspace a pedido em 08/11/2026. A aplicação ativa documentada
neste repositório é a pilha da raiz: `frontend/` + `backend/`, com SQLite em
`database/embrasmect.db`.

## O que existia na versão legada

`EmbraSMECT/` continha uma implementação separada, com portal de gestão em
`frontend2/`, portal de convidados em `frontend-convidado/` e API em
`backend/`. A API antiga usa persistência JSON por padrão. O frontend usa Vite
e a API tem configuração, rotas e autenticação diferentes das aplicações da
raiz. Esses caminhos descrevem o conteúdo anterior e já não existem no
workspace.

## Referências históricas úteis

- `EmbraSMECT/README.md`: descreve funcionalidades e instruções da implementação
  antiga; inclui contas e senha demonstrativas. Consulte somente como registro
  histórico e não reutilize as credenciais.
- `EmbraSMECT/docs/arquitetura.md`: descreve o desenho pretendido para aquela
  implementação; algumas afirmações, como banco futuro e porta, não refletem
  necessariamente o runtime JSON.
- `EmbraSMECT/database/seed.sql`: contém nomes, e-mails e papéis históricos da
  equipe, mas também hashes de senha. Não execute, não copie para a raiz e não
  use esses hashes como credenciais atuais. A evidência relevante dos cinco
  acessos foi registrada em `RELATORIO_INCIDENTE_SQLITE.md`.
- `EmbraSMECT/database/schema.sql` e `database/migrations/`: usam sintaxe e
  estrutura SQL da versão antiga. Não são migrations do SQLite da aplicação
  raiz e não devem ser executados contra `database/embrasmect.db`.

## Por que o código não foi movido para a aplicação ativa

A cópia da API ou dos frontends antigos para a raiz misturaria contratos de
API, autenticação e persistência incompatíveis. A pasta foi removida do
workspace; seus arquivos constam como exclusões no Git e podem ser recuperados
do histórico anterior enquanto esse histórico for mantido. A remoção não foi
commitada. Os requisitos e o status da pilha raiz estão em
`AUDITORIA_TECNICA.md` e `CHECKLIST_ENTREGA.md`.
