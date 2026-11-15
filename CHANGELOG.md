# Changelog

Mudanças relevantes do app, da mais nova para a mais antiga. Cada item é um pull request mesclado na `main` (que publica o app).

## 2026-11-15

- **Correção:** valor digitado com ponto decimal ("350.50") agora vale R$ 350,50; antes virava R$ 35.050,00
- **CI:** testes do frontend (TypeScript direto no Node 22) e lint no-undef do backend
- **Novo:** pedido entregue ou cancelado tem *Pedir de novo*, que coloca os mesmos itens no carrinho (#27–#28)
- **Novo:** Financeiro → *Baixar pedidos do mês (CSV)*, com cliente, itens, valores, pagamento e status (#21–#25)
- **Saúde:** /health testa o banco e responde 503 se o Postgres cair (#20)
- Segurança: react-router v7 no frontend (corrige open redirect GHSA-wrjc-x8rr-h8h6) (#17)
- Frontend: dependências atualizadas pelo npm audit (versões compatíveis) (#16)
- Segurança: body-parser e qs atualizados no backend (npm audit) (#15)
- CI: roda os testes do backend no GitHub Actions (#14)
- Testes: dias e horários de entrega (#13)
- Testes: validação de e-mail, senha, celular, números e imagens (#12)
- Testes: datas e horas no fuso da loja (#11)
- Backend: regras de entrega e configurações da loja em store-rules.js (#10)
- Backend: validação de campos e HttpError em validate.js (#9)
- Backend: datas e horas da loja em dates.js (testáveis sem o banco) (#8)
- Deploy: mudanças só em testes não republicam o app (#7)
