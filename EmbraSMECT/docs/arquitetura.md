# Arquitetura

O EmbraSMECT usa uma arquitetura simples em camadas:

- **Frontend:** aplicação React responsável pela interface.
- **Backend:** API Node.js com Express, organizada em rotas, controladores, serviços e repositórios.
- **Banco de dados:** scripts SQL com tabelas e dados iniciais.

O frontend acessa o backend por HTTP usando Axios. O backend pode ser executado separadamente na porta 3000. Nesta primeira versão, a API mantém reservas em memória para facilitar o uso acadêmico; os scripts SQL representam o modelo persistente planejado.
```text
EmbraSMECT/
|
├── frontend2/ ------------- > [ Visualização e uso por parte do usuário ]
│   ├── public/ ------------ > # Arquivos públicos #
│   ├── src/ --------------- > # Código principal React #
│   │   ├── components/ ---- > (Componentes reutilizáveis) 
│   │   ├── pages/ --------- > (Telas completas do sistema) 
│   │   ├── services/ ------ > (Comunicação com o backend) 
│   │   ├── hooks/ --------- > (Lógica reutilizável do react) 
│   │   ├── contexts/ ------ > (Compartilhar informações entre telas) 
│   │   └── App.js --------- : {Ponto inicial do react}
│   └── package.json ------- : { Histórico e Config. }
|
├── backend/ --------------- > [ Responsável pelas regras do sistema ]       
│   ├── src/ --------------- > # Pasta mantenedora do backend # 
│   │   ├── routes/ -------- > (Define as url's da api)
│   │   ├── controllers/ --- > (Recebe a requisição)
│   │   ├── services/ ------ > (Onde fica armazenada as regras de negócios)
│   │   ├── repositories/ -- > (Conversam diretamente com o banco)
│   │   ├── models/ -------- > (Representam entidades do sistema)
│   │   ├── middlewares/ --- > (Executam antes da rota)
│   │   ├── validations/ --- > (Validação dos dados recebidos)
│   │   ├── config/ -------- > (Configurações gerais)
│   │   └── server.js ------ : {Ponto inicial do backend}
│   └── package.json ------- : { Histórico e Config. }
│
├── database/ -------------- > [ Onde os dados são armazenados ]
│   ├── migrations/ -------- > # Histórico de alterações do banco #
│   ├── schema.sql --------- : { Estrutura completa do banco }
│   └── seed.sql ----------- : { Dados iniciais }
│
├── docs/ ------------------ > [ Documentação do projeto ]
│   ├── arquitetura.md ----- : { Explica toda a arquitetura }
│   ├── casos-de-uso.md ---- : { Descreve o que cada usuário pode fazer }
│   ├── diagrama-classe.md - : { Mostra as entidades e relacionamentos }
│   └── diagrama-banco.md -- : { Mostra as tabelas do banco }
│
└── README.md -------------- : { É o manual do projeto }
```