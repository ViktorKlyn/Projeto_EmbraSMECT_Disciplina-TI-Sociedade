ALTER TABLE reservas
    ADD COLUMN convidado_id INT NULL AFTER usuario_id,
    ADD COLUMN motivo_rejeicao VARCHAR(500) NULL AFTER status,
    ADD COLUMN assento VARCHAR(80) NOT NULL DEFAULT 'A definir' AFTER motivo_rejeicao,
    ADD COLUMN palestrante VARCHAR(160) NOT NULL DEFAULT 'A definir' AFTER assento,
    ADD COLUMN duracao_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 60 AFTER palestrante,
    ADD COLUMN brinde VARCHAR(160) NOT NULL DEFAULT 'A definir' AFTER duracao_minutos,
    ADD COLUMN participantes SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER brinde,
    ADD CONSTRAINT fk_reservas_convidado FOREIGN KEY (convidado_id) REFERENCES usuarios(id);