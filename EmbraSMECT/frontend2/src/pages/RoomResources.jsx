import React, { useEffect, useState } from 'react';
import api from '../services/api';

const salaInicial = { nome: '', capacidade: '80' };

export default function RoomResources() {
  const [salas, setSalas] = useState([]);
  const [salasConjugadas, setSalasConjugadas] = useState({});
  const [formulario, setFormulario] = useState(salaInicial);
  const [capacidadesSala, setCapacidadesSala] = useState({});
  const [editandoCapacidadeId, setEditandoCapacidadeId] = useState(null);
  const [salvandoSala, setSalvandoSala] = useState(false);
  const [atualizandoCapacidadeId, setAtualizandoCapacidadeId] = useState(null);
  const [removendoSalaId, setRemovendoSalaId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/usuarios/salas')
      .then(({ data }) => {
        setSalas(data);
        setSalasConjugadas(Object.fromEntries(data.map((sala) => [sala.id, String(sala.conjugadaId || '')])));
      })
      .catch((requestError) => setErro(requestError.response?.data?.erro || 'Não foi possível carregar as salas.'))
      .finally(() => setCarregando(false));
  }, []);

  async function cadastrarSala(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setSalvandoSala(true);
    try {
      const { data } = await api.post('/usuarios/salas', formulario);
      setSalas((lista) => [...lista, data.sala]);
      setSalasConjugadas((valores) => ({ ...valores, [data.sala.id]: '' }));
      setFormulario(salaInicial);
      setMensagem(`Sala ${data.sala.nome} cadastrada com capacidade para ${data.sala.capacidade} pessoas.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível criar esta sala.');
    } finally {
      setSalvandoSala(false);
    }
  }

  async function atualizarCapacidade(sala) {
    const capacidade = Number(capacidadesSala[sala.id]);
    setErro('');
    setMensagem('');
    setAtualizandoCapacidadeId(sala.id);
    try {
      const { data } = await api.patch(`/usuarios/salas/${sala.id}`, { capacidade });
      setSalas((lista) => lista.map((item) => item.id === sala.id ? data.sala : item));
      setCapacidadesSala((valores) => {
        const atualizados = { ...valores };
        delete atualizados[sala.id];
        return atualizados;
      });
      setEditandoCapacidadeId(null);
      setMensagem(`Capacidade de ${sala.nome} atualizada para ${data.sala.capacidade} pessoas.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível alterar a capacidade desta sala.');
    } finally {
      setAtualizandoCapacidadeId(null);
    }
  }

  async function excluirSala(sala) {
    if (!window.confirm(`Remover ${sala.nome}? A sala só pode ser removida se não estiver vinculada a uma reserva.`)) return;
    setErro('');
    setMensagem('');
    setRemovendoSalaId(sala.id);
    try {
      await api.delete(`/usuarios/salas/${sala.id}`);
      setSalas((lista) => lista
        .filter((item) => item.id !== sala.id)
        .map((item) => item.conjugadaId === sala.id ? { ...item, conjugadaId: null } : item));
      setSalasConjugadas((valores) => {
        const atualizados = { ...valores };
        delete atualizados[sala.id];
        Object.keys(atualizados).forEach((id) => {
          if (Number(atualizados[id]) === sala.id) atualizados[id] = '';
        });
        return atualizados;
      });
      setMensagem(`${sala.nome} foi removida.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível remover esta sala.');
    } finally {
      setRemovendoSalaId(null);
    }
  }

  async function atualizarSalaConjugada(sala) {
    setErro('');
    setMensagem('');
    setAtualizandoCapacidadeId(sala.id);
    try {
      const conjugadaId = salasConjugadas[sala.id] ? Number(salasConjugadas[sala.id]) : null;
      const { data } = await api.patch(`/usuarios/salas/${sala.id}/conjugada`, { conjugadaId });
      setSalas(data.salas);
      setSalasConjugadas(Object.fromEntries(data.salas.map((item) => [item.id, String(item.conjugadaId || '')])));
      const conjugada = data.salas.find((item) => item.id === conjugadaId);
      setMensagem(conjugada ? `${sala.nome} foi conjugada com ${conjugada.nome}.` : `A configuração de sala conjugada de ${sala.nome} foi removida.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível configurar as salas conjugadas.');
    } finally {
      setAtualizandoCapacidadeId(null);
    }
  }

  function cancelarEdicao(salaId) {
    setCapacidadesSala((valores) => {
      const atualizados = { ...valores };
      delete atualizados[salaId];
      return atualizados;
    });
    setEditandoCapacidadeId(null);
  }

  return <section>
    <div className="page-heading">
      <span className="eyebrow">ADMINISTRAÇÃO PRINCIPAL</span>
      <h1>Recursos de sala</h1>
      <p>Cadastre salas, ajuste a capacidade, configure salas conjugadas e remova ambientes sem reservas vinculadas.</p>
    </div>
    {mensagem && <p className="notice" role="status">{mensagem}</p>}
    {erro && <p className="error" role="alert">{erro}</p>}
    <div className="user-management-grid">
      <form className="form-panel account-form" onSubmit={cadastrarSala}>
        <h2>Cadastrar sala</h2>
        <p>Defina o nome do ambiente e a quantidade máxima de pessoas.</p>
        <label>Nome da sala<input maxLength="80" value={formulario.nome} onChange={(event) => setFormulario({ ...formulario, nome: event.target.value })} required /></label>
        <label>Capacidade<input type="number" min="1" max="500" step="1" value={formulario.capacidade} onChange={(event) => setFormulario({ ...formulario, capacidade: event.target.value })} required /></label>
        <button className="primary-button" type="submit" disabled={salvandoSala}>{salvandoSala ? 'Salvando...' : 'Criar sala'}</button>
      </form>

      <div className="account-panel">
        <div className="account-panel-heading">
          <div><h2>Salas disponíveis</h2><p>Configure quais salas podem ser unidas para um evento.</p></div>
          <span>{salas.length}</span>
        </div>
        {carregando && <p className="empty">Carregando salas...</p>}
        {!carregando && salas.length === 0 && <p className="empty">Nenhuma sala cadastrada.</p>}
        <div className="room-list">
          {salas.map((sala) => <div key={sala.id} className="room-item">
            <strong>{sala.nome}</strong>
            <label className="room-capacity-field">Sala conjugada
              <select value={salasConjugadas[sala.id] ?? ''} onChange={(event) => setSalasConjugadas((valores) => ({ ...valores, [sala.id]: event.target.value }))}>
                <option value="">Nenhuma</option>
                {salas.filter((opcao) => opcao.id !== sala.id).map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.nome}</option>)}
              </select>
            </label>
            <button className="primary-button" type="button" disabled={atualizandoCapacidadeId === sala.id || (salasConjugadas[sala.id] ?? '') === String(sala.conjugadaId || '')} onClick={() => atualizarSalaConjugada(sala)}>{atualizandoCapacidadeId === sala.id ? 'Salvando...' : 'Salvar conjugação'}</button>
            {editandoCapacidadeId === sala.id
              ? <label className="room-capacity-field">Nova capacidade
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  autoFocus
                  value={capacidadesSala[sala.id] ?? sala.capacidade}
                  onChange={(event) => setCapacidadesSala((valores) => ({ ...valores, [sala.id]: event.target.value }))}
                />
              </label>
              : <span>Capacidade: {sala.capacidade} pessoas</span>}
            <div className="room-actions">
              {editandoCapacidadeId === sala.id
                ? <>
                  <button className="primary-button" type="button" disabled={atualizandoCapacidadeId === sala.id || Number(capacidadesSala[sala.id]) === sala.capacidade} onClick={() => atualizarCapacidade(sala)}>{atualizandoCapacidadeId === sala.id ? 'Salvando...' : 'Salvar'}</button>
                  <button className="link-button" type="button" disabled={atualizandoCapacidadeId === sala.id} onClick={() => cancelarEdicao(sala.id)}>Cancelar</button>
                </>
                : <button className="primary-button" type="button" disabled={removendoSalaId === sala.id} onClick={() => {
                  setCapacidadesSala((valores) => ({ ...valores, [sala.id]: String(sala.capacidade) }));
                  setEditandoCapacidadeId(sala.id);
                }}>Alterar capacidade</button>}
              <button className="link-button account-delete" type="button" disabled={removendoSalaId === sala.id || atualizandoCapacidadeId === sala.id} onClick={() => excluirSala(sala)}>{removendoSalaId === sala.id ? 'Removendo...' : 'Remover sala'}</button>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}
