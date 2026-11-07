ALTER TABLE reservas
    DROP FOREIGN KEY fk_reservas_convidado,
    DROP COLUMN convidado_id,
    DROP COLUMN assento,
    DROP COLUMN participantes,
    ADD COLUMN gerenciar_assentos BOOLEAN NOT NULL DEFAULT FALSE AFTER motivo_rejeicao;

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