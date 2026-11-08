# Relatório de correções — Embrapa Meeting

## Decisões preservadas

- Foi mantida a pilha raiz React + Express + SQLite, conforme escolha do usuário.
- Reservas continuam sendo de dia inteiro; pendências e aprovações ocupam a sala naquele dia.
- Não houve migração deliberada da base de dados existente, alteração de credenciais reais, commit ou push.
- Os testes focados usaram SQLite temporário. Uma execução de testes legados sem isolamento pode ter alterado a base padrão; consultar `RELATORIO_INCIDENTE_SQLITE.md`.

## Alterações realizadas

| Arquivos | Problema e causa | Correção |
|---|---|---|
| `backend/src/services/authService.js`, `backend/src/controllers/authController.js`, `backend/src/middlewares/authMiddleware.js`, `backend/src/routes/index.js`, `backend/src/server.js`, `backend/src/config/db.js`, `backend/scripts/set-user-password.js`, `backend/package.json`, `database/schema.sql` | Login local não validava credenciais, e rotas aceitavam identificação sem sessão assinada. Usuários não tinham campo de hash de senha no schema executado. | Login com scrypt, sessão assinada, middleware que carrega o perfil do banco e migração aditiva da coluna `senha_hash`. Script interativo grava o hash sem expor senha na linha de comando. |
| `backend/src/controllers/reservasController.js`, `backend/src/routes/reuniaoRoutes.js` | Conflito era verificado apenas no navegador; concorrência podia criar duas reservas no mesmo dia. Edição não existia no fluxo raiz. | Validação e transação SQLite na API para criação/edição; verificação repetida na aprovação; edição limitada ao criador. |
| `backend/src/controllers/salasController.js`, `backend/src/routes/reuniaoRoutes.js`, `backend/tests/reservas.test.js` | Formulário usava opções fixas e não consultava/cadastrava salas da tabela SQLite. | Endpoint autenticado de consulta e cadastro administrativo com validação de capacidade e duplicatas; cobertura automatizada. |
| `frontend/src/App.js`, `frontend/src/pages/Login.js`, `frontend/src/components/Header.js`, `frontend/src/services/api.js`, `frontend/src/pages/Reservas.js`, `frontend/src/utils/date.js`, `frontend/src/pages/Reunioes.js` | Interface não estava conectada à autenticação real e exibia regras/identidade inconsistentes; faltava agenda de duas semanas e edição. | Sessão pela API, logout, controle de perfil, seleção de salas cadastradas, formulário de edição e agenda de 14 dias em `America/Sao_Paulo`. Datas de reserva continuam de dia inteiro. |
| `backend/tests/auth.test.js`, `backend/tests/reservas.test.js`, `backend/tests/regras_reuniao_completas.test.js`, `backend/tests/reunioes_pedidos.test.js`, `backend/tests/testDatabase.js`, `backend/scripts/run-tests.js`, `backend/src/config/db.js`, `backend/package.json` | Testes legados recorriam ao banco padrão sem configuração; falhas internas não afetavam o código de saída. | Runner cria banco temporário distinto por arquivo, exige caminho explícito, rejeita caminho persistente, propaga falhas e fecha a API de teste. |
| `README.md`, `AUDITORIA_TECNICA.md`, `CHECKLIST_ENTREGA.md`, `RELATORIO_INCIDENTE_SQLITE.md` | Documentação afirmava incorretamente que o banco padrão nunca havia sido usado. | Registrados incidente, cópia, evidências, limites de diagnóstico e proteção nova. |
| `backend/src/services/googleCalendarService.js`, `backend/src/controllers/googleCalendarController.js`, `frontend/src/pages/Reunioes.js`, `backend/.env.example`, `backend/tests/googleCalendar.test.js`, `backend/scripts/run-tests.js`, `README.md`, `CHECKLIST_ENTREGA.md` | A integração Google já existia, mas as credenciais OAuth não estavam configuradas; a tela não distinguia servidor sem configuração. | Adicionado status de configuração visível, exemplo de variáveis sem segredos, instruções locais/produção e testes isolados do fluxo OAuth/token/evento. A conexão real permanece pendente de credenciais Google Cloud. |

## Testes e limites

- `npm test --prefix backend`: 7 arquivos aprovados em SQLite temporário
  independente por arquivo; cobre autenticação, CRUD, ausência de caminho,
  recusa do banco padrão, OAuth Google simulado, reuniões, reservas e
  persistência após reiniciar.
- `googleCalendar.test.js`: 2 testes aprovados com respostas `fetch` simuladas;
  cobre URL OAuth/state, callback, armazenamento de tokens cifrados,
  sincronização create/update/delete e recusa de state inválido. Nenhuma
  credencial ou chamada externa real foi usada.
- Build de produção do frontend após a indicação visual de configuração:
  compilado com sucesso em diretório temporário. Aviso conhecido do toolchain:
  `DEP0176` (`fs.F_OK`).
- Uma primeira tentativa isolada encontrou um `ReferenceError` no teste de
  reservas, retornou código 1 e levou à inclusão do import de `path`; após a
  correção, a suíte completa passou.
- Build de produção do frontend: compilado com sucesso em pasta temporária. O processo emitiu o aviso de depreciação `DEP0176` do toolchain.
- `git diff --check` e `node --check backend\src\controllers\reservasController.js`: concluídos sem erro.
- Não testados: contas e dados reais, OAuth/Calendar com credenciais reais,
  experiência visual no navegador, cancelamento e recursos com
  inventário/disponibilidade.
- `database/embrasmect.db` já estava marcado como modificado no worktree antes do incidente. Depois da execução legada, foi criada cópia consistente via SQLite Backup API; sem baseline confiável, não é possível determinar mudanças. O hash do original permaneceu inalterado durante os testes isolados. Consulte `RELATORIO_INCIDENTE_SQLITE.md`.
