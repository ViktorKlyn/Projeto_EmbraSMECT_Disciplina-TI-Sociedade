import { useState } from 'react';
import Header from './components/Header';
import Aprovacao from './pages/Aprovacao';
import Home from './pages/Home';
import Login from './pages/Login';
import Relatorios from './pages/Relatorios';
import Reservas from './pages/Reservas';
import './style.css';

function App() {
	// A tela inicial e o usuário ficam no estado para simular uma sessão simples.
	const [pagina, setPagina] = useState('login');
	const [usuario, setUsuario] = useState('');
	const [reservas, setReservas] = useState([
		{ id: 1, sala: 'Sala de reuniões', data: '2026-09-15', recurso: 'Projetor', status: 'Pendente' },
	]);

	function entrar(nome) {
		setUsuario(nome);
		setPagina('home');
	}

	function adicionarReserva(reserva) {
		setReservas((reservasAtuais) => [
			...reservasAtuais,
			{ ...reserva, id: Date.now(), status: 'Pendente' },
		]);
	}

	function atualizarStatus(id, status) {
		setReservas((reservasAtuais) => reservasAtuais.map((reserva) => (
			reserva.id === id ? { ...reserva, status } : reserva
		)));
	}

	function renderizarPagina() {
		if (pagina === 'home') return <Home usuario={usuario} navegar={setPagina} />;
		if (pagina === 'reservas') return <Reservas reservas={reservas} adicionarReserva={adicionarReserva} />;
		if (pagina === 'relatorios') return <Relatorios reservas={reservas} />;
		if (pagina === 'aprovacao') return <Aprovacao reservas={reservas} atualizarStatus={atualizarStatus} />;
		return <Login entrar={entrar} />;
	}

	return (
		<div className="app">
			{pagina !== 'login' && <Header navegar={setPagina} usuario={usuario} />}
			<main className={`container ${pagina === 'login' ? 'container-login' : ''}`}>
				{renderizarPagina()}
			</main>
			<footer className="footer">Projeto acadêmico EmbraSMECT</footer>
		</div>
	);
}

export default App;
