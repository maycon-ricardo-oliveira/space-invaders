# Roadmap

> **Living document** — update it every time you open or merge a PR.
> Opening PR → `🚧 In Progress (PR #N)` · Merging PR → `✅ Done (PR #N)`
> Both updates must be part of the **same commit** as the code change.
>
> Feature codes follow the **Feature Registry** in `docs/superpowers/specs/2026-04-27-game-design-v2.md`.
> Commit format: `[SCOPE] type(DOMAIN-N): description`

---

## Concluído

| Sprint | Feature | Status | PR | Codes |
|--------|---------|--------|-----|-------|
| 1 | Monorepo setup + dev environment | ✅ Done | bootstrap | INFRA |
| 2 | Level Engine | ✅ Done (PR #3) | — | ENGINE |
| 3 | Game MVP | ✅ Done (PR #3) | — | GL, HUD |
| 4 | Calibrator MVP | ✅ Done (PR #5) | — | CAL |
| 5a | Game Mechanics (controls + HUD) | ✅ Done (PR #8) | — | GL, HUD |

---

## Próximos — Fase 1: Core Game Loop

| Feature | Código | Status | PR | Descrição |
|---------|--------|--------|-----|-----------|
| Parallax scrolling | PARA-1 | ⏳ Todo | — | Background multicamadas, ilusão de movimento |
| Movimento 2D livre | GL-1 | ⏳ Todo | — | Joystick → X+Y, velocidade aumentada |
| Sistema de HP bar | HP-1 | ⏳ Todo | — | Barra contínua substituindo 3 vidas |
| Drops de vida | HP-2 | ⏳ Todo | — | Asteroids/inimigos dropam vida (20% HP) |
| Sistema de combustível | FUEL-1 | ⏳ Todo | — | Tanque drena por fase, coleta mid-fase |
| HUD atualizado | HUD-1 | ⏳ Todo | — | HP bar, tanque de combustível, score |
| Asteroids | ENEMY-1 | ⏳ Todo | — | Obstáculos destrutíveis, dropam HP/fuel |
| Inimigo rápido | ENEMY-2 | ⏳ Todo | — | Alta velocidade, baixo HP |
| Inimigo forte | ENEMY-3 | ⏳ Todo | — | Multi-hit, alto HP |
| Wave list por level | GL-2 | ⏳ Todo | — | Cada level tem lista de waves; todas devem ser limpas |
| Tela de cartas | CARD-1 | ⏳ Todo | — | Pausa após último inimigo, 3 cartas, escolhe 1 |
| Deck de cartas MVP | CARD-2 | ⏳ Todo | — | 14 cartas do Planeta 1 |
| Pausa/revive | GL-3 | ⏳ Todo | — | Player morre → pausa → tela de revive (1x por run) |

---

## Fase 2: Estrutura de Planetas

| Feature | Código | Status | PR | Descrição |
|---------|--------|--------|-----|-----------|
| Estrutura planeta/fase/level | PLANET-1 | ⏳ Todo | — | 1 planeta, 10 fases, 10 levels por fase |
| Hub do planeta | PLANET-2 | ⏳ Todo | — | Tela de hub com arte, nome, progresso do player |
| Boss básico | BOSS-1 | ⏳ Todo | — | Boss Padrão — fase 5 level 10 e fase 10 |
| Boss rápido | BOSS-2 | ⏳ Todo | — | Boss Rápido |
| Boss forte | BOSS-3 | ⏳ Todo | — | Boss Forte |
| Boss duplo | BOSS-4 | ⏳ Todo | — | 2 bosses simultâneos — fase 10 level 10 |
| Wave patterns | CAL-1 | ⏳ Todo | — | Editor de padrões de spawn (diamante, triângulo, etc.) |
| Templates de wave | CAL-2 | ⏳ Todo | — | Padrões reutilizáveis para geração automatizada |

---

## Fase 3: Meta Progression

| Feature | Código | Status | PR | Descrição |
|---------|--------|--------|-----|-----------|
| Upgrades permanentes | META-1 | ⏳ Todo | — | 8 upgrades × 10 níveis, comprados com gold |
| Tela do hangar | META-2 | ⏳ Todo | — | UI de upgrades permanentes |
| Sistema de equipamentos | INV-1 | ⏳ Todo | — | Canhão + Casco, raridades Comum→Lendário |
| Sistema de merge | INV-2 | ⏳ Todo | — | 3× mesmo item = próxima raridade |
| Inventário | INV-3 | ⏳ Todo | — | UI de inventário e equipamentos |
| Baús de recompensa | INV-4 | ⏳ Todo | — | Drop por fase completa e boss |

---

## Fase 4: Auth + Database

| Feature | Código | Status | PR | Descrição |
|---------|--------|--------|-----|-----------|
| Firebase Anonymous Auth | AUTH-1 | ⏳ Todo | — | Login anônimo, sem fricção |
| Firebase Firestore | DB-1 | ⏳ Todo | — | Player data offline-first + sync |
| Supabase setup | DB-2 | ⏳ Todo | — | Postgres para conteúdo do jogo e admin |
| Sync offline→online | DB-3 | ⏳ Todo | — | Reconciliação de dados ao reconectar |
| Conteúdo do jogo via Supabase | DB-4 | ⏳ Todo | — | Planetas, fases, waves via API (sem build nova) |

---

## Fase 5: Monetização + Loja

| Feature | Código | Status | PR | Descrição |
|---------|--------|--------|-----|-----------|
| Sistema de energia | MON-1 | ⏳ Todo | — | Barra de energia, recarga passiva |
| AdMob rewarded | MON-2 | ⏳ Todo | — | Reviver, energia, diamantes (máx 10 ads/dia) |
| RevenueCat IAP | MON-3 | ⏳ Todo | — | Pacotes de diamantes |
| Tela inicial + nav bar | NAV-1 | ⏳ Todo | — | 3 botões: Loja / Jogar / Player |
| Loja in-game | SHOP-1 | ⏳ Todo | — | Cosméticos, diamantes, pacotes |
| Menu do player | NAV-2 | ⏳ Todo | — | Skin, equipamentos, upgrades |

---

## Fase 6: Analytics + Admin

| Feature | Código | Status | PR | Descrição |
|---------|--------|--------|-----|-----------|
| Firebase Analytics | ANA-1 | ⏳ Todo | — | Eventos: level, boss, card, equipment |
| Admin dashboard | CAL-3 | ⏳ Todo | — | Painel Supabase + calibrador integrado |
| Gold por fase configurável | CAL-4 | ⏳ Todo | — | Slider de gold reward no editor |

---

## Fase 7: Modos Extras

| Feature | Código | Status | PR | Descrição |
|---------|--------|--------|-----|-----------|
| Missões Especiais/Bônus | BONUS-1 | ⏳ Todo | — | Modo clássico Space Invaders para farm de gold/diamantes |
| Survival Mode | SURV-1 | ⏳ Todo | — | Geração procedural, dificuldade adaptativa |

---

## Backlog

| Item | Código | Notas |
|------|--------|-------|
| Google login | AUTH-2 | Firebase Social Auth, vincula conta anônima |
| Slots 3–4 (Reator + Escudo) | INV-5 | Expansão de equipamentos |
| Slots 5–6 (Drone + Módulo) | INV-6 | Expansão de equipamentos |
| Leaderboard online | PLANET-3 | Requires backend |
| SimulationCalibratorStrategy | ENGINE-1 | v2 calibration |
| TelemetryCalibratorStrategy | ENGINE-2 | v3 calibration |
| Segundo planeta | PLANET-4 | Assets + dados no Supabase, sem build |

---

## Legend

| Icon | Meaning |
|------|---------|
| ⏳ Todo | Not started |
| 🚧 In Progress | In development (PR #N) |
| ✅ Done | Merged (PR #N) |
| 🔴 Blocked | Blocked — reason |
