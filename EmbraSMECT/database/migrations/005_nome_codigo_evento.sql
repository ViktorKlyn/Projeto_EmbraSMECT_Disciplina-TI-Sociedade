ALTER TABLE reservas
    ADD COLUMN nome VARCHAR(160) NULL AFTER id,
    ADD COLUMN codigo VARCHAR(20) NULL AFTER nome;

UPDATE reservas
SET nome = CONCAT('Evento ', id),
    codigo = CONCAT('EVT-', LPAD(id, 6, '0'));

ALTER TABLE reservas
    MODIFY COLUMN nome VARCHAR(160) NOT NULL,
    MODIFY COLUMN codigo VARCHAR(20) NOT NULL,
    ADD CONSTRAINT uq_reservas_codigo UNIQUE (codigo);