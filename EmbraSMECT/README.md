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

A API ficará disponível em `http://localhost:5000`. O endpoint `GET /api/status` confirma o funcionamento.

Se aparecer `EADDRINUSE`, a porta já está sendo usada por uma instância do backend. Verifique `http://localhost:5000/api/status` e reutilize essa instância; não execute `npm run dev` novamente em outro terminal. Para iniciar uma nova instância, encerre o processo anterior primeiro.

Crie `backend/.env` a partir de `backend/.env.example`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=use-uma-chave-longa-e-aleatoria
DATABASE_URL=
```

- `PORT`: porta em que o Express escuta. Localmente usamos `5000` para evitar conflito com processos na porta `3000`; no Railway, o valor fornecido pelo ambiente é usado.
- `FRONTEND_URL`: origem do frontend permitida pelo CORS.
- `JWT_SECRET`: chave privada usada para assinar e validar os tokens de login.
- `DATABASE_URL`: endereço do banco planejado para a versão persistente; atualmente as reservas ficam em memória.

## Frontend

Em outro terminal:

```bash
cd frontend2
npm install
npm run dev
```

Para apontar o frontend para o backend local, copie `frontend2/.env.local.example` para `frontend2/.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

O Vite lê `VITE_API_URL` durante o desenvolvimento e o cliente Axios acrescenta `/api` às chamadas. O arquivo `.env.local` é específico da máquina e não deve conter segredos compartilhados.

Em produção na Vercel, configure `VITE_API_URL` nas Environment Variables do projeto com a URL pública do backend. Configure também no backend as variáveis `JWT_SECRET`, `PORT` e `FRONTEND_URL` com os valores da hospedagem.

## Banco de dados

Execute `database/schema.sql` e depois `database/seed.sql` no seu banco SQL. A pasta `database/migrations` guarda alterações futuras.
