# Erasmo Chopp

Template de app de **pedido e entrega** (web e celular, instalável na Tela de Início): distribuidoras de chopp/bebidas, gás e água, marmitas, padarias etc. O nome da loja fica em Configurações (`storeName`, padrão "Meu Negócio"). No Criador de apps do Hub, `scripts/app-builder-template.js <slug> --name "Nome" --template pedido-entrega` copia este template para `projetos/<slug>`.

- **Cliente (sem login):** cardápio com categorias, busca, destaques e fotos; carrinho salvo no aparelho; finalizar pedido com celular, nome, bairro (taxa por bairro), endereço, dia e faixa de horário da entrega, pagamento na entrega (Pix com a chave da loja, dinheiro com troco, cartão) e observações. Em "Pedidos" o cliente informa o celular e acompanha a situação (recebido → confirmado → saiu para entrega → entregue), cancela enquanto ainda não foi confirmado e manda o resumo para o WhatsApp da loja.
- **Loja (login em `/admin/login`):** painel do dia (novos, confirmados, em rota, vendido hoje/mês, estoque baixo, entregas de hoje); pedidos com filtros, busca, mudança de situação, pago/não pago, cancelamento com motivo, WhatsApp/ligar/mapa do cliente; produtos (foto, preço, unidade, estoque opcional, destaque, categorias); entrega (bairros e taxas, dias, faixas de horário, horário limite para hoje, antecedência, pedido mínimo, abrir/fechar a loja); financeiro do mês; configurações (logo, nome, contatos, Pix, sobre) e conta.

## Regras
- Valores são calculados no servidor; o estoque baixa na mesma transação do pedido (sem vender além do disponível) e volta quando o pedido é cancelado.
- Pagamento é na entrega (sem gateway). Para cobrar online, integre em `createOrder` (`backend/src/orders.js`).
- Código: `backend/src/routes.js` (público e login), `admin.js` (painel), `orders.js` (pedido), `util.js` (configurações e validação).

## Login inicial (loja)
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `backend/.env.example` (criado no primeiro start; também fica no Cofre do Hub). O cardápio e os bairros de exemplo são criados uma vez e depois editados pelo painel.
