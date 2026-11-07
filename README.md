# Embrapa Meeting

Projeto acadêmico simples para gerenciamento de salas e reservas.

## Backend

```bash
cd backend
npm install
npm start
```

A API estará disponível em `http://localhost:3000`. A rota `GET /` retorna uma mensagem de funcionamento.

## Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm start
```

O React abrirá a aplicação em `http://localhost:3001` ou na próxima porta disponível.

## Banco de dados

O backend inicializa e atualiza o SQLite em `database/embrasmect.db` ao iniciar.

## Google Agenda

O projeto sincroniza reuniões criadas e reservas aprovadas com a agenda principal da conta Google do criador. Reservas só são sincronizadas após aprovação; ao conectar uma conta, eventos anteriores ainda ativos/aprovados também são sincronizados. Reservas são eventos de dia inteiro, pois o formulário de reserva não solicita horário. Reuniões usam os horários informados e o fuso `America/Sao_Paulo` por padrão.

Para habilitar:

1. No Google Cloud Console, habilite a Google Calendar API e configure a tela de consentimento OAuth, incluindo sua conta como usuária de teste se o app estiver em modo de teste.
2. Crie um OAuth Client ID do tipo aplicação Web com URI de redirecionamento `http://localhost:3000/api/google-calendar/callback`.
3. Gere uma chave de criptografia uma vez e guarde-a em local seguro:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. No PowerShell, defina as variáveis no terminal que iniciará o backend. Use sempre a mesma chave persistente gerada no passo anterior:

```powershell
$env:GOOGLE_CLIENT_ID = "seu-client-id"
$env:GOOGLE_CLIENT_SECRET = "seu-client-secret"
$env:GOOGLE_TOKEN_ENCRYPTION_KEY = "cole-a-chave-hexadecimal-persistente-aqui"
$env:FRONTEND_URL = "http://localhost:3001"
Set-Location backend
npm start
```

Se a porta do frontend for diferente, ajuste `FRONTEND_URL`. Opcionalmente, configure `GOOGLE_REDIRECT_URI` e `GOOGLE_CALENDAR_TIME_ZONE`.

Na tela **Reuniões**, conecte a conta Google e use o formulário para criar reuniões. Os eventos são enviados à conta Google por OAuth; tokens são armazenados criptografados no banco local.

**Limitação:** a autenticação de usuários deste projeto é demonstrativa, baseada em IDs selecionáveis no navegador. Portanto, essa conexão serve apenas para prototipagem acadêmica e não é segura para uso real ou multiusuário. Antes de disponibilizar publicamente, implemente autenticação real e autorização no servidor.
