# EmbraSMECT

Projeto acadêmico simples para gerenciamento de reservas de salas e recursos.

## Requisitos

- Node.js 18 ou superior
- npm

## Backend

```bash
cd backend
npm install
npm run dev
```

A API ficará disponível em `http://localhost:3000`. O endpoint `GET /api/status` confirma o funcionamento.

## Frontend

Em outro terminal:

```bash
cd frontend2
npm install
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`. Usuário de teste: `joao@email.com` e senha `123456`.

## Banco de dados

Execute `database/schema.sql` e depois `database/seed.sql` no seu banco SQL. A pasta `database/migrations` guarda alterações futuras.
