function Relatorios({ reservas }) {
    return (
        <section className="page reports-page">
            <h1>Relatórios</h1>
            <div className="report-toolbar"><p>Resumo das reservas cadastradas.</p><button type="button">Exportar</button></div>
            <div className="table-wrapper"><table>
                <thead><tr><th>Sala</th><th>Data</th><th>Status</th></tr></thead>
                <tbody>
                    {reservas.map((reserva) => <tr key={reserva.id}><td>{reserva.sala}</td><td>{reserva.data}</td><td>{reserva.status}</td></tr>)}
                </tbody>
            </table></div>
        </section>
    );
}

export default Relatorios;