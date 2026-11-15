# Changelog

Mudanças relevantes do app, da mais nova para a mais antiga. Cada item é um pull request mesclado na `main` (que publica o app).

## 2026-11-15

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
