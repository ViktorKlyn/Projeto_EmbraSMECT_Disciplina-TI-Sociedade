import { useState } from 'react';

function Reservas({ reservas, adicionarReserva }) {
    // O formulário cria uma reserva e a lista mostra o estado atual.
    const [formulario, setFormulario] = useState({ data: '', sala: '', recurso: '' });

    function atualizarCampo(event) {
        setFormulario({ ...formulario, [event.target.name]: event.target.value });
    }

    function enviarFormulario(event) {
        event.preventDefault();
        adicionarReserva(formulario);
        setFormulario({ data: '', sala: '', recurso: '' });
    }

    return (
        <section className="page reservations-page">
            <h1>Reservas</h1>
            <div className="page-grid">
            <form className="form-card" onSubmit={enviarFormulario}>
                <label htmlFor="data">Data</label>
                <input id="data" name="data" type="date" value={formulario.data} onChange={atualizarCampo} required />
                <label htmlFor="sala">Sala</label>
                <input id="sala" name="sala" value={formulario.sala} onChange={atualizarCampo} placeholder="Ex.: Sala de reuniões" required />
                <label htmlFor="recurso">Recurso</label>
                <input id="recurso" name="recurso" value={formulario.recurso} onChange={atualizarCampo} placeholder="Ex.: Projetor" required />
                <button type="submit">Enviar</button>
            </form>
            <div className="list-card">
                <h2>Reservas feitas</h2>
                <ul>{reservas.map((reserva) => <li key={reserva.id}>{reserva.data} - {reserva.sala} - {reserva.recurso} <span className="status">{reserva.status}</span></li>)}</ul>
            </div>
            </div>
        </section>
    );
}

export default Reservas;