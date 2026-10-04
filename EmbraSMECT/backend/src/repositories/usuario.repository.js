import { carregarColecao, salvarColecoes } from './data-store.js';

const usuarios = carregarColecao('usuarios', [
  { id: 1, nome: 'Joao Klein', email: 'joaoklein@email.com', role: 'admin', principal: true, senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
  { id: 2, nome: 'Gustavo Lira', email: 'gustavolira@email.com', role: 'admin', principal: false, senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
  { id: 3, nome: 'Fernando Vinícuis', email: 'fernandovinicius@email.com', role: 'admin', principal: false, senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
  { id: 4, nome: 'Nicolas Toshio', email: 'nicolastoshio@email.com', role: 'admin', principal: false, senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
  { id: 5, nome: 'Lormilus Kendy', email: 'lormiluskendy@email.com', role: 'admin', principal: false, senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
  { id: 6, nome: 'Helton Azevedo', email: 'heltonazevedo@email.com', role: 'admin', principal: false, senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
  { id: 7, nome: 'Visitante', email: 'visituser@email.local', role: 'admin', principal: false, senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
  { id: 8, nome: 'Marina Costa', email: 'marina.costa@embrasmect.test', role: 'organizer', principal: false, senha: '$2a$12$tU//bNITffdDxgaunaY4v.tV.AUDL7vjnBfuUrjHmJGUQpwT8.TVG' },
  { id: 9, nome: 'Rafael Nunes', email: 'rafael.nunes@embrasmect.test', role: 'organizer', principal: false, senha: '$2a$12$tU//bNITffdDxgaunaY4v.tV.AUDL7vjnBfuUrjHmJGUQpwT8.TVG' },
  { id: 10, nome: 'Lia Mendes', email: 'lia.mendes@embrasmect.test', role: 'guest', principal: false, senha: '$2a$12$tU//bNITffdDxgaunaY4v.tV.AUDL7vjnBfuUrjHmJGUQpwT8.TVG' },
  { id: 11, nome: 'Caio Freitas', email: 'caio.freitas@embrasmect.test', role: 'guest', principal: false, senha: '$2a$12$tU//bNITffdDxgaunaY4v.tV.AUDL7vjnBfuUrjHmJGUQpwT8.TVG' },
]);

const salas = carregarColecao('salas', [
  { id: 1, nome: 'Sala 101', capacidade: 80, conjugadaId: null },
  { id: 2, nome: 'Sala 202', capacidade: 60, conjugadaId: null },
]);

export function buscarUsuarioPorEmail(email) {
  return usuarios.find((usuario) => usuario.email === email) || null;
}

export function buscarUsuarioPorId(id) {
  return usuarios.find((usuario) => usuario.id === Number(id)) || null;
}

export function emailEmUso(email) {
  return Boolean(buscarUsuarioPorEmail(email));
}

export function listarUsuarios(solicitante) {
  const usuarioSolicitante = buscarUsuarioPorId(solicitante?.id);
  const podeVerEmailsDeConvidados = solicitante?.role === 'admin' && usuarioSolicitante?.principal === true;

  return usuarios.map(({ senha, ...usuario }) => {
    if (usuario.role !== 'guest' || podeVerEmailsDeConvidados) return usuario;

    const { email, ...usuarioSemEmail } = usuario;
    return usuarioSemEmail;
  });
}

export function adicionarUsuario({ nome, email, senha, role, principal = false }) {
  const id = usuarios.reduce((maiorId, usuario) => Math.max(maiorId, usuario.id), 0) + 1;
  const usuario = { id, nome, email, senha, role, principal };
  usuarios.push(usuario);
  salvarColecoes({ usuarios });
  return usuario;
}

export function listarSalas() {
  return salas.map((sala) => ({ ...sala }));
}

export function buscarSalaPorNome(nome) {
  return salas.find((sala) => sala.nome === nome) || null;
}

export function configurarSalasConjugadas(id, conjugadaId) {
  const sala = salas.find((item) => item.id === Number(id));
  if (!sala) return { erro: 'Sala não encontrada.', status: 404 };

  const novaConjugada = conjugadaId === null ? null : salas.find((item) => item.id === Number(conjugadaId));
  if (conjugadaId !== null && !novaConjugada) return { erro: 'Sala conjugada não encontrada.', status: 404 };
  if (novaConjugada?.id === sala.id) return { erro: 'Uma sala não pode ser conjugada com ela mesma.', status: 400 };

  const salaAnterior = salas.find((item) => item.id === sala.conjugadaId);
  if (salaAnterior?.conjugadaId === sala.id) salaAnterior.conjugadaId = null;

  if (novaConjugada) {
    const conjugadaAnterior = salas.find((item) => item.id === novaConjugada.conjugadaId);
    if (conjugadaAnterior?.conjugadaId === novaConjugada.id) conjugadaAnterior.conjugadaId = null;
    novaConjugada.conjugadaId = sala.id;
    sala.conjugadaId = novaConjugada.id;
  } else {
    sala.conjugadaId = null;
  }
  salvarColecoes({ salas });

  return { salas: listarSalas() };
}

export function removerSala(id) {
  const indice = salas.findIndex((sala) => sala.id === Number(id));
  if (indice === -1) return null;

  const sala = salas[indice];
  const conjugada = salas.find((item) => item.id === sala.conjugadaId);
  if (conjugada?.conjugadaId === sala.id) conjugada.conjugadaId = null;
  const [salaRemovida] = salas.splice(indice, 1);
  salvarColecoes({ salas });
  return { ...salaRemovida };
}

export function atualizarCapacidadeSala(id, capacidade) {
  const sala = salas.find((item) => item.id === Number(id));
  const capacidadeNumerica = Number(capacidade);
  if (!sala || !Number.isInteger(capacidadeNumerica) || capacidadeNumerica < 1 || capacidadeNumerica > 500) return null;

  sala.capacidade = capacidadeNumerica;
  salvarColecoes({ salas });
  return { ...sala };
}

export function adicionarSala({ nome, capacidade }) {
  const nomeSala = typeof nome === 'string' ? nome.trim() : '';
  const capacidadeNumerica = Number(capacidade);

  if (!nomeSala || nomeSala.length < 2 || !Number.isFinite(capacidadeNumerica) || capacidadeNumerica < 1 || capacidadeNumerica > 500) {
    return null;
  }
  if (salas.some((sala) => sala.nome.toLocaleLowerCase('pt-BR') === nomeSala.toLocaleLowerCase('pt-BR'))) {
    return null;
  }

  const sala = {
    id: salas.reduce((maiorId, item) => Math.max(maiorId, item.id), 0) + 1,
    nome: nomeSala,
    capacidade: capacidadeNumerica,
    conjugadaId: null,
  };

  salas.push(sala);
  salvarColecoes({ salas });
  return { ...sala };
}

export function promoverOrganizador(id) {
  const usuario = buscarUsuarioPorId(id);
  if (!usuario || usuario.role !== 'organizer') return null;
  usuario.role = 'admin';
  usuario.principal = false;
  salvarColecoes({ usuarios });
  return usuario;
}

export function rebaixarAdmin(id) {
  const usuario = buscarUsuarioPorId(id);
  if (!usuario || usuario.role !== 'admin' || usuario.principal) return null;
  usuario.role = 'organizer';
  salvarColecoes({ usuarios });
  return usuario;
}

export function removerUsuario(id) {
  const usuario = buscarUsuarioPorId(id);
  if (!usuario || usuario.principal) return null;

  const indice = usuarios.findIndex((item) => item.id === Number(id));
  if (indice === -1) return null;

  const [usuarioRemovido] = usuarios.splice(indice, 1);
  salvarColecoes({ usuarios });
  return usuarioRemovido;
}
