# Space Invaders Mobile — Design Spec v2

**Data:** 2026-04-27
**Status:** Em revisão — gaps sinalizados com ❓
**Substitui:** `2026-04-18-space-invaders-design.md`
**Referência externa:** Archero (Habby) — domain design extraído em 2026-04-27

---

## Contexto

Remake de um clone de Space Invaders originalmente desenvolvido em Unity (C#). O projeto evoluiu de um remake fiel para um **jogo de ação roguelite espacial** inspirado em Archero, com progressão permanente, sistema de equipamentos, cartas mid-run e múltiplos modos de jogo.

O problema original (calibração manual de dificuldade) é resolvido pelo Level Engine com calibração automática e editor visual. O novo escopo adiciona uma camada de progressão meta-game completa.

---

## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Mobile | Expo ~54 + react-native-skia | Performance nativa via GPU, TypeScript |
| Level Engine | TypeScript puro | Zero dependências nativas, testável com Jest |
| Calibrador / Admin | Next.js 14 + Canvas HTML5 | Dev tool web + painel admin |
| Banco do player | Firebase Firestore | Offline-first, sync automático, mobile-native |
| Banco de conteúdo/admin | Supabase (Postgres) | Planetas, fases, waves editáveis via painel web sem build |
| Auth | Firebase Anonymous Auth | Joga sem fricção; Google login no backlog |
| Monetização | AdMob (rewarded ads) + RevenueCat (IAP) |
| Analytics | Firebase Analytics |
| OTA Updates | EAS Update | Publica assets e configs sem store review |
| Build | EAS Build | Cloud iOS/Android |

**Plataformas:** Android (foco inicial), iOS (após validação).

### Divisão de responsabilidades dos bancos

| Dado | Banco |
|------|-------|
| Progresso, inventário, currencies, upgrades permanentes | Firebase Firestore (offline-first) |
| Conteúdo do jogo: planetas, fases, waves, cartas, parâmetros | Supabase (Postgres) |
| Players, métricas agregadas, ferramentas de ban/admin | Supabase (Postgres) |
| Eventos de gameplay | Firebase Analytics |

**Fluxo offline:**
- Game baixa conteúdo do Supabase ao abrir → cacheia local
- Progresso salvo localmente → sincroniza com Firestore ao reconectar
- Loja: requer internet (IAP não funciona offline)
- Ads: usa cache AdMob se disponível; sem cache → 1 revive grátis registrado localmente

---

## Arquitetura — Princípios

### Renderização dual

```typescript
interface IRenderer {
  drawRect(x, y, w, h, color): void
  drawSprite(sprite, x, y): void
  clear(): void
  // ❓ GAP: precisamos de drawScrollingBackground(layers) para parallax?
}

class SkiaRenderer implements IRenderer { /* mobile */ }
class CanvasRenderer implements IRenderer { /* calibrador/browser */ }
```

### Registry pattern

O Level Engine não conhece "Space Invaders" — conhece tipos de entidade registrados. Reutilizável em futuros jogos 2D.

### Pluggable calibration

A estratégia de calibração é injetada — o jogo não muda para trocar de algoritmo.

---

## Modos de Jogo

### 1. Contratos (modo principal)

Narrativa: **A Ordem** convoca a nave do jogador para destruir invasores em planetas diferentes.

Estrutura de progressão:
```
Planeta
 ├── Fase 1–10 (10 fases por planeta)
 │    └── Level 1–10 (10 levels por fase)
 │
 ├── Fase 5, Level 10  → 1 Boss (80% dificuldade)
 ├── Fase 10, Level 5  → 1 Boss (100% dificuldade)
 └── Fase 10, Level 10 → 2 Bosses simultâneos (80% cada)
```

- 100 levels por planeta
- Cada planeta tem tema visual próprio (parallax backdrop diferente)
- Completar planeta → desbloqueia próximo planeta

> ❓ **GAP 1:** Quantos planetas no jogo no total? É um número fixo ou expansível via OTA?

> ❓ **GAP 2:** Como a narrativa de "A Ordem" se manifesta no jogo? Tela de texto entre planetas? Cutscene? Apenas temática visual?

> ❓ **GAP 3:** O jogador pode repetir planetas já completos? Com que objetivo (farm de gold/baús)?

> ❓ **GAP 4:** Ao morrer no level 7 da fase 3, o jogador recomeça do level 1 da fase 3, ou do último checkpoint? Qual é o checkpoint — início de fase ou início de level?

### 2. Missões Especiais / Bônus

Modo clássico Space Invaders (grid, movimento horizontal). Reaproveitamento do que já foi implementado.

- Objetivo: farm de gold e diamantes
- Estrutura: missões pontuais, não progressão contínua
- Sempre disponível na tela inicial

> ❓ **GAP 5:** Missões Especiais têm rotação (novas missões por dia/semana) ou são fixas?

> ❓ **GAP 6:** As recompensas de Missões Especiais são maiores, menores ou iguais às de Contratos?

### 3. Survival Mode

Modo infinito com geração procedural. Arquitetura a definir em sprint separado.

> ❓ **GAP 7:** Survival Mode usa a mesma estrutura de planetas ou é completamente avulso (score infinito)?

> ❓ **GAP 8:** No Survival, o sistema de cartas também aparece a cada level?

---

## Gameplay — Contratos

### Visão geral de um level

```
Entrar no level
  → Parallax scrolling ativo (nave avança pelo espaço)
  → Inimigos entram por padrão pré-definido (top → down)
  → Player se move livremente em 2D via joystick
  → Asteroids aparecem (destruíveis, dropam HP/combustível)
  → Todos inimigos mortos OU timer esgotado → level concluído
  → Tela de cartas (escolher 1 de 3)
  → Próximo level
```

### Parallax

- Fundo em múltiplas camadas scrollando em velocidades diferentes (ilusão de profundidade)
- Cada fase tem um backdrop temático diferente
- Loop: ao terminar todos os inimigos, a câmera avança para o próximo layout de parallax

> ❓ **GAP 9:** Quantas camadas de parallax? (ex: fundo estelar lento + nebulosa média + asteroids rápidos)

> ❓ **GAP 10:** O parallax muda visualmente entre fases do mesmo planeta ou só entre planetas?

### Movimento do jogador

- Joystick flutuante (aparece onde o dedo toca)
- Movimento **2D livre** (X e Y)
- Tiro **automático** enquanto o dedo está na tela
- Velocidade base aumentada em relação ao Story Mode clássico

> ❓ **GAP 11:** O tiro automático continua mesmo ao mover, ou o player para de atirar enquanto se move (estilo Archero: move OU atira)?

### Timer de wave

- Cada level tem um timer
- Timer esgota → level encerra independente de inimigos vivos

> ❓ **GAP 12:** Qual o timer padrão por level? É configurável no calibrador por fase?

> ❓ **GAP 13:** Inimigos que sobrevivem ao timer desaparecem, ou o level falha se não matar todos?

---

## Sistema de HP

- Barra de HP contínua (não 3 vidas discretas)
- HP base configurável via upgrades permanentes
- Dano recebido reduz a barra
- HP = 0 → morte → tela de game over

**Fontes de recuperação de HP:**
- Drops de inimigos (chance aleatória)
- Drops de asteroids destruídos
- Carta de cura (level 5 de cada fase)
- Carta Vampiro (kills recuperam X% de HP)

> ❓ **GAP 14:** Qual o HP base inicial (sem nenhum upgrade)?

> ❓ **GAP 15:** Qual % de HP recupera um drop de vida de inimigo/asteroid?

---

## Sistema de Combustível

O tanque de combustível representa a durabilidade da nave ao longo dos levels de uma fase.

- **Draining:** o tanque drena progressivamente a cada level
- **Coleta mid-fase:** combustível dropa em asteroids/inimigos a partir do **level 5**
- **Coleta = recarrega o tanque completo**
- Tanque vazio → game over por combustível

**Balanceamento base (sem upgrades):**

| Level | Status do tanque (sem coletar) |
|-------|-------------------------------|
| 1–4   | Normal |
| 5–8   | Drenando |
| 9     | Esgota — game over se não coletou |

**Upgrade de Tanque (10 níveis):**
- Níveis 1–3: chega no level 9 com margem mínima
- Níveis 4–6: aguenta até level 10 sem coletar
- Níveis 7–10: aguenta fase completa + reserva para a próxima

A mecânica de coleta continua relevante mesmo no upgrade máximo — recarregar entra na fase seguinte com reserva.

> ❓ **GAP 16:** O combustível persiste entre fases do mesmo planeta ou reseta a cada fase?

> ❓ **GAP 17:** Existe indicador visual do nível do tanque no HUD? Como ele aparece?

---

## Sistema de Inimigos

### Tipos base (MVP)

| Tipo | Comportamento | Boss correspondente |
|------|---------------|---------------------|
| Padrão | Velocidade e dano médios, tiro reto | Boss Padrão |
| Rápido | Alta velocidade, baixo HP, tiro em rajada | Boss Rápido |
| Forte | Baixa velocidade, alto HP (multi-hit), tiro pesado | Boss Forte |

**Regra:** todo novo tipo de inimigo adicionado no futuro gera automaticamente um boss correspondente com comportamento amplificado.

### Asteroids

- Entram pelo topo, movem-se para baixo
- Destruíveis por tiros do jogador
- Drops:
  - Chance de HP (1 por level, aparece em qualquer level)
  - Chance de combustível (a partir do level 5 da fase)

> ❓ **GAP 18:** Qual a frequência/quantidade de asteroids por level? É fixo ou varia por fase/planeta?

> ❓ **GAP 19:** Asteroids também atiram ou causam dano por colisão, ou são apenas obstáculos destrutíveis?

### Padrões de spawn (wave patterns)

- Pré-definidos no calibrador por level (não aleatórios em Contratos)
- Inimigos entram pelo topo em formações

> ❓ **GAP 20:** Quais padrões de spawn queremos para o MVP? (ex: linha horizontal, V, flancos, espiral)

---

## Sistema de Bosses

### Estrutura por planeta

```
Fase 5,  Level 10 → 1 Boss  @ 80% dificuldade
Fase 10, Level 5  → 1 Boss  @ 100% dificuldade
Fase 10, Level 10 → 2 Bosses simultâneos @ 80% cada
```

- Cada planeta escolhe qual tipo de boss spawna (Padrão / Rápido / Forte)
- O `difficultyScore` (0–100) do boss é configurável no calibrador por planeta
- Bosses têm fases de comportamento conforme HP cai

> ❓ **GAP 21:** Os 2 bosses no level 10 da fase 10 são do mesmo tipo ou podem ser tipos diferentes?

> ❓ **GAP 22:** Bosses têm fases de raiva (enrage) a partir de certo % de HP? A partir de quanto?

> ❓ **GAP 23:** Boss derrota → dropa baú automaticamente ou apenas ao completar a fase?

---

## Sistema de Cartas

Ao final de **todo level** → tela pausa → 3 cartas aleatórias → jogador escolhe 1.

**Level 5 de cada fase (especial):**
- Sempre inclui pelo menos uma opção de vida:
  - Restaurar X% do HP atual
  - Aumentar HP máximo permanentemente (para essa run)
- As outras opções refletem o build atual do player

**Acumulação:** cartas se acumulam durante a run (roguelite). Ao morrer, todas as cartas são perdidas.

### Categorias de cartas (sugeridas)

| Categoria | Exemplos |
|-----------|---------|
| Tiro | Disparo duplo, tiro traseiro, balas ricocheteantes, míssil teleguiado |
| Velocidade | +20% velocidade do player, bala mais rápida |
| Defesa | Escudo temporário, invencibilidade maior pós-dano |
| Especial | Bomba que limpa tela, raio que atravessa inimigos |
| Passivo | Vampiro (kills recuperam HP), kills geram gold extra |
| Vida | Restaurar HP, aumentar HP máximo |

**Carta Vampiro:** ao matar um inimigo, recupera X% de HP. Incentiva estilo agressivo.

> ❓ **GAP 24:** Quantas cartas no pool total para o MVP? (número mínimo para a variedade ser interessante)

> ❓ **GAP 25:** Uma carta pode aparecer mais de uma vez (upgraded) ou só aparece uma vez por run?

> ❓ **GAP 26:** Existe raridade nas cartas (comum, rara, épica) ou todas têm o mesmo peso no pool?

> ❓ **GAP 27:** Cartas do mesmo tipo se acumulam (ex: 2x Vampiro = 2x recuperação) ou são únicas?

---

## Sistema de Equipamentos

MVP: **2 slots** (Canhão + Casco). Expansão de 2 em 2 slots até 6.

### Raridades

```
Comum → Incomum → Raro → Épico → Lendário
```

**Merge:** 3 itens da mesma raridade e tipo → 1 item da próxima raridade.

**Habilidades:** desbloqueadas conforme a raridade aumenta:
```
Comum    → item base, sem habilidade especial
Incomum  → habilidade desbloqueada (% baixa)
Raro     → habilidade melhorada (% maior)
Épico    → segunda habilidade ou efeito visual
Lendário → habilidade máxima + efeito visual especial
```

### Slot 1 — Canhão (arma)

| Item | Comportamento base |
|------|--------------------|
| Canhão | Tiro único, alto dano, cadência baixa |
| Laser | Contínuo, dano médio, atravessa inimigos |
| Metralhadora | Rajada rápida, baixo dano por bala, muitas balas |

> ❓ **GAP 28:** Qual a habilidade especial de cada arma ao atingir raridade Incomum/Raro/Épico/Lendário?

### Slot 2 — Casco (armadura)

| Item | Habilidade por raridade |
|------|------------------------|
| Casco Leve | % de chance de esquiva completa do dano |
| Casco Pesado | % de chance de não tomar dano ao colidir com inimigo |

> ❓ **GAP 29:** Slots 3 e 4 — quais são? (sugestão: Reator + Escudo) Confirmar antes de implementar.

> ❓ **GAP 30:** Os equipamentos equipados persistem entre runs ou são apenas meta (equipa antes de entrar)?

### Obtenção de equipamentos

- **Baú de fase:** 1 baú garantido ao completar uma fase inteira
- **Raridade do drop:** proporcional à dificuldade da fase
- **Baús de boss:** boss derrotado → baú com chance de drop raro+

> ❓ **GAP 31:** Qual a tabela de drop rates por raridade? (ex: Comum 60%, Incomum 25%, Raro 10%, Épico 4%, Lendário 1%)

---

## Upgrades Permanentes (Hangar)

8 upgrades, 10 níveis cada. Comprados com **gold**. Persistem entre todas as runs.

| Upgrade | Efeito por nível |
|---------|-----------------|
| HP Máximo | +X de HP base |
| Velocidade | +X% velocidade do player |
| Dano Base | +X% dano de todos os tiros |
| Velocidade de Tiro | +X% cadência de fogo |
| Tanque de Combustível | +X% capacidade (ver balanceamento acima) |
| Duração de Powerups | +X% tempo de cartas ativas |
| Chance de Crítico | +X% por nível |
| Esquiva Base | +X% chance de esquivar |

**Progressão de custo:** custo em gold aumenta por nível (curva a definir no calibrador).

> ❓ **GAP 32:** Qual o custo base e a curva de progressão de custo por nível de upgrade? (ex: nível 1 = 100 gold, nível 2 = 200 gold, etc. — linear ou exponencial?)

> ❓ **GAP 33:** Os upgrades são desbloqueados gradualmente (ex: Crítico só aparece após comprar X outros) ou todos disponíveis desde o início?

---

## Sistema de Economia

### Gold (Moedas)

- **Fase completa:** gold fixo configurável no calibrador por fase
- **Morte mid-fase:** gold proporcional ao level em que morreu
- **Gasto em:** upgrades permanentes no hangar, merge de equipamentos

> ❓ **GAP 34:** Qual o range de gold por fase? (ex: Planeta 1 fase 1 = 50 gold, fase 10 = 500 gold)

### Diamantes

| Fonte | Quantidade |
|-------|-----------|
| Baús (drop) | Pequena quantidade |
| Loja (IAP) | Pacotes a definir |
| Ads rewarded | X diamantes por ad |

**Gasto em:**
- Reviver após morte (em vez de ad)
- Recarregar energia
- Futuras compras premium

> ❓ **GAP 35:** Quantos diamantes valem cada ação (reviver, recarregar energia)?

> ❓ **GAP 36:** Quais são os pacotes de diamantes na loja (IAP)? Preços?

### Energia

- Controla o número de runs por sessão
- Recarrega passivamente ao longo do dia
- 1 ad rewarded = energia suficiente para 1 run completa

> ❓ **GAP 37:** Capacidade máxima de energia? Quanto tempo para recarregar completamente?

> ❓ **GAP 38:** Custo de energia por run: fixo ou varia por planeta/dificuldade?

### Ads Rewarded (máx 10/dia)

Contador único compartilhado entre todos os tipos de ad:

| Tipo | Recompensa |
|------|-----------|
| Reviver | Revive com 50% HP |
| Energia | 1 run completa de energia |
| Diamantes | X diamantes |

> ❓ **GAP 39:** O limite de 10 ads/dia reseta à meia-noite (horário local) ou UTC?

> ❓ **GAP 40:** Quantas vezes o jogador pode reviver por run? Apenas 1 vez ou múltiplas (consumindo ads/diamantes)?

### Revive

- Morte → tela de game over → opção de reviver
- Ad rewarded: revive com 50% HP
- Diamantes: revive com 50% HP (custo: X diamantes)

---

## Loja In-Game

Tela acessível pelo botão esquerdo da nav bar.

**Seções:**
- Pacotes de diamantes (IAP via RevenueCat)
- Skins de nave
- Skins de inimigos
- Pacotes bundle

> ❓ **GAP 41:** A loja vende itens de equipamento diretamente (pay-to-win) ou apenas cosméticos + diamantes?

---

## Tela Inicial — Navegação

Nav bar inferior com 3 botões:

| Posição | Botão | Destino |
|---------|-------|---------|
| Esquerda | Loja | Loja In-Game |
| Centro | Jogar | Seleção de modo (Contratos / Missões Especiais) |
| Direita | Player | Menu do player |

### Menu do Player

- Troca de skin/nave
- Troca de equipamentos (Canhão, Casco, slots futuros)
- Upgrades permanentes (Hangar)
- Estatísticas do jogador

> ❓ **GAP 42:** O menu do player mostra inventário completo de equipamentos coletados?

---

## Level Engine (atualizado)

### LevelRequest

```typescript
interface LevelRequest {
  mode: 'contratos' | 'survival' | 'bonus'
  // Contratos
  planetIndex?: number
  phaseIndex?: number       // 0–9
  levelIndex?: number       // 0–9
  // Survival
  playerStats?: PlayerStats
  currentScore?: number
}
```

### LevelDefinition (adições)

```typescript
interface LevelDefinition {
  id: string
  style: 'classic' | 'freeRoam' | 'mixed'
  difficultyScore: number
  entities: EntityPlacement[]
  params: LevelParams
  // Novos
  wavePattern?: WavePattern   // padrão de spawn dos inimigos
  goldReward?: number          // gold ao completar (configurável no calibrador)
  bossConfig?: BossConfig      // presente apenas em levels de boss
  parallaxTheme?: string       // backdrop visual da fase
}

interface BossConfig {
  bossType: 'standard' | 'fast' | 'strong'
  difficultyPercent: number    // 0–100, calibrável por planeta
  count: number                // 1 ou 2
}
```

---

## Calibrador (atualizado)

Novos controles além dos existentes:

- **Gold por fase:** slider configurável por fase (valor base + multiplicador por planeta)
- **Boss difficulty %:** controle por planeta para fase 5 e fase 10
- **Wave pattern:** seleção do padrão de spawn por level
- **Parallax theme:** seleção do backdrop por fase

---

## Analytics

Firebase Analytics — eventos principais:

| Evento | Dados |
|--------|-------|
| `level_start` | planet, phase, level |
| `level_complete` | planet, phase, level, time, cards_picked |
| `level_fail` | planet, phase, level, hp_remaining, cause |
| `boss_defeated` | boss_type, difficulty_percent, planet |
| `card_picked` | card_type, level_index |
| `equipment_merged` | item_type, new_rarity |
| `ad_watched` | ad_type, daily_count |

---

## Monetização

| Modelo | Implementação |
|--------|---------------|
| Ads rewarded | AdMob — reviver, energia, diamantes (máx 10/dia) |
| IAP diamantes | RevenueCat — pacotes de diamantes |
| IAP skins | RevenueCat — naves, efeitos de tiro |

`FreeMonetization` em dev e testes. `NullAnalytics` em dev e testes.

---

## Feature Registry — Domínios e Códigos

Padrão de commit e PR:
```
[SCOPE] type(DOMAIN-N): descrição curta
```

Exemplos:
```
[GAME] feat(GL-1): add parallax scrolling system
[GAME] feat(CARD-2): add card selection screen
[CAL]  feat(BOSS-1): add boss difficulty controls
[GAME] feat(META-3): add permanent upgrade hangar screen
```

### Domínios

| Código | Domínio | Descrição |
|--------|---------|-----------|
| **GL** | Game Loop | Core gameplay, movimento, tiro, colisão, física |
| **PARA** | Parallax | Sistema de scrolling e backgrounds |
| **ENEMY** | Enemies | Tipos de inimigos, comportamentos, spawn |
| **BOSS** | Boss | Sistema de bosses, fases, enrage |
| **CARD** | Cards | Sistema de cartas roguelite |
| **FUEL** | Fuel | Sistema de combustível |
| **HP** | Health | Sistema de HP, drops de vida |
| **META** | Meta | Upgrades permanentes, hangar |
| **INV** | Inventory | Equipamentos, inventário, merge |
| **SHOP** | Shop | Loja in-game, IAP |
| **AUTH** | Auth | Autenticação (anônima, Google) |
| **DB** | Database | Firebase Firestore, Supabase, sync offline |
| **PLANET** | Planet | Estrutura planeta/fase/level, progressão |
| **HUD** | HUD | Interface in-game, indicadores |
| **NAV** | Navigation | Tela inicial, nav bar, menus |
| **MON** | Monetization | AdMob, RevenueCat, ads, energia |
| **CAL** | Calibrator | Editor de levels, waves, planetas |
| **BONUS** | Bonus | Missões Especiais (modo clássico) |
| **SURV** | Survival | Modo Survival (sprint separado) |
| **ANA** | Analytics | Firebase Analytics, eventos |

---

## Fora do Escopo (MVP)

- Leaderboard online
- Multiplayer
- TelemetryCalibratorStrategy (v3)
- Slots de equipamento 3–6 (Reator, Escudo, Drone, Módulo)
- Survival Mode (sprint separado)
- SimulationCalibratorStrategy (v2)
- Animações de cutscene entre planetas

---

## Gaps em Aberto

| # | Pergunta | Impacto |
|---|----------|---------|
| 2 | Narrativa de A Ordem: como se manifesta? (tela de texto, cutscene, só visual?) | UI/UX |
| 3 | Player pode repetir planetas já completos? Com que objetivo? | Game loop |
| 5 | Missões Especiais: rotativa (novas por dia/semana) ou fixa? | Content pipeline |
| 6 | Recompensas Missões Especiais vs Contratos: maiores, menores ou iguais? | Balanceamento |
| 7 | Survival: estrutura própria ou score infinito? | Arquitetura |
| 8 | Survival tem sistema de cartas também? | Arquitetura |
| 9 | Quantas camadas de parallax? (ex: fundo estelar + nebulosa + asteroids) | Renderização |
| 10 | Parallax muda entre fases ou só entre planetas? | Assets |
| 17 | Indicador visual do tanque de combustível no HUD? Como aparece? | UI |
| 18 | Frequência de asteroids por level: fixo ou varia por fase/planeta? | Level design |
| 19 | Asteroids causam dano por colisão, ou são apenas obstáculos destrutíveis? | Mecânica |
| 21 | 2 bosses na fase 10 level 10: mesmo tipo ou podem ser tipos diferentes? | Boss design |
| 22 | Bosses têm enrage? A partir de qual % de HP? | Boss design |
| 23 | Boss dropa baú ao morrer ou apenas ao completar a fase? | Economy |
| 25 | Carta pode aparecer uma segunda vez (upgraded) ou é única por run? | Roguelite design |
| 26 | Existe raridade nas cartas? | Roguelite design |
| 27 | Cartas do mesmo tipo se acumulam (stack)? | Roguelite design |
| 28 | Habilidades especiais das armas por raridade (Incomum → Lendário)? | Equipment design |
| 29 | Slots 3 e 4: Reator + Escudo? Confirmar antes de implementar | Equipment design |
| 30 | Equipamentos: escolhidos antes da run ou equipados automaticamente? | Meta design |
| 31 | Tabela de drop rates por raridade? (ex: Comum 60%, Incomum 25%, Raro 10%...) | Economy |
| 32 | Custo base e curva dos upgrades permanentes? (linear ou exponencial?) | Economy |
| 33 | Upgrades permanentes: todos disponíveis desde o início ou desbloqueiam gradualmente? | UX |
| 34 | Range de gold por fase por planeta? | Economy |
| 35 | Custo em diamantes de cada ação (reviver, energia)? | Economy |
| 36 | Pacotes IAP de diamantes e preços? | Monetização |
| 37 | Capacidade máxima de energia e tempo de recarga total? | Session design |
| 38 | Custo de energia por run: fixo ou varia por planeta/dificuldade? | Session design |
| 39 | Reset dos 10 ads/dia: meia-noite horário local ou UTC? | Monetização |
| 40 | Número máximo de revives por run: 1 ou múltiplos? | Game loop |
| 41 | Loja vende equipamentos diretamente (pay-to-win) ou apenas cosméticos + diamantes? | Monetização |
| 42 | Menu do player exibe inventário completo de equipamentos coletados? | UI |

## Fechados

| # | Decisão |
|---|---------|
| 1 | 1 planeta no MVP. Novo planeta = inserir no Supabase, sem build. Cada planeta tem nome, ecosistema e hub art |
| 4 | Checkpoint = level exato onde o player morreu |
| 11 | Tiro automático mesmo ao mover |
| 16 | Combustível reseta cheio ao iniciar cada fase |
| 20 | Padrões pré-definidos (diamante, triângulo, etc.) + editor visual no calibrador. Cada level tem lista de waves; todas devem ser limpas para avançar. Templates reutilizáveis |
| 24 | 14 cartas no deck MVP do Planeta 1. Deck é por planeta, configurável no calibrador |
| Auth | Firebase Anonymous Auth no MVP; Google login no backlog |
| DB | Firebase Firestore (player data) + Supabase Postgres (conteúdo/admin) |
| 12 | Sem timer. Level avança somente quando todos os inimigos forem mortos |
| 13 | Player morre → level pausa → tela de revive. Timer removido do design |
| 14 | HP base inicial = 500 |
| 15 | Drop de vida restaura 20% do HP máximo |
