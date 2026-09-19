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

A API ficará disponível em `http://localhost:3000`. O endpoint `GET /api/status` confirma o funcionamento. Para produção, configure `JWT_SECRET` com uma chave longa e aleatória e `FRONTEND_URL` com a origem do frontend.

## Frontend

Em outro terminal:

```bash
cd frontend2
npm install
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`. As senhas iniciais fortes estão no retorno desta configuração; troque os cinco e-mails `@definir.local` no backend e no seed antes de usar.

## Banco de dados

Execute `database/schema.sql` e depois `database/seed.sql` no seu banco SQL. A pasta `database/migrations` guarda alterações futuras.
