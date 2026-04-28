# Space Invaders Mobile — Design Spec v2

**Data:** 2026-04-27
**Status:** ✅ Design fechado
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
  drawScrollingBackground(layers: ParallaxLayer[]): void  // necessário para parallax
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
- **MVP:** 1 planeta. Novos planetas adicionados via Supabase, sem build
- **Narrativa:** tela de texto simples entre planetas ("A Ordem convoca você para..."). Cutscene animada no backlog
- **Checkpoint:** level exato onde o player morreu (recomeça o level, não a fase)

### 2. Missões Especiais / Bônus

Modo clássico Space Invaders (grid, movimento horizontal). Reaproveitamento do que já foi implementado.

- Objetivo: farm de gold e baús
- Sempre disponível na tela inicial

**Estrutura de missões:**

| Tipo | Rotação | Recompensa |
|------|---------|-----------|
| Diárias | Pool fixo de missões, rotaciona diariamente | Gold |
| Semanais | Pool fixo de missões, rotaciona semanalmente | Baú ao completar **todas** as semanais da semana |

- Missões diárias e semanais são independentes entre si
- Completar todas as missões semanais da semana → 1 baú garantido
- Pool de missões configurável no Supabase (sem build nova para adicionar missões)

### 3. Survival Mode

> **Backlog — sem spec agora.** Design intent registrado:
> - Geração procedural de fases
> - Sem pausa entre fases — transição contínua (seamless)
> - Reutiliza layouts de fases do modo Contratos encadeando uma na outra
> - Spec completo a definir em sprint separado

---

## Gameplay — Contratos

### Visão geral de um level

```
Entrar no level
  → Parallax scrolling ativo (nave avança pelo espaço)
  → Inimigos entram por padrão pré-definido (top → down)
  → Player se move livremente em 2D via joystick
  → Kills → XP → barra de XP sobe
  → Level-up → pausa → tela de 3 cartas → escolhe 1 → continua
  → Asteroids aparecem (destruíveis, dropam HP/combustível)
  → Todos inimigos mortos → level concluído
  → Próximo level (Level 10 = boss: sem tela de cartas ao matar o boss — fase encerra)
```

### Parallax e Terrain Scrolling

O jogo usa **terrain scrolling** — os obstáculos fazem parte do scroll junto com o fundo. A nave "voa por dentro" do mapa vertical.

**Camadas:**
- Configurável por planeta no editor (simples → complexo)
- Cada planeta pode ter N camadas de parallax em velocidades diferentes
- Exemplos: fundo estelar lento, nebulosa média, debris rápidos

**Terrain design (editado no calibrador):**
```
Editor = mapa vertical scrollável por fase
 ├── Espaço aberto (sem obstáculos)
 ├── Campo de asteroids (obstáculos destrutíveis espalhados)
 ├── Tunel/passagem estreita (paredes laterais, alta tensão)
 └── Boss arena (parallax PAUSA aqui)
```

**Boss level — comportamento especial:**
- Ao entrar no level de boss → parallax pausa → arena estática
- Boss morreu → parallax retoma → avança para próximo level
- Sinal visual claro de início e fim do boss fight

**Colisão com terrain:**
- Asteroids destrutíveis: tiro → explode → chance de dropar HP/fuel
- Paredes de tunel / terrain fixo: colisão = dano ao player
- Sem punição = sem tensão nos tuneis

### Movimento do jogador

- Joystick flutuante (aparece onde o dedo toca)
- Movimento **2D livre** (X e Y)
- Tiro **automático** enquanto o dedo está na tela
- Velocidade base aumentada em relação ao Story Mode clássico

- Tiro automático **continua mesmo ao mover** (diferente do Archero)

### Condição de conclusão de level

- **Sem timer.** Level encerra somente quando todos os inimigos forem mortos
- Player morre → level pausa → tela de revive (1 revive por run: ad ou 50 diamantes)

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

- **HP base:** 500 (sem upgrades)
- **Drop de vida:** restaura 20% do HP máximo atual

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

- **Combustível reseta cheio** ao iniciar cada fase

**HUD — 3 barras horizontais (canto superior esquerdo):**

```
[ HP   ████████░░ 380  ]
[ FUEL ██████░░░░ 62%  ]
[ XP   ████░░░░░░ 240  ]  ← mais fina que as outras duas
```

- Barra de HP: substitui os corações — valor inteiro atual (ex: 380)
- Barra de Combustível: valor inteiro percentual (ex: 62)
- Barra de XP: mais fina visualmente — valor inteiro de XP atual (ex: 240)
- Todas no canto superior esquerdo, empilhadas
- Score no canto superior direito (mantido)
- **A definir em teste:** avaliar se HP fica melhor no topo ou flutuando acima do player

Configurações do jogo: música (on/off/volume) e efeitos sonoros (on/off/volume)

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

- Frequência configurável no editor por level (parte do terrain system)
- Colisão com asteroid = dano ao player. Asteroids destrutíveis — não atiram

### Padrões de spawn (wave patterns)

- Pré-definidos no calibrador por level (não aleatórios em Contratos)
- Inimigos entram pelo topo em formações

- Padrões pré-definidos (diamante, triângulo, linha, V, flancos) + editor visual no calibrador. Templates reutilizáveis

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
- 2 bosses na fase 10 level 10: mesmo tipo por padrão, configurável no calibrador
- **Enrage (backlog):** campo `enrageThreshold?: number` reservado no `BossConfig`. Target: 50% HP


---

## Sistema de XP e Level-up

- Cada kill de inimigo concede XP (quantidade configurável por tipo de inimigo e por planeta)
- Inimigos mais fortes = mais XP
- Barra de XP sobe visivelmente na HUD
- **Level-up** → pausa automática → tela de 3 cartas → jogador escolhe 1 → continua
- XP **reseta para 0** ao iniciar cada fase

**Escala de cartas por planeta** (calibrável no editor):

| Planeta | Cartas/fase (aprox.) | Método |
|---------|---------------------|--------|
| 1 | ~9–10 | ~1 level-up por level da fase |
| 2 | ~11–12 | +2 vs planeta anterior |
| 3 | ~13–14 | +2 vs planeta anterior |
| N | N anterior + 2 | Builds ficam mais fortes nos planetas difíceis |

- Level 10 de cada fase = boss: **sem tela de cartas** ao matar o boss — a fase encerra
- Level-ups que ocorrem *durante* o boss fight (via kills de minions) ainda concedem cartas normalmente

---

## Sistema de Cartas

Cards são buffs temporários da run. Aparecem via **level-up** (XP de kills), não ao fim de cada level.

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

> ✅ **GAP 24:** 14 cartas no deck do Planeta 1. Deck é por planeta, configurável no calibrador.

**Pesos e probabilidades do deck:**

- Por padrão todas as cartas têm peso igual no deck
- Pesos configuráveis por fase e por planeta no calibrador (ex: forçar carta de vida aparecer mais no level 5)
- **Diminishing returns:** carta já equipada nessa run tem probabilidade reduzida de reaparecer no deck — evita combo duplo fácil, mas não impossível
- Configuração de peso fica no Supabase → ajustável sem build nova

**Acumulação de cartas (gap #27):** cartas do mesmo tipo se acumulam (2× Vampiro = 2× recuperação). A probabilidade reduzida de reaparecer é o balanceador natural.

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

> **Backlog:** habilidades especiais por raridade a definir no sprint de equipamentos

### Slot 2 — Casco (armadura)

| Item | Habilidade por raridade |
|------|------------------------|
| Casco Leve | % de chance de esquiva completa do dano |
| Casco Pesado | % de chance de não tomar dano ao colidir com inimigo |

> **Backlog:** Slots 3 e 4 (sugestão: Reator + Escudo) — confirmar antes de implementar


### Obtenção de equipamentos

- **Baú de fase:** 1 baú garantido ao completar uma fase inteira
- **Raridade do drop:** proporcional à dificuldade da fase
- **Baús de boss:** boss derrotado → baú com chance de drop raro+

**Drop rates por raridade:**

| Raridade | Chance |
|----------|--------|
| Comum | 64,9% |
| Incomum | 25% |
| Raro | 8% |
| Épico | 2% |
| Lendário | 0,1% |

---

## Upgrades Permanentes (Hangar)

8 upgrades, 10 níveis cada. Comprados com **gold**. Persistem entre todas as runs.

| # | Upgrade | Info | Efeito por nível |
|---|---------|------|-----------------|
| 1 | HP Máximo | Aumenta o HP base da nave | +X de HP base |
| 2 | Velocidade | Aumenta a velocidade de movimento | +X% velocidade do player |
| 3 | Dano Base | Aumenta o dano de todos os tiros | +X% dano de todos os tiros |
| 4 | Velocidade de Tiro | Aumenta a cadência de fogo | +X% cadência de fogo |
| 5 | Tanque de Combustível | Aumenta a capacidade do tanque | +X% capacidade |
| 6 | Inteligência | Aumenta o XP ganho por kill | +X% XP por inimigo morto |
| 7 | Chance de Crítico | Chance de causar dano crítico | +X% por nível |
| 8 | Esquiva Base | Chance de esquivar completamente do dano | +X% chance de esquivar |

**Progressão de custo (L1–5):** curva de dobro por nível — 200 → 400 → 800 → 1.600 → 3.200 por upgrade.
Total para maxar todos os 8 upgrades L1–5: **49.600 gold**.
L6–10: bloqueados, desbloqueados por planeta com curva +50% (a calibrar).

**Todos os 8 upgrades disponíveis desde o início** — sem bloqueio progressivo.

---

## Sistema de Economia

### Gold (Moedas)

**Regra de negócio — anti-farm:**
- **Primeira conclusão de uma fase:** recompensa cheia (gold principal)
- **Replay da mesma fase:** 20% do valor original — farming ineficiente por design
- **Drops de inimigos:** XP (não gold). Kills não geram gold diretamente
- **Morte mid-fase:** sem gold — apenas conclusão recompensa

**Por que:** sem essa regra, o player faz 5 levels e sai repetidamente para acumular gold sem progredir — bug de economia clássico de mobile game.

**Tabela de gold por fase (primeira conclusão):**

| Planeta | Fase 1 | Fase 10 | Média | Planet completo (1ª vez) |
|---------|--------|---------|-------|--------------------------|
| 1 | 50 | 300 | 175 | 1.750 |
| 2 | 100 | 600 | 350 | 3.500 |
| 3 | 200 | 1.200 | 700 | 7.000 |
| 4 | 400 | 2.400 | 1.400 | 14.000 |
| 5 | 800 | 3.000 | 1.900 | 19.000 |

Replay: 20% dos valores acima. Máximo por fase individual: ~3.000 gold (P5 fase 10 primeira conclusão).

**Progressão esperada (full play, primeiro clear de cada planeta):**

| Após planeta | Acumulado | Milestone de upgrade |
|-------------|-----------|---------------------|
| P1 | 1.750 | L1 em todos os upgrades |
| P2 | 5.250 | L1+L2 todos (4.800) ✓ |
| P3 | 12.250 | L1+L2+L3 todos (11.200) ✓ |
| P4 | 26.250 | L4 quase todos |
| P5 | 45.250 | L4 todos (24.000) ✓ |
| P6 | ~70k | L5 todos (49.600) ✓ |

- **Gasto em:** upgrades permanentes no hangar, merge de equipamentos

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


**Pacotes IAP de diamantes:**

| Pacote | Diamantes | Preço |
|--------|-----------|-------|
| Starter | 100 | R$ 4,99 |
| Popular | 500 | R$ 19,99 |
| Best Value | 1.200 | R$ 39,99 |
| Mega | 3.000 | R$ 89,99 |

### Energia

- Controla o número de runs por sessão
- Recarrega passivamente ao longo do dia
- 1 ad rewarded = energia suficiente para 1 run completa

**Balanceamento de energia:**

| Parâmetro | Valor |
|-----------|-------|
| Capacidade máxima | 150 |
| Custo por run | 10 (fixo, independente de planeta) |
| Runs com tank cheio | 15 runs |
| Recarga | 1 energia/minuto |
| Recarga completa | 2h30 |

### Ads Rewarded (máx 10/dia)

Contador único compartilhado entre todos os tipos de ad:

| Tipo | Recompensa |
|------|-----------|
| Reviver | Revive com 50% HP |
| Energia | 1 run completa de energia |
| Diamantes | X diamantes |



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

**Apenas cosméticos e diamantes** — sem venda direta de equipamentos (sem pay-to-win)

---

## Hangar — Menu do Player

Tela dividida com painel expansível (padrão "bottom sheet", estilo Instagram comments):

```
┌─────────────────────────┐
│   Nave com equipamentos  │  ← painel superior (character view)
│   slots visíveis         │
├─────────────────────────┤  ← divisor arrastável
│   Inventário completo    │  ← painel inferior (grid de itens)
│   (todos os baús)        │
└─────────────────────────┘
```

- Scroll **para cima** → painel de inventário expande, character view encolhe
- Scroll **para baixo** → character view expande, inventário encolhe
- Inventário exibe todos os equipamentos coletados (não apenas os equipados)
- Player toca em um item → equipa no slot correspondente

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
- Survival Mode — procedural, seamless entre fases, reutiliza layouts de Contratos (spec em sprint separado)
- SimulationCalibratorStrategy (v2)
- Animações de cutscene entre planetas

---

## Gaps em Aberto

| # | Pergunta | Impacto |
|---|----------|---------|
| 17 | HUD: 3 barras horizontais empilhadas no canto sup. esq. (HP, FUEL, XP fina). Todas com valor inteiro. Score sup. dir. Posição HP (topo vs acima do player) a validar em teste |
| 21 | 2 bosses na fase 10 level 10: mesmo tipo por padrão, mas configurável no calibrador por planeta |
| 22 | Boss enrage a 50% HP — backlog. BossConfig deve ter campo `enrageThreshold?: number` preparado mas não implementado |
| 23 | Boss morre → baú dropa imediatamente na tela (antes da tela de conclusão de fase) |
| 26/27 | Cartas: peso igual por padrão, configurável por fase/planeta. Carta já equipada tem peso reduzido (diminishing returns). Acumulam (2× Vampiro = 2× efeito) |
| 28 | Habilidades especiais das armas por raridade (Incomum → Lendário)? | Equipment design |
| 29 | Slots 3 e 4: Reator + Escudo? Confirmar antes de implementar | Equipment design |
| 30 | Equipamentos equipados no Hangar (menu do player), persistem entre runs. Ao iniciar run → carrega status atual do player com todos equipamentos e atributos |
| 35 | Reviver = 50 diamantes. Recarregar energia (1 run) = 30 diamantes |
| 36 | Pacotes IAP: 100/R$4,99 · 500/R$19,99 · 1.200/R$39,99 · 3.000/R$89,99 |
| 37/38 | Energia: max 150, custo 10/run (fixo), recarga 1/min, cheio em 2h30 |
| 39 | Reset dos 10 ads/dia: meia-noite horário local do dispositivo |
| 31 | Tabela de drop rates por raridade? (ex: Comum 60%, Incomum 25%, Raro 10%...) | Economy |
| 34 | (fechado — ver tabela de gold acima) | — |
| 35 | Custo em diamantes de cada ação (reviver, energia)? | Economy |
| 36 | Pacotes IAP de diamantes e preços? | Monetização |
| 37 | Capacidade máxima de energia e tempo de recarga total? | Session design |
| 38 | Custo de energia por run: fixo ou varia por planeta/dificuldade? | Session design |
| 39 | Reset dos 10 ads/dia: meia-noite horário local ou UTC? | Monetização |
| 40 | 1 revive por run: ad rewarded ou 50 diamantes |
| 41 | Loja vende equipamentos diretamente (pay-to-win) ou apenas cosméticos + diamantes? | Monetização |
| 42 | Hangar: tela dividida bottom-sheet (estilo Instagram). Scroll ↑ expande inventário, scroll ↓ expande character view. Inventário exibe todos os itens coletados |

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
| 9/10 | Parallax configurável por planeta (N camadas, simples → complexo) |
| 18 | Asteroids fazem parte do terrain system — frequência definida no editor por level |
| 19 | Colisão com terrain/asteroids = dano ao player. Asteroids destrutíveis dropam HP/fuel |
| Terrain | Sistema de terrain scrolling: mapa vertical editável. Boss level pausa o parallax durante a batalha |
| 25 | Carta pode reaparecer na mesma run (probabilidade reduzida, não proibida) |
| 32 | Custo L1–5 por upgrade: 200→400→800→1.600→3.200. L6–10 bloqueados, desbloqueados por planeta com curva +50% |
| 33 | Todos os 8 upgrades disponíveis desde o início |
| 34 | Gold por fase: P1 50–300, escala ~2× por planeta. Max ~3.000/fase (P5 fase 10). Ver tabela acima |
| XP | Kills → XP. Level-up → tela de cartas. XP reseta por fase. ~1 level-up por level da fase em P1, +2 cartas/fase por planeta adicional |
| Inteligência | Upgrade permanente #6: substitui "Duração de Powerups". Info: "Aumenta o XP ganho por kill" |
| 7/8 | Survival no backlog. Design intent: procedural, seamless entre fases, reutiliza layouts de Contratos |
| 2 | Narrativa de A Ordem: tela de texto simples entre planetas. Cutscene animada no backlog |
| 3 | Player pode repetir planetas/fases já completos livremente. Gold via replay = 20% (anti-farm natural). Objetivo: farm leve ou revisitar por diversão |
| 5/6 | Missões Especiais: pool fixo com rotação diária (recompensa: gold) e semanal (recompensa: baú ao completar todas). Pool configurável no Supabase |
