# Erasmo Chopp

[![Testes](https://github.com/dev-kesh2k/erasmo-chopp/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-kesh2k/erasmo-chopp/actions/workflows/ci.yml)

Template de app de **pedido e entrega** (web e celular, instalável na Tela de Início): distribuidoras de chopp/bebidas, gás e água, marmitas, padarias etc. O nome da loja fica em Configurações (`storeName`, padrão "Meu Negócio"). No Criador de apps do Hub, `scripts/app-builder-template.js <slug> --name "Nome" --template pedido-entrega` copia este template para `projetos/<slug>`.

- **Cliente (sem login):** cardápio com categorias, busca, destaques e fotos; carrinho salvo no aparelho; finalizar pedido com celular, nome, endereço (com bairro) e, se quiser, o local exato marcado no mapa (pino, localização do aparelho ou busca pelo endereço — OpenStreetMap), **voltagem da máquina 127 V ou 220 V (obrigatória)**, dia da entrega escolhido num calendário (só os dias de entrega da loja ficam ativos) e faixa de horário, pagamento na entrega (Pix com a chave da loja, dinheiro com troco, cartão) e observações. Em "Pedidos" o cliente informa o celular e acompanha a situação (recebido → confirmado → saiu para entrega → entregue), cancela enquanto ainda não foi confirmado e manda o resumo para o WhatsApp da loja.
- **Loja (login em `/admin/login`):** painel do dia (novos, confirmados, em rota, vendido hoje/mês, estoque baixo, entregas de hoje); pedidos com filtros, busca, mudança de situação, pago/não pago, cancelamento com motivo, WhatsApp/ligar/mapa do cliente (abre o pino marcado) e voltagem da máquina em destaque; produtos (foto, preço, unidade, estoque opcional, destaque, categorias); entrega (dias, faixas de horário, horário limite para hoje, antecedência, pedido mínimo, abrir/fechar a loja); financeiro do mês; configurações (logo, nome, contatos, Pix, sobre) e conta.

## Regras
- A entrega é grátis para todos (sem taxa por bairro); o total do pedido é só a soma dos itens.
- Valores são calculados no servidor; o estoque baixa na mesma transação do pedido (sem vender além do disponível) e volta quando o pedido é cancelado.
- Pagamento é na entrega (sem gateway). Para cobrar online, integre em `createOrder` (`backend/src/orders.js`).
- Código: `backend/src/routes.js` (público e login), `admin.js` (painel), `orders.js` (pedido), `util.js` (configurações e validação).

## Login inicial (loja)
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `backend/.env.example` (criado no primeiro start; também fica no Cofre do Hub). O cardápio de exemplo é criado uma vez e depois editado pelo painel.

## Rodar localmente
```bash
# backend (Express + Prisma)
cd backend
cp .env.example .env          # ajuste DATABASE_URL e o login inicial
npm install
npx prisma migrate deploy
npm run db:seed               # dados de exemplo (uma vez)
npm start

# frontend (React + Vite), em outro terminal
cd frontend
npm install
npm run dev
```

## Publicação
Todo push na `main` publica o app no Central Apps Hub pelo GitHub Actions (`.github/workflows/deploy.yml`). Mudanças só em documentação não disparam o deploy.

## Testes

Testes do backend com o executor nativo do Node (`node:test`), sem banco e sem servidor rodando:

```bash
node --test backend/test/*.test.js
node --test frontend/test/*.test.ts   # frontend (Node 22 roda o TypeScript direto)
```

Cobrem as regras puras do backend (dates, store-rules, validate). O GitHub Actions roda os mesmos testes e um lint `no-undef` do backend em cada push e pull request (workflow `Testes`); mudanças só em `backend/test/` ou `frontend/test/` não republicam o app. Mais detalhes em [CONTRIBUTING.md](CONTRIBUTING.md).
