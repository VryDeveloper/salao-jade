# Relatório de testes — Salão Jade

**Data:** 02/11/2026 · **Build:** produção (`next build`, pasta `.next-e2e`) · **Navegador:** Chromium (Playwright 1.64.1)
**Banco:** Postgres 17 local (docker-compose), semeado

## Resumo

| Etapa | Resultado |
|---|---|
| Tipos (`tsc --noEmit`) | ✅ 0 erros |
| Lint (ESLint) | ✅ 0 erros, 0 avisos |
| Build de produção | ✅ 9 rotas; páginas com sessão em Partial Prerender |
| Testes unitários e de banco (Vitest) | ✅ **47/47** em 6 arquivos (3,5 s) |
| Testes de ponta a ponta (Playwright) | ✅ **3/3** (1 pulado: só gera print com `SCREENSHOTS=1`) |
| Auditoria visual (9 telas × 2 larguras) | ✅ sem rolagem lateral, fontes carregadas, sem botão/campo sem nome |
| Auditoria de motion | ✅ todas as animações medidas rodando; movimento reduzido respeitado |

**Encontrado e corrigido durante os testes:** 4 itens (abaixo). **Em aberto:** 1 ponto de atenção.

## 1. Estáticos

```
tsc: 0 erros
eslint: 0 problemas
build: ✓ Compiled successfully
  ○ /  ○ /entrar  ○ /cadastro  ○ /_not-found          (estáticas)
  ◐ /agenda  ◐ /reservas  ◐ /admin  ◐ /admin/clientes  ◐ /admin/funcionamento  (shell estático + streaming)
  ƒ Proxy (Middleware)
```

## 2. Unitários e de banco (Vitest) — 47/47

| Arquivo | Testes | O que cobre |
|---|---|---|
| `availability.test.ts` | 14 | fuso de São Paulo, durações válidas, grade por duração, **sala por intervalo (não por contagem)**, 4 salas, conflito com reserva própria, horário passado, regra das 24h, intervalos que só encostam |
| `bookings.db.test.ts` | 15 | **10 pessoas ao mesmo tempo → exatamente 4 reservas, uma por sala**; **mesma pessoa 5× ao mesmo tempo → 1**; sobreposição entre experiências; duração gravada; **nomes dos acompanhantes gravados e titular contado**; acompanhante sem nome recusado; duração inválida, fora da grade, pessoas demais, dia fechado, passar do fechamento; remarcar mudando duração; remarcar para horário lotado; só o dono cancela e a sala volta a ficar livre; prazo de 24h |
| `admin.db.test.ts` | 6 | salão cancela a menos de 24h; não cancela o que já começou; não fecha dia com reserva; fecha, não duplica e reabre; recusa data passada; não desativa sala com reserva futura |
| `validation.test.ts` | 8 | cadastro (e-mail normalizado, erros no campo certo), login, força da senha |
| `rate-limit.test.ts` | 2 | bloqueio após o limite e reset |
| `format.test.ts` | 2 | "30 min / 1 h / 1h30 / 2 h", intervalo e duração no fuso do salão |

## 3. Ponta a ponta (Playwright, build de produção) — 3/3

| Teste | Resultado |
|---|---|
| Visitante sem sessão em `/agenda` vai para `/entrar` | ✅ 0,3 s |
| Entrar → Chá & dim sum → 1h30 → último dia → horário → +1 pessoa com nome → confirmar (sala, intervalo e "Marina Souza, Ana Lima" na confirmação) → card em Minhas reservas com 1h30 e "Ana Lima" → cancelar → histórico "cancelada" | ✅ 6,0 s |
| Cliente comum não vê "Painel do salão" e recebe 404 em `/admin`; admin entra direto no painel e navega por Reservas, Clientes e Funcionamento | ✅ 5,2 s |
| Print da agenda no celular | ⏭️ pulado (só com `SCREENSHOTS=1`) |

**1ª execução: 1 falha, corrigida.** O teste clicava em "Chá & dim sum" e logo em "1h30" sem esperar a página trocar; o link de 1h30 ainda apontava para a experiência anterior e a reserva saiu como cerimônia gongfu. O teste passou a esperar a seleção mudar antes do próximo passo (como uma pessoa faz). A reserva que sobrou da falha (JD-64F10A) foi cancelada.

## 4. Auditoria visual — 18 combinações

Telas: home, entrar, cadastro, 404, agenda, minhas reservas, painel (reservas, clientes, funcionamento) · larguras: 1440 px e 390 px.

| Verificação | Resultado |
|---|---|
| Status HTTP | 200 em todas (404 na página 404, como esperado) |
| Rolagem lateral | 0 px em todas |
| Fontes Cormorant Garamond e Manrope | carregadas em todas |
| Título `h1` | presente em todas |
| Botão ou link sem nome acessível | 0 |
| Campo sem rótulo | 0 |
| Erros de página / console | 0 (fora o 404 esperado da página 404) |
| Alvos de toque menores que 24 px | só falsos positivos: os checkboxes (o rótulo em volta tem 44 px) e "Criar conta"/"Entrar" dentro de uma frase (permitido) |

## 5. Auditoria de motion (movimento ligado, desktop)

| Elemento | Esperado | Medido |
|---|---|---|
| Fluido "chá em infusão" (home) | canvas no tamanho da tela e quadros diferentes a cada segundo | ✅ 1440×900; quadros mudam |
| Título que sobe da máscara | `line-up`, 0,9 s, expo-out | ✅ `line-up` · 0.9s · `cubic-bezier(0.16, 1, 0.3, 1)` |
| Cascata dos horários | +30 ms por card, teto em 12 | ✅ 0 · 0.03 · 0.06 … 0.36 · 0.36 s |
| Hover no horário | sobe 1 px e borda dourada | ✅ `translate: 0px -1px` · `rgb(201, 164, 92)` |
| Seleção do horário | "pop" de 260 ms | ✅ `pop` · 0.26s |
| ✓ da confirmação | traço desenhado | ✅ `draw` · 0.42s |
| Seleção líquida (trocar dia, duração) | morph de view transition com desfoque | ✅ grupos `dia-ativo`, `duracao-ativa`, `experiencia-ativa` + `liquid` |
| Agendar → Minhas reservas | conteúdo sai e entra deslizando | ✅ `slide-out` / `slide-in` + `fade-out` / `fade-in` |
| Minhas reservas → Agendar | o mesmo, no sentido contrário | ✅ `slide-out` / `slide-in` |
| Esqueleto → conteúdo | conteúdo sobe ao chegar | ✅ `rise-in` |

## 6. Movimento reduzido

| Elemento | Esperado | Medido |
|---|---|---|
| Fluido | um quadro parado | ✅ quadros idênticos |
| Título | sem deslocamento, visível | ✅ `translate: none` · opacidade 1 |
| Horários | sem deslocamento, visíveis | ✅ `translate: none` · opacidade 1 |
| Brilho do esqueleto | desligado | ✅ |

## 7. Corrigido durante os testes

1. **Menu do topo no celular quebrava em duas linhas** com o 3º item ("Painel do salão"). Agora fica em uma linha e rola dentro do próprio menu se faltar espaço; a página não rola de lado.
2. **E-mail e telefone no painel eram alvos de toque pequenos** (~20 px). Ganharam área de toque maior.
3. **Teste e2e com corrida** entre dois cliques (seção 3).
4. **Infraestrutura de teste:** o build do e2e agora vai para `.next-e2e` (variável `NEXT_DIST_DIR`), então roda junto com o `npm run dev` sem congelar o CSS dele; o ESLint ignora essa pasta; os testes de banco rodam um arquivo por vez, porque compartilham o mesmo Postgres.

## 8. Ponto de atenção — resolvido depois do relatório

- **Cliques muito rápidos na agenda desfaziam o passo anterior.** Experiência, duração e dia eram links com a URL montada para a página que estava na tela; um clique antes da página atualizar levava a escolha antiga.
- **Correção:** `ParamLink` monta a URL no clique, a partir da última escolha pedida (mesmo com a navegação em curso), e troca só o próprio parâmetro. O `href` do servidor continua para nova aba e sem JavaScript.
- **Prova:** o e2e "cliques rápidos na agenda não desfazem o passo anterior" clica Mesa de chá → 2 h → último dia sem esperar. Na versão antiga ele **falha** (a URL termina em `exp=cerimonia-gongfu&dur=60`); com a correção, **passa**. Conferido também que o morph da seleção, a barra de carregamento e o Ctrl+clique continuam funcionando.
- Suíte depois da correção: Vitest 47/47, e2e 4/4.

## 9. Dados de teste

Todas as reservas criadas pelos testes foram canceladas (JD-64F10A, JD-A2C6A8, JD-5207B5 e as do e2e); usuários de teste do banco são apagados ao fim de cada execução.

## 10. Produção — https://salao-jade.vercel.app (03/11/2026)

Vercel + Neon (Postgres), deploy da `main`. Migração e seed rodaram no build (`vercel-build`).

| Verificação | Resultado |
|---|---|
| e2e contra o site publicado (`E2E_BASE_URL`) | ✅ 4/4 (1 pulado, só print) |
| Auditoria visual: 9 telas × 1440 e 390 px | ✅ sem rolagem lateral, fontes carregadas, nada sem nome acessível |
| Fluido | ✅ anima; parado com movimento reduzido |
| Títulos, cascata, pop, ✓, morph líquido, transições com direção | ✅ todos rodando (mesmos valores da seção 5) |
| Cookie de sessão | ✅ `Secure`, `HttpOnly`, `SameSite=Lax`, invisível ao JavaScript |
| Sair | ✅ depois de sair, `/agenda` volta a redirecionar para o login (307) |

Observação: o link de prévia da branch (`salao-jade-git-main-…vercel.app`) exige login na Vercel; o endereço público é `salao-jade.vercel.app`.
Reserva de teste criada e cancelada no site publicado: JD-552EA7 e as do e2e.
