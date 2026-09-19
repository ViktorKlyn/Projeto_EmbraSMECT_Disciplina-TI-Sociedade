-- Inserindo usuários fictícios
INSERT INTO usuarios (nome, email, senha) VALUES
('Joao', 'joao@email.com', '123456'),
('Maria', 'maria@email.com', 'abcdef');

-- Inserindo salas fictícias
INSERT INTO salas (nome, capacidade) VALUES
('Sala 101', 30),
('Sala 202', 50);

-- Inserindo reservas iniciais
INSERT INTO reservas (usuario_id, sala_id, data, recurso, status) VALUES
(1, 1, '2026-09-20', 'Projetor', 'pendente'),
(2, 2, '2026-09-21', 'Quadro digital', 'aprovada');
