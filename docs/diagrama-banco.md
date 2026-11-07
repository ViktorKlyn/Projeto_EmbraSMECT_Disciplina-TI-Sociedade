# Diagrama do banco

- **usuarios:** possui `id` como chave primária, além de nome e e-mail.
- **salas:** possui `id` como chave primária, nome e capacidade.
- **reservas:** possui `id` como chave primária e as chaves estrangeiras `usuario_id` e `sala_id`.

As chaves estrangeiras ligam cada reserva ao usuário e à sala correspondentes.
