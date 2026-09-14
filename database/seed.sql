INSERT INTO usuarios (id, nome, email) VALUES
	(1, 'Ana Souza', 'ana@example.com'),
	(2, 'Bruno Lima', 'bruno@example.com');

INSERT INTO salas (id, nome, capacidade) VALUES
	(1, 'Sala de reuniões', 10),
	(2, 'Laboratório', 20);

INSERT INTO reservas (id, usuario_id, sala_id, data_reserva) VALUES
	(1, 1, 1, '2026-09-15');
