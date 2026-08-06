# Migração do protótipo para um backend real

Este documento descreve como tirar o **Painel de Entregas** do ambiente de
artifacts do Claude e colocá-lo rodando de forma independente, com um
backend e banco de dados de verdade.

## Por que migrar

O protótipo atual guarda todos os dados através de `window.storage`, uma
API que só existe dentro do Claude. Ela é ótima para validar a interface e
o fluxo, mas tem três limitações que não dá para resolver sem migrar:

- **Sem criptografia de senha** — logins e senhas ficam salvos em texto simples.
- **Sem controle de acesso** — qualquer pessoa com o link do artifact lê e
  grava nos mesmos dados; não existe "sessão" real por usuário.
- **Depende do Claude estar no ar** — não roda em domínio próprio.

## O que já está pronto para migrar

Todo o front-end (telas, formulários, lógica de rotas/pedidos/motoboys) já
está isolado do armazenamento: tudo passa por duas funções, `loadDB()` e
`saveDB()`, que hoje chamam `window.storage` e depois passarão a chamar sua
API. Nenhuma outra parte do código (renderização, botões, validações)
precisa mudar.

## Modelo de dados sugerido

Hoje tudo fica em um único objeto JSON. Numa migração para banco relacional
(Postgres, MySQL) ou coleções NoSQL, o desenho natural é uma tabela/coleção
por entidade:

| Entidade | Campos | Observações |
|---|---|---|
| `usuarios` | id, nome, login (único), senha_hash, papel (`admin`/`vendedor`) | senha precisa de hash (bcrypt/argon2), nunca texto simples |
| `motoboys` | id, nome, status (`disponivel`/`em_rota`/`ausente`) | |
| `locais` | id, nome, endereco | |
| `pedidos` | id, dav (único), cliente, local_id, vendedor_id, status (`pendente`/`em_rota`/`entregue`), motoboy_id (nulo), rota_id (nulo), hora_saida, hora_entrega, criado_em | |
| `rotas` | id, motoboy_id, status (`em_andamento`/`concluida`), hora_saida, hora_chegada | pedidos vinculados por `pedidos.rota_id`, não por lista embutida |

## Endpoints sugeridos

Autenticação:
- `POST /api/login` — recebe login/senha, retorna um token de sessão (JWT ou cookie de sessão)
- `POST /api/logout`

Dados (todos exigindo o token da sessão):
- `GET /api/motoboys`, `POST /api/motoboys`, `PATCH /api/motoboys/:id`, `DELETE /api/motoboys/:id`
- `GET /api/locais`, `POST /api/locais`, `DELETE /api/locais/:id`
- `GET /api/pedidos`, `POST /api/pedidos`, `GET /api/pedidos/dav/:numero`
- `POST /api/rotas` (monta rota / atribui pedidos), `PATCH /api/rotas/:id` (editar/reatribuir/concluir), `DELETE /api/rotas/:id`
- `GET /api/usuarios`, `POST /api/usuarios`, `DELETE /api/usuarios/:id` — só para admins

## Autenticação e permissões

- Senhas com hash (bcrypt ou argon2), nunca armazenadas em texto simples.
- Sessão via cookie `httpOnly` + `secure`, ou JWT de curta duração.
- No backend, checar o papel (`admin`/`vendedor`) em cada endpoint sensível
  (cadastros, rotas) — hoje isso só é checado no front-end, o que não é
  seguro fora do ambiente controlado do artifact.
- Regra de negócio que já existe no front-end e deve ser repetida no
  backend: não permitir remover o último administrador.

## Sugestão de stack para a migração

- **Front-end**: pode reaproveitar quase 100% do HTML/CSS/JS atual.
- **Backend + banco**: Supabase ou Firebase (mais rápido de configurar,
  já vêm com autenticação pronta) ou um backend próprio em Node.js/Express
  com Postgres, se quiser mais controle.
- **Hospedagem**: Vercel, Netlify ou qualquer hospedagem que sirva HTML
  estático + as chamadas de API.

O Claude Code consegue implementar e implantar qualquer uma dessas opções
quando você estiver pronto para seguir com a migração.
