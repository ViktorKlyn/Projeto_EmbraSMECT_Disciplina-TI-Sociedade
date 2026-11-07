import { carregarColecao, salvarColecoes } from './data-store.js';
import { listarSalas } from './usuario.repository.js';

const recursos = carregarColecao('recursosTecnicos', []);

function representarRecurso(recurso) {
  const sala = listarSalas().find((item) => item.id === recurso.salaId);
  return { ...recurso, categoria: recurso.categoria || 'Outros', salaNome: sala?.nome || null };
}

export function listarRecursosTecnicos() {
  return recursos.map(representarRecurso);
}

export function removerRecursoTecnico(id) {
  const indice = recursos.findIndex((item) => item.id === Number(id));
  if (indice === -1) return null;
  const [removido] = recursos.splice(indice, 1);
  salvarColecoes({ recursosTecnicos: recursos });
  return representarRecurso(removido);
}

export function adicionarRecursoTecnico({ nome, categoria, salaId, criadoPor, criadoPorNome }) {
  const id = recursos.reduce((maiorId, item) => Math.max(maiorId, item.id), 0) + 1;
  const recurso = {
    id,
    nome,
    categoria,
    salaId,
    status: 'ok',
    criadoPor: Number(criadoPor),
    criadoPorNome,
  };
  recursos.push(recurso);
  salvarColecoes({ recursosTecnicos: recursos });
  return representarRecurso(recurso);
}

export function atualizarStatusRecursoTecnico(id, status) {
  const recurso = recursos.find((item) => item.id === Number(id));
  if (!recurso) return null;
  recurso.status = status;
  salvarColecoes({ recursosTecnicos: recursos });
  return representarRecurso(recurso);
}

export function atualizarNomeRecursoTecnico(id, nome) {
  const recurso = recursos.find((item) => item.id === Number(id));
  if (!recurso) return null;
  recurso.nome = nome;
  salvarColecoes({ recursosTecnicos: recursos });
  return representarRecurso(recurso);
}

export function atualizarSalaRecursoTecnico(id, salaId) {
  const recurso = recursos.find((item) => item.id === Number(id));
  if (!recurso) return null;
  recurso.salaId = salaId;
  salvarColecoes({ recursosTecnicos: recursos });
  return representarRecurso(recurso);
}

export function desvincularRecursosTecnicosDaSala(salaId) {
  let alterado = false;
  recursos.forEach((recurso) => {
    if (recurso.salaId === Number(salaId)) {
      recurso.salaId = null;
      alterado = true;
    }
  });
  if (alterado) salvarColecoes({ recursosTecnicos: recursos });
}
