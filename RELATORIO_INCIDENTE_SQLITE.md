# Relatório de incidente SQLite — Embrapa Meeting

**Data:** 08/11/2026  
**Banco original:** `C:\Users\klynv\OneDrive\Documents\Projeto_EmbraSMECT_Disciplina-TI-Sociedade-Main\database\embrasmect.db`

## Causa

Foi executado `node --test tests/*.test.js` a partir de `backend/`, sem
configurar `DATABASE_PATH`. Dois testes legados (`regras_reuniao_completas` e
`reunioes_pedidos`) importavam a configuração do backend, que usava o caminho
padrão relativo ao código quando a variável estava ausente. Ambos executam
operações de escrita para preparar cenários e testar regras. A autenticação
também falhou por falta de `AUTH_SECRET`; os helpers dos testes legados
capturavam as falhas por caso, apenas imprimiam o resumo e não definiam código
de saída diferente de zero.

## Preservação e evidências

- O código resolvia o banco padrão para o caminho absoluto informado acima.
- Antes da cópia, o SQLite existia com 94.208 bytes; não havia arquivos
  `-wal`/`-shm` e a consulta Windows Restart Manager não identificou processos
  utilizando o banco naquele momento.
- Foi criada uma cópia consistente pela API de backup do SQLite, sem
  sobrescrever arquivo existente:
  `C:\Users\klynv\.copilot\session-state\51084178-d39a-40ab-8a06-9f52eefdd98e\files\embrasmect-preservacao-20261108-112937.sqlite`
- A cópia tem 94.208 bytes, pode ser aberta em modo somente leitura e retornou
  `ok` em `PRAGMA integrity_check`. `PRAGMA foreign_key_check` não encontrou
  violações.
- Na cópia: 11 tabelas de aplicação; usuários 4, salas 8, reuniões 8,
  reservas 4, participantes 7, líderes 2, pedidos 3 e convites/tabelas Google
  sem registros. Esses números descrevem apenas o estado preservado após a
  execução; não são comparação com um estado anterior.
- A base já aparecia modificada no Git antes da execução incidente. Não existe
  baseline confiável nesta sessão que permita dizer quais registros os testes
  removeram ou alteraram. Não se afirma que houve perda confirmada.
- A busca local por nomes de backup/SQLite no workspace e em sua pasta
  `Documents` não encontrou cópia anterior identificável além do banco
  original. Isso não prova que não exista backup em outro local.

## Operações de escrita observadas nos testes legados

- `regras_reuniao_completas.test.js`: apaga pedidos e convites, remove
  participantes por condição, atualiza tipo de reuniões e insere líderes;
  cria e apaga reuniões temporárias e inclui pedidos/convites em cenários.
- `reunioes_pedidos.test.js`: apaga participantes e pedidos de reuniões
  específicas; insere pedidos e uma reunião temporária; testa remoção em
  cascata.
- `auth.test.js`: atualiza hashes de senha, mas já configurava seu próprio
  SQLite temporário.
- `reservas.test.js`: cria e remove uma reserva de conflito, mas já configurava
  seu próprio SQLite temporário.
- A configuração do banco tinha fallback para `database/embrasmect.db`, sem
  proteção para `NODE_ENV=test`; os testes legados tampouco iniciavam servidor
  próprio em porta efêmera.

## Correções implementadas

- `backend/scripts/run-tests.js` cria uma pasta temporária exclusiva para cada
  arquivo, passa `NODE_ENV=test`, `DATABASE_PATH`, `TEST_DATABASE_ROOT` e chave
  de teste; imprime o caminho absoluto de cada SQLite e remove somente as
  pastas que ele próprio criou.
- `backend/src/config/db.js` falha antes de abrir o banco se testes não tiverem
  `DATABASE_PATH` e rejeita caminhos fora do diretório temporário do sistema,
  inclusive o banco padrão.
- `backend/tests/testDatabase.js` valida isolamento e recusa execução direta
  de testes sem configuração do runner.
- Os testes legados iniciam a própria API em porta efêmera, propagam falhas com
  código de saída não zero e usam datas relativas ao relógio, em vez de
  depender de datas de seed vencidas.
- `npm test` executa o runner isolado e cobre todos os arquivos `*.test.js`.
- Durante esta resposta, não houve alteração, restauração ou migração do banco
  original. O incidente descrito acima ocorreu antes da criação da cópia.

## Validação

- `npm test --prefix backend`, com `EMBRAPA_TEST_RUN_ROOT` em uma pasta nova
  sob `%TEMP%`: **passou**, 6 arquivos de teste e todos os casos. O runner
  imprimiu um caminho SQLite diferente para cada arquivo, cada um dentro de
  sua pasta temporária exclusiva.
- `databaseSafety.test.js`: 4 testes aprovados — caminho temporário e
  integridade, CRUD, falha na ausência de `DATABASE_PATH` e recusa do caminho
  padrão.
- `regras_reuniao_completas.test.js`: 13/13 casos; `reunioes_pedidos.test.js`:
  14/14 casos. Autenticação e reservas também passaram.
- A primeira execução isolada encontrou um `ReferenceError` (`path` não
  importado no teste de reservas) e o runner terminou com código 1. O import
  foi corrigido; a nova execução completa terminou com código 0. Isso confirma
  a propagação de falhas.
- `node --check` nos arquivos de teste/configuração e `git diff --check`:
  concluídos sem erro (Git emitiu apenas avisos de conversão LF/CRLF).
- O teste completo analisou somente bancos temporários; a cópia protegida
  permaneceu sem alterações.

## Pendências para recuperação

Não restaurar nem substituir `database/embrasmect.db` sem um backup anterior
confiável e autorização explícita. Sem estado anterior confiável, não é
possível determinar precisamente quais registros foram alterados pelo teste
incidente. Preserve tanto o original atual quanto a cópia indicada acima.

## Restauração autorizada de acessos EQ-01

Em 08/11/2026, após diagnóstico e autorização explícita do usuário, foi criado
outro backup online consistente antes de inserir as cinco contas:

`C:\Users\klynv\.copilot\session-state\51084178-d39a-40ab-8a06-9f52eefdd98e\files\embrasmect-antes-contas-equipe-20261108-133149.sqlite`

A cópia passou em `PRAGMA integrity_check` e confirmou o schema esperado.
Foram inseridos, em uma única transação, somente os cinco endereços históricos
ausentes, todos com perfil `admin` conforme o papel de sistema anterior e a
autorização recebida. Os quatro usuários preexistentes foram comparados com o
backup e permaneceram inalterados; contagens das demais tabelas não mudaram.
O banco atual passou em `integrity_check` e não apresentou violações
referenciais.

| Integrante | E-mail histórico | Perfil criado | Senha |
|---|---|---|---|
| João Victor Klein | joaoklein@email.com | admin | Não configurada; requer definição individual |
| Fernando Vinícius da Costa Vaz | fernandovinicius@email.com | admin | Não configurada; requer definição individual |
| Gustavo Lira de Oliveira | gustavolira@email.com | admin | Não configurada; requer definição individual |
| Nicolas Toshio | nicolastoshio@email.com | admin | Não configurada; requer definição individual |
| Lorkendy Lormilus | lormiluskendy@email.com | admin | Não configurada; requer definição individual |

O schema raiz não possui o atributo legado `principal`; ele não foi migrado.
Nenhuma senha foi criada, reutilizada ou compartilhada. Cada usuário precisa
executar o provisionador individual pelo terminal interativo antes de entrar.

Após a inclusão, `npm test --prefix backend` passou em seis arquivos, com
SQLite temporário separado por teste; o banco de produção não foi usado. Uma
cópia online pós-teste passou em `integrity_check`, e a comparação com o
backup pré-inserção confirmou que as únicas diferenças são as cinco novas
linhas em `usuarios`; as quatro contas anteriores e as contagens das demais
tabelas permaneceram iguais. Esses testes usam usuários fictícios e não
representam um login real da equipe. Como solicitado, as cinco senhas seguem
sem configuração até cada pessoa defini-la individualmente.

O teste novo `teamAccounts.test.js` verificou, no SQLite temporário, a recusa
de colisão com outro e-mail, a criação das cinco contas ausentes, a preservação
das contas preexistentes e a segunda execução sem duplicação. A ferramenta
administrativa correspondente não foi executada no banco real durante essa
validação.
