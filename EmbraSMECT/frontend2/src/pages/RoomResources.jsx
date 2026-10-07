import React, { useEffect, useState } from 'react';
import api from '../services/api';

const salaInicial = { nome: '', capacidade: '80' };

export default function RoomResources() {
  const [salas, setSalas] = useState([]);
  const [salasConjugadas, setSalasConjugadas] = useState({});
  const [formulario, setFormulario] = useState(salaInicial);
  const [capacidadesSala, setCapacidadesSala] = useState({});
  const [nomesEspaco, setNomesEspaco] = useState({});
  const [editandoCapacidadeId, setEditandoCapacidadeId] = useState(null);
  const [editandoNomeId, setEditandoNomeId] = useState(null);
  const [salvandoSala, setSalvandoSala] = useState(false);
  const [salvandoNomeId, setSalvandoNomeId] = useState(null);
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
      .catch((requestError) => setErro(requestError.response?.data?.erro || 'Não foi possível carregar os espaços.'))
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
      setMensagem(`Espaço ${data.sala.nome} cadastrado com capacidade para ${data.sala.capacidade} pessoas.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível criar este espaço.');
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
      setMensagem(`Capacidade do espaço ${sala.nome} atualizada para ${data.sala.capacidade} pessoas.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível alterar a capacidade deste espaço.');
    } finally {
      setAtualizandoCapacidadeId(null);
    }
  }

  async function atualizarNome(sala) {
    setErro('');
    setMensagem('');
    setSalvandoNomeId(sala.id);
    try {
      const { data } = await api.patch(`/usuarios/salas/${sala.id}/nome`, { nome: nomesEspaco[sala.id] });
      setSalas((lista) => lista.map((item) => item.id === sala.id ? data.sala : item));
      setNomesEspaco((valores) => {
        const atualizados = { ...valores };
        delete atualizados[sala.id];
        return atualizados;
      });
      setEditandoNomeId(null);
      setMensagem(`Espaço renomeado para ${data.sala.nome}.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível alterar o nome deste espaço.');
    } finally {
      setSalvandoNomeId(null);
    }
  }

  async function excluirSala(sala) {
    if (!window.confirm(`Remover ${sala.nome}? O espaço só pode ser removido se não estiver vinculado a uma reserva.`)) return;
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
      setMensagem(`O espaço ${sala.nome} foi removido.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível remover este espaço.');
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
      setMensagem(conjugada ? `Os espaços ${sala.nome} e ${conjugada.nome} agora podem ser usados juntos.` : `A união do espaço ${sala.nome} com outro espaço foi removida.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível configurar os espaços unidos.');
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
      <h1>Espaços</h1>
      <p>Cadastre espaços, ajuste a capacidade, configure espaços que podem ser unidos e remova ambientes sem reservas vinculadas.</p>
    </div>
    {mensagem && <p className="notice" role="status">{mensagem}</p>}
    {erro && <p className="error" role="alert">{erro}</p>}
    <div className="user-management-grid">
      <form className="form-panel account-form" onSubmit={cadastrarSala}>
        <h2>Cadastrar Espaço</h2>
        <p>Defina o nome do ambiente e a quantidade máxima de pessoas.</p>
        <label>Nome<input maxLength="80" value={formulario.nome} onChange={(event) => setFormulario({ ...formulario, nome: event.target.value })} required /></label>
        <label>Capacidade<input type="number" min="1" max="500" step="1" value={formulario.capacidade} onChange={(event) => setFormulario({ ...formulario, capacidade: event.target.value })} required /></label>
        <button className="primary-button" type="submit" disabled={salvandoSala}>{salvandoSala ? 'Salvando...' : 'Criar espaço'}</button>
      </form>

      <div className="account-panel">
        <div className="account-panel-heading">
          <div><h2>Espaços disponíveis</h2><p>Configure quais espaços podem ser unidos para um evento.</p></div>
          <span>{salas.length}</span>
        </div>
        {carregando && <p className="empty">Carregando espaços...</p>}
        {!carregando && salas.length === 0 && <p className="empty">Nenhum espaço cadastrado.</p>}
        <div className="room-list">
          {salas.map((sala) => <div key={sala.id} className="room-item">
            {editandoNomeId === sala.id
              ? <label className="room-capacity-field">Nome
                <input
                  type="text"
                  maxLength="80"
                  minLength="2"
                  autoFocus
                  value={nomesEspaco[sala.id] ?? sala.nome}
                  onChange={(event) => setNomesEspaco((valores) => ({ ...valores, [sala.id]: event.target.value }))}
                />
              </label>
              : <strong>{sala.nome}</strong>}
            {editandoNomeId === sala.id
              ? <div className="room-actions">
                <button className="primary-button" type="button" disabled={salvandoNomeId === sala.id || (nomesEspaco[sala.id] ?? sala.nome).trim() === sala.nome} onClick={() => atualizarNome(sala)}>{salvandoNomeId === sala.id ? 'Salvando...' : 'Salvar nome'}</button>
                <button className="link-button" type="button" disabled={salvandoNomeId === sala.id} onClick={() => {
                  setEditandoNomeId(null);
                  setNomesEspaco((valores) => {
                    const atualizados = { ...valores };
                    delete atualizados[sala.id];
                    return atualizados;
                  });
                }}>Cancelar</button>
              </div>
              : <button className="primary-button" type="button" disabled={salvandoNomeId !== null} onClick={() => {
                setEditandoNomeId(sala.id);
                setNomesEspaco((valores) => ({ ...valores, [sala.id]: sala.nome }));
              }}>Alterar nome</button>}
            <label className="room-capacity-field">Espaço unido
              <select value={salasConjugadas[sala.id] ?? ''} onChange={(event) => setSalasConjugadas((valores) => ({ ...valores, [sala.id]: event.target.value }))}>
                <option value="">Nenhuma</option>
                {salas.filter((opcao) => opcao.id !== sala.id).map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.nome}</option>)}
              </select>
            </label>
            <button className="primary-button" type="button" disabled={atualizandoCapacidadeId === sala.id || (salasConjugadas[sala.id] ?? '') === String(sala.conjugadaId || '')} onClick={() => atualizarSalaConjugada(sala)}>{atualizandoCapacidadeId === sala.id ? 'Salvando...' : 'Salvar união'}</button>
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
              <button className="link-button account-delete" type="button" disabled={removendoSalaId === sala.id || atualizandoCapacidadeId === sala.id} onClick={() => excluirSala(sala)}>{removendoSalaId === sala.id ? 'Removendo...' : 'Remover espaço'}</button>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}
