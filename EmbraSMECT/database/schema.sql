-- Criação das tabelas principais
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL,
    role ENUM('admin', 'organizer', 'guest') NOT NULL DEFAULT 'guest'
);

CREATE TABLE salas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    capacidade INT NOT NULL
);

CREATE TABLE reservas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(160) NOT NULL,
    descricao TEXT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    usuario_id INT NOT NULL,
    sala_id INT NOT NULL,
    data DATE NOT NULL,
    recurso VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    motivo_rejeicao VARCHAR(500) NULL,
    gerenciar_assentos BOOLEAN NOT NULL DEFAULT FALSE,
    palestrante VARCHAR(160) NOT NULL DEFAULT 'A definir',
    duracao_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    brinde VARCHAR(160) NOT NULL DEFAULT 'A definir',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (sala_id) REFERENCES salas(id)
);

CREATE TABLE inscricoes_eventos (
    reserva_id INT NOT NULL,
    convidado_id INT NOT NULL,
    assento VARCHAR(80) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reserva_id, convidado_id),
    UNIQUE KEY uq_inscricao_assento (reserva_id, assento),
    FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE,
    FOREIGN KEY (convidado_id) REFERENCES usuarios(id) ON DELETE CASCADE
);