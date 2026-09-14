function Home({ usuario, navegar }) {
  return (
    <section className="page home-page">
      <h1>Bem-vindo, {usuario}!</h1>
      <p>Escolha uma opção para continuar no EmbraSMECT.</p>
      <div className="home-actions">
        <button type="button" onClick={() => navegar('reservas')}>Reservar Sala</button>
        <button type="button" onClick={() => navegar('relatorios')}>Relatórios</button>
      </div>
    </section>
  );
}

export default Home;