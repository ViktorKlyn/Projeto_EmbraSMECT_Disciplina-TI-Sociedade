INSERT INTO usuarios (id, nome, email) VALUES
	(1, 'Ana Souza', 'ana@example.com'),
	(2, 'Bruno Lima', 'bruno@example.com');

INSERT INTO salas (id, nome, capacidade) VALUES
	(1, '1 (Tropical)', 3),
	(2, '2 (Doko)', 20),
	(3, '3 (Conquista)', 50),
	(4, '4 (Uirapuru)', 20),
	(5, '5 (Pintado)', 20),
	(6, '6 (Vencedora)', 20),
	(7, '7 (Tracajá)', 20),
	(8, 'Auditório Principal', 50);

INSERT INTO reservas (usuario_id, sala, data_reserva, recurso, status, criada_em) VALUES
	(1, '1 (Tropical)', '2026-09-15', 'Nenhum recurso especial', 'Pendente', '2026-09-01T10:00:00.000Z');
