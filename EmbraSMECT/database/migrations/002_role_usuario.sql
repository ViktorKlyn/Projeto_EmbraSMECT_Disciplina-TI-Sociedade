-- Adiciona papel aos usuários existentes; contas antigas começam como convidadas.
ALTER TABLE usuarios
    ADD COLUMN role ENUM('admin', 'organizer', 'guest') NOT NULL DEFAULT 'guest';