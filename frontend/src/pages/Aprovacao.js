function Aprovacao({ reservas, atualizarStatus }) {
  // Os botões alteram somente o status local da reserva selecionada.
  const pendentes = reservas.filter((reserva) => reserva.status === 'Pendente');

  return (
    <section className="page approval-page">
      <h1>Aprovação</h1>
      {pendentes.length === 0 && <p>Não há reservas pendentes.</p>}
      <ul className="approval-list">
        {pendentes.map((reserva) => (
          <li key={reserva.id} className="approval-item">
            <span>{reserva.data} - {reserva.sala} - {reserva.recurso}</span>
            <span className="actions">
              <button type="button" onClick={() => atualizarStatus(reserva.id, 'Aprovada')}>Aprovar</button>
              <button type="button" onClick={() => atualizarStatus(reserva.id, 'Rejeitada')}>Rejeitar</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Aprovacao;