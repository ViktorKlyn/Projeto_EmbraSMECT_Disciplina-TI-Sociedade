import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const categorias = ['Áudio', 'Vídeo', 'Informática', 'Iluminação', 'Outros'];

export default function TechnicalResources() {
  const { user } = useAuth();
  const isAdmPrincipal = user?.role === 'admin' && user?.principal === true;
  const [recursos, setRecursos] = useState([]);
  const [salas, setSalas] = useState([]);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState(categorias[0]);
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [salaNova, setSalaNova] = useState('');
  const [salasSelecionadas, setSalasSelecionadas] = useState({});
  const [statusSelecionados, setStatusSelecionados] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvandoId, setSalvandoId] = useState(null);
  const [excluindoId, setExcluindoId] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const recursosPorCategoria = categorias
    .map((nomeCategoria) => ({
      nome: nomeCategoria,
      recursos: recursos.filter((recurso) => (recurso.categoria || 'Outros') === nomeCategoria),
    }))
    .filter((grupo) => grupo.recursos.length > 0);

  async function carregar() {
    const [{ data: listaRecursos }, respostaSalas] = await Promise.all([
      api.get('/recursos-tecnicos'),
      isAdmPrincipal ? api.get('/usuarios/salas') : Promise.resolve({ data: [] }),
    ]);
    setRecursos(listaRecursos);
    setSalas(respostaSalas.data);
    setSalasSelecionadas(Object.fromEntries(listaRecursos.map((recurso) => [
      recurso.id,
      recurso.salaId ? String(recurso.salaId) : '',
    ])));
    setStatusSelecionados(Object.fromEntries(listaRecursos.map((recurso) => [recurso.id, recurso.status])));
  }

  useEffect(() => {
    carregar().catch((requestError) => {
      setErro(requestError.response?.data?.erro || 'Não foi possível carregar os recursos técnicos.');
    });
  }, [isAdmPrincipal]);

  async function cadastrar(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setSalvando(true);
    try {
      const { data } = await api.post('/recursos-tecnicos', {
        nome: nome.trim(),
        categoria,
        ...(isAdmPrincipal && salaNova ? { salaId: Number(salaNova) } : {}),
      });
      setRecursos((lista) => [...lista, data.recurso]);
      setSalasSelecionadas((valores) => ({ ...valores, [data.recurso.id]: String(data.recurso.salaId || '') }));
      setStatusSelecionados((valores) => ({ ...valores, [data.recurso.id]: data.recurso.status }));
      setNome('');
      setCategoria(categorias[0]);
      setSalaNova('');
      setMensagem(`Recurso técnico "${data.recurso.nome}" cadastrado.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível cadastrar o recurso técnico.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarNome(recurso) {
    setErro('');
    setMensagem('');
    setSalvandoId(recurso.id);
    try {
      const { data } = await api.patch(`/recursos-tecnicos/${recurso.id}/nome`, { nome: nomeEditado.trim() });
      setRecursos((lista) => lista.map((item) => item.id === recurso.id ? data.recurso : item));
      setEditandoId(null);
      setNomeEditado('');
      setMensagem('Nome do recurso atualizado.');
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível atualizar o nome do recurso.');
    } finally {
      setSalvandoId(null);
    }
  }

  async function salvarConfiguracao(recurso, campo) {
    setErro('');
    setMensagem('');
    setSalvandoId(recurso.id);
    try {
      const endpoint = campo === 'status'
        ? `/recursos-tecnicos/${recurso.id}/status`
        : `/recursos-tecnicos/${recurso.id}/sala`;
      const dados = campo === 'status'
        ? { status: statusSelecionados[recurso.id] }
        : { salaId: salasSelecionadas[recurso.id] ? Number(salasSelecionadas[recurso.id]) : null };
      const { data } = await api.patch(endpoint, dados);
      setRecursos((lista) => lista.map((item) => item.id === recurso.id ? data.recurso : item));
      setMensagem(campo === 'status' ? 'Status do recurso atualizado.' : 'Espaço fixo do recurso atualizado.');
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível atualizar o recurso técnico.');
      setStatusSelecionados((valores) => ({ ...valores, [recurso.id]: recurso.status }));
      setSalasSelecionadas((valores) => ({ ...valores, [recurso.id]: recurso.salaId ? String(recurso.salaId) : '' }));
    } finally {
      setSalvandoId(null);
    }
  }

  async function excluirRecurso(recurso) {
    if (!window.confirm(`Excluir o recurso "${recurso.nome}"? Esta ação não pode ser desfeita.`)) return;
    setErro('');
    setMensagem('');
    setExcluindoId(recurso.id);
    try {
      await api.delete(`/recursos-tecnicos/${recurso.id}`);
      setRecursos((lista) => lista.filter((item) => item.id !== recurso.id));
      setMensagem(`Recurso técnico "${recurso.nome}" excluído.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível excluir o recurso técnico.');
    } finally {
      setExcluindoId(null);
    }
  }

  return <section>
    <div className="page-heading">
      <span className="eyebrow">GESTÃO DE EQUIPAMENTOS</span>
      <h1>Recursos técnicos</h1>
      <p>Cadastre equipamentos e mantenha o status operacional atualizado. Somente o ADM pode fixar um recurso em um espaço.</p>
    </div>
    {mensagem && <p className="notice" role="status">{mensagem}</p>}
    {erro && <p className="error" role="alert">{erro}</p>}
    <div className="user-management-grid">
      <form className="form-panel account-form" onSubmit={cadastrar}>
        <h2>Cadastrar recurso</h2>
        <label>Nome do recurso técnico<input value={nome} onChange={(event) => setNome(event.target.value)} minLength="2" maxLength="100" placeholder="Ex.: Projetor multimídia" required /></label>
        <label>Categoria
          <select value={categoria} onChange={(event) => setCategoria(event.target.value)} required>
            {categorias.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {isAdmPrincipal && <label>Fixar em um espaço (opcional)
          <select value={salaNova} onChange={(event) => setSalaNova(event.target.value)}>
            <option value="">Não fixar em espaço</option>
            {salas.map((sala) => <option key={sala.id} value={sala.id}>{sala.nome}</option>)}
          </select>
        </label>}
        <button className="primary-button" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Cadastrar recurso'}</button>
      </form>

      <div className="account-panel">
        <div className="account-panel-heading">
          <div><h2>Recursos cadastrados</h2><p>Atualize o status para OK ou manutenção.</p></div>
          <span>{recursos.length}</span>
        </div>
        {recursos.length === 0 && <p className="empty">Nenhum recurso técnico cadastrado.</p>}
        <div className="technical-resource-categories">
          {recursosPorCategoria.map((grupo) => <details className="technical-resource-category" key={grupo.nome}>
            <summary><strong>{grupo.nome}</strong><span>{grupo.recursos.length} {grupo.recursos.length === 1 ? 'recurso' : 'recursos'}</span></summary>
            <div className="room-list">
              {grupo.recursos.map((recurso) => <article className="room-item" key={recurso.id}>
            {editandoId === recurso.id
              ? <label className="room-capacity-field">Nome do recurso
                <input value={nomeEditado} onChange={(event) => setNomeEditado(event.target.value)} minLength="2" maxLength="100" autoFocus />
              </label>
              : <strong>{recurso.nome}</strong>}
            <span>Categoria: {recurso.categoria || 'Outros'}</span>
            {recurso.criadoPorNome && <small>Cadastrado por {recurso.criadoPorNome}</small>}
            {editandoId === recurso.id
              ? <div className="room-actions">
                <button className="primary-button" type="button" disabled={salvandoId === recurso.id || nomeEditado.trim().length < 2} onClick={() => salvarNome(recurso)}>{salvandoId === recurso.id ? 'Salvando...' : 'Salvar nome'}</button>
                <button className="link-button" type="button" disabled={salvandoId === recurso.id} onClick={() => { setEditandoId(null); setNomeEditado(''); }}>Cancelar</button>
              </div>
              : <button className="primary-button" type="button" disabled={salvandoId !== null} onClick={() => { setEditandoId(recurso.id); setNomeEditado(recurso.nome); }}>Editar nome</button>}
            <label className="room-capacity-field">Status
              <select value={statusSelecionados[recurso.id] || recurso.status} onChange={(event) => setStatusSelecionados((valores) => ({ ...valores, [recurso.id]: event.target.value }))}>
                <option value="ok">OK</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </label>
            <button className="primary-button" type="button" disabled={salvandoId === recurso.id || statusSelecionados[recurso.id] === recurso.status} onClick={() => salvarConfiguracao(recurso, 'status')}>Salvar status</button>
            {isAdmPrincipal && <label className="room-capacity-field">Espaço fixo
              <select value={salasSelecionadas[recurso.id] ?? ''} onChange={(event) => setSalasSelecionadas((valores) => ({ ...valores, [recurso.id]: event.target.value }))}>
                <option value="">Sem espaço fixo</option>
                {salas.map((sala) => <option key={sala.id} value={sala.id}>{sala.nome}</option>)}
              </select>
            </label>}
            {isAdmPrincipal && <button className="primary-button" type="button" disabled={salvandoId === recurso.id || (salasSelecionadas[recurso.id] ?? '') === String(recurso.salaId || '')} onClick={() => salvarConfiguracao(recurso, 'sala')}>Salvar espaço fixo</button>}
            <span>Espaço atual: {recurso.salaNome || 'Não fixado'}</span>
            <span>Status atual: {recurso.status === 'manutencao' ? 'Manutenção' : 'OK'}</span>
            <button className="link-button account-delete" type="button" disabled={excluindoId === recurso.id || salvandoId === recurso.id} onClick={() => excluirRecurso(recurso)}>{excluindoId === recurso.id ? 'Excluindo...' : 'Excluir recurso'}</button>
              </article>)}
            </div>
          </details>)}
        </div>
      </div>
    </div>
  </section>;
}
