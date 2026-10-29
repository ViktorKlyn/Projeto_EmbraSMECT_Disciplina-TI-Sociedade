CREATE TABLE usuarios (
	id INTEGER PRIMARY KEY,
	nome VARCHAR(100) NOT NULL,
	email VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE salas (
	id INTEGER PRIMARY KEY,
	nome VARCHAR(100) NOT NULL,
	capacidade INTEGER NOT NULL
);

CREATE TABLE reservas (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
	sala TEXT NOT NULL,
	data_reserva DATE NOT NULL,
	recurso TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'Pendente'
		CHECK (status IN ('Pendente', 'Aprovada', 'Rejeitada')),
	criada_em TEXT NOT NULL
);
