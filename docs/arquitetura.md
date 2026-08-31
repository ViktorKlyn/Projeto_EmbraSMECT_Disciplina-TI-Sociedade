EmbraSMECT/
│
├── frontend/              # VIEW - Interface do usuário (React)
│   ├── public/
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis (botões, inputs, calendário)
│   │   ├── pages/         # Páginas (Reservas, Relatórios, Login, Aprovação)
│   │   ├── services/      # Conexão com API
│   │   └── App.js
│   └── package.json
│
├── backend/               # CONTROLLER - API e regras de negócio (Node.js + Express)
│   ├── src/
│   │   ├── routes/        # Rotas da API (reservas, salas, recursos, usuários)
│   │   ├── controllers/   # Lógica de cada rota
│   │   ├── models/        # Modelos que conversam com o banco
│   │   └── server.js
│   └── package.json
│
├── database/              # MODEL - Banco de dados (PostgreSQL/Supabase)
│   ├── schema.sql         # Estrutura das tabelas
│   └── seed.sql           # Dados iniciais para testes
│
├── docs/                  # Documentação
│   └── arquitetura.md
│
└── README.md              # Guia inicial do projeto
