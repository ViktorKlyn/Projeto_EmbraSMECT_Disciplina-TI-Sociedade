INSERT INTO usuarios (nome, email, senha) VALUES
('Joao Klein', 'joaoklein@email.com', '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq'),
('Gustavo Lira', 'gustavolira@email.com', '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq'),
('Fernando Vinícuis', 'fernandovinicius@email.com', '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq'),
('Nicolas Toshio', 'nicolastoshio@email.com', '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq'),
('Lormilus Kendy', 'lormiluskendy@email.com', '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq'),
('Helton Azevedo', 'heltonazevedo@email.com', '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq'),
('Visitante', 'visituser@email.local', '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq');

-- Inserindo salas fictícias
INSERT INTO salas (nome, capacidade) VALUES
('Sala 101', 30),
('Sala 202', 50);

-- Inserindo reservas iniciais
INSERT INTO reservas (usuario_id, sala_id, data, recurso, status) VALUES
(1, 1, '2026-09-20', 'Projetor', 'pendente'),
(2, 2, '2026-09-21', 'Quadro digital', 'aprovada');
