import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const formularioInicial = { nome: '', email: '', senha: '' };
const nomesPapeis = { admin: 'Gestor', organizer: 'Organizador', guest: 'Convidado' };

export default function AdminUsers() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [promovendoId, setPromovendoId] = useState(null);
  const [rebaixandoId, setRebaixandoId] = useState(null);
  const [removendoId, setRemovendoId] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const eADMPrincipal = user?.principal === true;

  async function carregarUsuarios() {
    const { data } = await api.get('/usuarios');
    setUsuarios(data);
  }

  useEffect(() => {
    carregarUsuarios()
      .catch(() => setErro('Não foi possível carregar as contas.'))
      .finally(() => setCarregando(false));
  }, []);

  async function cadastrarOrganizador(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setSalvando(true);
    try {
      const { data } = await api.post('/usuarios/organizadores', formulario);
      setUsuarios((lista) => [...lista, data.usuario]);
      setFormulario(formularioInicial);
      setMensagem(`Acesso de organizador criado para ${data.usuario.nome}.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível criar o acesso.');
    } finally {
      setSalvando(false);
    }
  }

  async function promoverParaAdmin(usuario) {
    if (!window.confirm(`Promover ${usuario.nome} a Gestor? A alteração concede permissões de gestão.`)) return;
    setErro('');
    setMensagem('');
    setPromovendoId(usuario.id);
    try {
      const { data } = await api.patch(`/usuarios/${usuario.id}/promover-admin`);
      setUsuarios((lista) => lista.map((item) => item.id === usuario.id ? data.usuario : item));
      setMensagem(`${usuario.nome} agora é Gestor. A nova permissão vale após entrar novamente.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível promover esta conta.');
    } finally {
      setPromovendoId(null);
    }
  }

  async function rebaixarParaOrganizador(usuario) {
    if (!window.confirm(`Rebaixar ${usuario.nome} de Gestor para Organizador?`)) return;
    setErro('');
    setMensagem('');
    setRebaixandoId(usuario.id);
    try {
      const { data } = await api.patch(`/usuarios/${usuario.id}/rebaixar-admin`);
      setUsuarios((lista) => lista.map((item) => item.id === usuario.id ? data.usuario : item));
      setMensagem(`${usuario.nome} foi rebaixado para organizador.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível rebaixar esta conta.');
    } finally {
      setRebaixandoId(null);
    }
  }

  async function excluirUsuario(usuario) {
    if (!window.confirm(`Excluir ${usuario.nome}? Esta ação não pode ser desfeita.`)) return;
    setErro('');
    setMensagem('');
    setRemovendoId(usuario.id);
    try {
      await api.delete(`/usuarios/${usuario.id}`);
      setUsuarios((lista) => lista.filter((item) => item.id !== usuario.id));
      setMensagem(`${usuario.nome} foi removido do sistema.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível excluir esta conta.');
    } finally {
      setRemovendoId(null);
    }
  }

  return <section>
    <div className="page-heading">
      <span className="eyebrow">CONTROLE DE ACESSO</span>
      <h1>Contas e permissões</h1>
      <p>Crie acessos de organizador e promova organizadores autorizados a Gestor.</p>
    </div>
    {mensagem && <p className="notice" role="status">{mensagem}</p>}
    {erro && <p className="error" role="alert">{erro}</p>}
    <div className="user-management-grid">
      <div className="stacked-panel-group">
        <form className="form-panel account-form" onSubmit={cadastrarOrganizador}>
          <h2>Cadastrar organizador</h2>
          <p>O novo acesso recebe o perfil Organizador de eventos.</p>
          <label>Nome<input autoComplete="name" maxLength="100" value={formulario.nome} onChange={(event) => setFormulario({ ...formulario, nome: event.target.value })} required /></label>
          <label>E-mail<input type="email" autoComplete="email" maxLength="100" value={formulario.email} onChange={(event) => setFormulario({ ...formulario, email: event.target.value })} required /></label>
          <label>Senha temporária<input type="password" autoComplete="new-password" minLength="12" maxLength="72" value={formulario.senha} onChange={(event) => setFormulario({ ...formulario, senha: event.target.value })} required /><small>Use pelo menos 12 caracteres.</small></label>
          <button className="primary-button" type="submit" disabled={salvando}>{salvando ? 'Criando...' : 'Criar organizador'}</button>
        </form>
      </div>

      <div className="account-panel">
        <div className="account-panel-heading">
          <div><h2>Contas cadastradas</h2><p>{eADMPrincipal ? 'O ADM pode rebaixar ou excluir Gestores e organizadores.' : 'Você pode gerenciar contas e promover organizadores a Gestor.'}</p></div>
          <span>{usuarios.length}</span>
        </div>
        {carregando && <p className="empty">Carregando contas...</p>}
        {!carregando && usuarios.length === 0 && <p className="empty">Nenhuma conta encontrada.</p>}
        <div className="account-list">
          {usuarios.map((usuario) => <article className="account-row" key={usuario.id}>
            <div className="account-identity">
              <strong>{usuario.nome}</strong>
              <small>{usuario.email || (usuario.role === 'guest' ? 'E-mail restrito ao ADM' : '')}</small>
              {usuario.principal && <span className="admiral-badge">ADM</span>}
            </div>
            {!usuario.principal && <span className={`account-role ${usuario.role}`}>{nomesPapeis[usuario.role]}</span>}
            <div className="account-actions">
              {usuario.role === 'organizer' && !usuario.principal && <button className="link-button account-promote" type="button" disabled={promovendoId === usuario.id} onClick={() => promoverParaAdmin(usuario)}>{promovendoId === usuario.id ? 'Promovendo...' : 'Promover a Gestor'}</button>}
              {usuario.role === 'admin' && !usuario.principal && eADMPrincipal && <button className="link-button account-relegate" type="button" disabled={rebaixandoId === usuario.id} onClick={() => rebaixarParaOrganizador(usuario)}>{rebaixandoId === usuario.id ? 'Rebaixando...' : 'Rebaixar'}</button>}
              {usuario.role === 'admin' && !usuario.principal && eADMPrincipal && <button className="link-button account-delete" type="button" disabled={removendoId === usuario.id} onClick={() => excluirUsuario(usuario)}>{removendoId === usuario.id ? 'Excluindo...' : 'Excluir'}</button>}
              {usuario.role === 'organizer' && !usuario.principal && eADMPrincipal && <button className="link-button account-delete" type="button" disabled={removendoId === usuario.id} onClick={() => excluirUsuario(usuario)}>{removendoId === usuario.id ? 'Excluindo...' : 'Excluir'}</button>}
            </div>
          </article>)}
        </div>
      </div>
    </div>

  </section>;
}