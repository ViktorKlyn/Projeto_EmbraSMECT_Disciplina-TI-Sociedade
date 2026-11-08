# Checklist de entrega — Embrapa Meeting

Os resultados abaixo se referem à pilha selecionada `frontend/` + `backend/`.
Build ou teste com banco temporário não comprova funcionamento com dados reais.

| Requisito | Situação | Evidência / limite |
|---|---|---|
| Login e sessão assinada | Implementado e testado | Teste automatizado com credenciais provisionadas apenas no banco temporário. Contas da base existente ainda precisam de senha configurada. |
| Perfis e aprovação | Implementado e testado | Aprovação restrita a admin/gestor; cadastro de salas restrito a admin. |
| Consulta e cadastro de salas | Implementado e testado | Listagem e cadastro com capacidade persistida; duplicatas e acesso sem permissão rejeitados. |
| Criar e editar reserva | Implementado e testado | Validação no backend; somente o criador pode editar. |
| Conflito de sala/data | Implementado e testado | Solicitação pendente ou aprovada ocupa a sala no dia inteiro; revalidado na criação, edição e aprovação. |
| Cancelamento de reserva | Implementado, não testado nesta rodada | A interface e a API mantêm a ação existente. |
| Agenda dos próximos 14 dias | Implementada; build testado | Renderização usa os dados da API e fuso `America/Sao_Paulo`; não foi verificada visualmente nem com a agenda real. |
| Associação de recursos | Parcialmente implementada | Campo de texto é persistido; não existe catálogo ou validação de disponibilidade de recursos. |
| Persistência após reiniciar backend | Implementado e testado em banco temporário | O teste focado recria o servidor sobre o mesmo SQLite temporário. Uma execução anterior também rodou testes legados sem isolamento; ver `RELATORIO_INCIDENTE_SQLITE.md`. |
| Google Calendar | Implementado; fluxo OAuth/sincronização testado com chamadas simuladas; conexão real não configurada | Requer credenciais OAuth do Google Cloud, consentimento e autorização individual; sem credenciais, a tela informa que o servidor precisa ser configurado. |
| Ordens de serviço | Não implementadas/encontradas na pilha selecionada | A obrigatoriedade depende do contrato/backlog oficial não disponível. |
| Duas semanas de agenda real sem planilha paralela | Parcialmente implementado, não confirmado | A agenda de 14 dias e fluxo local existem; não houve teste com dados reais ou base de implantação. |

## Evidências executadas

- `npm test --prefix backend`: 7 arquivos de teste aprovados usando um SQLite
  temporário independente por arquivo.
- Integração Google: OAuth, armazenamento cifrado, criação/atualização/remoção
  simuladas e rejeição de `state` inválido aprovados em SQLite temporário; não
  houve chamadas externas nem login real no Google.
- Segurança SQLite: ausência de `DATABASE_PATH` e caminho padrão recusados;
  CRUD realizado apenas no banco temporário; falha de teste retornou código 1.
- Build de produção do frontend: compilado com sucesso em diretório temporário.
- `git diff --check`: sem erros de whitespace; avisos de conversão LF/CRLF.
- A base original foi comparada por SHA-256 antes/depois da validação e não
  mudou durante os testes isolados.
- `node --check`: sem erro de sintaxe nos arquivos de teste/configuração.

## Antes da apresentação/uso com dados reais

- Fazer backup do banco antes de iniciar a aplicação ou provisionar senhas.
- Consultar `RELATORIO_INCIDENTE_SQLITE.md` antes de usar a base original; há uma cópia de preservação, mas não há baseline confiável para identificar alterações.
- Definir uma `AUTH_SECRET` persistente e provisionar as contas existentes.
- Validar login, perfis, calendário, aprovação e reinício contra uma cópia autorizada da base real.
- Confirmar no contrato/backlog se Google Calendar, relatórios ou ordens de serviço são entregáveis.
