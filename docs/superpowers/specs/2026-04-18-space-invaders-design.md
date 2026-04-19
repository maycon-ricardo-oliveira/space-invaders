# Space Invaders Mobile — Design Spec

**Data:** 2026-04-18  
**Status:** Aprovado  
**Repositório de referência:** maycon-ricardo-oliveira/Space-Invaders-clone (Unity/C#)

---

## Contexto

Remake de um clone de Space Invaders originalmente desenvolvido em Unity (C#). O principal ponto de dor do projeto anterior foi a calibração manual de dificuldade por fase — 8 parâmetros por ScriptableObject, ajustados na mão. O objetivo deste remake é resolver isso com um sistema de geração automática de levels e um editor visual de mapas, além de migrar para uma stack mobile moderna sem engine pesada.

---

## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Mobile | Expo + react-native-skia | Performance nativa via GPU, iOS sem Mac via Expo Go, TypeScript |
| Calibrador | Next.js + Canvas HTML5 | Dev tool web, mesma lógica de jogo no browser |
| Level Engine | TypeScript puro | Zero dependências nativas, testável com Jest, reutilizável |
| OTA Updates | EAS Update (Expo) | Publica calibrações sem passar pela loja |
| Build iOS/Android | EAS Build | Build na nuvem, iOS sem Mac durante dev |

**Plataformas:** Android (foco inicial), iOS (após validação no Android).

---

## Estrutura do Monorepo

```
space-invaders/
├── packages/
│   ├── level-engine/              # TypeScript puro — zero deps nativas
│   │   ├── src/
│   │   │   ├── LevelEngine.ts
│   │   │   ├── strategies/
│   │   │   │   ├── CurveCalibratorStrategy.ts        # MVP
│   │   │   │   ├── SimulationCalibratorStrategy.ts   # v2
│   │   │   │   └── TelemetryCalibratorStrategy.ts    # v3
│   │   │   ├── registry/
│   │   │   │   └── EntityRegistry.ts                 # Registry pattern
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── monetization-plugin/       # Plugin reutilizável em outros jogos
│   │   ├── src/
│   │   │   ├── MonetizationPlugin.ts                 # interface abstrata
│   │   │   ├── StorePlugin.ts                        # loja + carrinho
│   │   │   ├── implementations/
│   │   │   │   ├── AdMobMonetization.ts              # ads rewarded
│   │   │   │   ├── RevenueCatMonetization.ts         # IAP (gemas)
│   │   │   │   └── FreeMonetization.ts               # dev mode, sem ads
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   └── analytics-plugin/          # Plugin reutilizável em outros jogos
│       ├── src/
│       │   ├── AnalyticsPlugin.ts                    # interface abstrata
│       │   ├── implementations/
│       │   │   ├── FirebaseAnalytics.ts              # MVP
│       │   │   └── NullAnalytics.ts                  # dev mode, sem envio
│       │   └── types.ts
│       └── package.json
│
├── apps/
│   ├── game/                      # Expo + react-native-skia (mobile)
│   │   ├── src/
│   │   │   ├── renderers/
│   │   │   │   └── SkiaRenderer.ts                   # implements IRenderer
│   │   │   ├── screens/
│   │   │   │   ├── GameScreen.tsx
│   │   │   │   ├── StoreScreen.tsx
│   │   │   │   ├── StoryModeScreen.tsx
│   │   │   │   └── SurvivalModeScreen.tsx
│   │   │   ├── entities/                             # registro dos tipos do jogo
│   │   │   │   ├── registerEntities.ts
│   │   │   │   └── registerStoreItems.ts
│   │   │   └── levels.json                           # gerado pelo calibrador
│   │   └── package.json
│   │
│   └── calibrator/                # Next.js (dev tool — não publicado)
│       ├── src/
│       │   ├── renderers/
│       │   │   └── CanvasRenderer.ts                 # implements IRenderer
│       │   ├── MapEditor/
│       │   │   ├── Grid.tsx
│       │   │   ├── Toolbox.tsx
│       │   │   └── PropertiesPanel.tsx
│       │   ├── CalibrationPanel/
│       │   │   ├── Sliders.tsx
│       │   │   └── DifficultyScore.tsx
│       │   └── AnalyticsDashboard/
│       │       ├── ScatterPlot.tsx                   # taxa de conclusão por fase
│       │       └── LevelMetrics.tsx
│       └── package.json
│
├── docs/
│   └── superpowers/specs/
│       └── 2026-04-18-space-invaders-design.md
│
└── package.json                   # npm workspaces
```

---

## Arquitetura — Princípios

### Renderização dual

A lógica de jogo (física, colisão, IA dos inimigos, loop) vive em TypeScript puro, separada da camada visual. Dois renderers implementam a mesma interface:

```typescript
interface IRenderer {
  drawSprite(sprite: Sprite, x: number, y: number): void
  drawRect(x: number, y: number, w: number, h: number, color: string): void
  clear(): void
}

class SkiaRenderer implements IRenderer { /* mobile */ }
class CanvasRenderer implements IRenderer { /* calibrador/browser */ }
```

O que você joga no browser para calibrar é exatamente o que vai para o mobile.

### Registry pattern (escalabilidade)

O Level Engine não conhece "Space Invaders" — ele conhece tipos de entidade registrados. Isso permite reutilizar a plataforma em outros jogos 2D futuramente:

```typescript
// Space Invaders registra seus tipos
engine.registerEntityType({
  id: 'enemy-classic',
  label: 'Inimigo Clássico',
  icon: '👾',
  properties: { pointValue: 10, style: 'classic' }
})

engine.registerEntityType({
  id: 'meteor',
  label: 'Meteoro',
  icon: '🪨',
  properties: { behavior: 'floating' | 'static' | 'destructible' }
})
```

---

## Level Engine

### Interface pública

```typescript
interface LevelEngine {
  generate(request: LevelRequest): LevelDefinition
  setCalibrator(strategy: CalibratorStrategy): void
  registerEntityType(type: EntityType): void
}

interface LevelRequest {
  mode: 'story' | 'survival'
  // Story
  levelIndex?: number
  totalLevels?: number
  // Survival
  playerStats?: PlayerStats
  currentScore?: number
}
```

### LevelDefinition

```typescript
interface LevelDefinition {
  id: string
  style: 'classic' | 'freeRoam' | 'mixed'
  difficultyScore: number        // 0–100
  entities: EntityPlacement[]    // mapa gerado pelo editor
  params: LevelParams
}

interface LevelParams {
  // Herdados do Unity
  numberOfEnemies: number
  enemySpeed: number
  enemyShotDelay: number
  enemyShotSpeed: number
  enemyAngerDelay: number        // depois deste tempo, inimigos ficam vermelhos e atiram 3x mais rápido
  enemySpawnDelay: number
  hasPowerUps: boolean
  powerUpMinWait: number
  powerUpMaxWait: number
  // Novos
  formationPattern?: GridPattern  // para estilo clássico
  survivalDuration?: number       // para survival
  spawnWaveInterval?: number      // para survival
}
```

### Estratégias de calibração

**CurveCalibratorStrategy (MVP):** Define uma curva de dificuldade 0–100. Cada ponto da curva mapeia para valores concretos de parâmetros via fórmulas lineares/exponenciais. Determinístico, sem simulação.

**SimulationCalibratorStrategy (v2):** Roda um bot simples contra a fase gerada N vezes. Mede tempo médio de sobrevivência e taxa de morte. Ajusta parâmetros iterativamente até atingir métricas alvo.

**TelemetryCalibratorStrategy (v3):** Coleta dados de partidas reais dos jogadores. Recalibra fases subsequentes com base na distribuição de performance real.

A estratégia ativa é injetada — o jogo não muda para trocar de estratégia.

---

## Estilos de Fase

| Estilo | Comportamento dos Inimigos | Mecânica especial |
|---|---|---|
| **Clássico** | Formação em grid, movimento lateral sincronizado | Formação desce quando toca a borda |
| **Livre** | Cada inimigo se move para posições aleatórias | "Raiva" após delay: tiro 3x mais rápido, cor vermelha |
| **Misto** | Começa em formação; ao ficar com raiva, inimigos escapam da grid | Transição de clássico para livre durante a fase |

---

## Modos de Jogo

### Modo História
- 20 fases fixas com progressão de dificuldade 10 → 100
- Sequência de estilos: clássico (1–6), misto (7–12), livre (13–18), misto pesado (19–20)
- Fases geradas pelo calibrador, salvas em `levels.json`
- Publicadas via EAS Update (OTA, sem review da loja)
- Rollout faseado via `eas channel:edit production --rollout-percentage N`

### Modo Survival
- Geração procedural infinita em runtime
- Engine monitora: mortes por wave, kills/min, tempo sobrevivido
- Dificuldade aumenta se jogador domina, reduz se morre muito
- Estilos alternados aleatoriamente entre waves
- Score local (leaderboard online fora do MVP)

---

## Calibrador (Dev Tool)

App web em Next.js, roda em `localhost:3001`. **Não é publicado nas lojas.**

### Painel de Calibração
- Sliders para todos os `LevelParams`
- Score de dificuldade calculado em tempo real (0–100)
- Visualização da posição na curva do modo história
- Alertas automáticos quando parâmetros estão fora do range recomendado para o índice da fase

### Editor de Mapas
- Grade visual (12×16 células)
- Objetos posicionáveis: Inimigo, Meteoro, Obstáculo, Powerup, Spawn do Jogador
- Propriedades por objeto (tipo de inimigo, comportamento do meteoro, etc.)
- Snap to grid
- Desfazer/refazer

### Fluxo de uso
1. Abre fase no calibrador
2. Ajusta parâmetros nos sliders
3. Posiciona entidades no editor de mapas
4. Clica "Jogar no Browser" — testa a fase com Canvas HTML5
5. Clica "Salvar" — grava no `levels.json`
6. Roda `eas update` — jogadores recebem OTA

---

## Objetos de Jogo

| Objeto | Origem | Comportamento |
|---|---|---|
| Inimigo Clássico | Novo | Grid, movimento lateral |
| Inimigo Livre | Unity | Movimento aleatório, mecânica de raiva |
| Meteoro | Novo | Estático, flutuante ou destrutível. Bloqueia tiros. |
| Obstáculo (Bunker) | Clássico Space Invaders | Destrutível por tiros, protege o jogador |
| Powerup 2x | Unity | Dobra pontuação temporariamente |
| Powerup Shield | Unity | Escudo temporário |
| Nave do Jogador | Unity | Movimento horizontal, tiro vertical |

---

## Assets

Sprites disponíveis no repo Unity (a migrar):
- `playerShip3_red.png`, `ufoYellow.png`, `enemy_bullet04.png`
- `bullet_01_32x32.png`, `powerupBlue.png`, `powerupGreen_shield.png`
- `shield3.png`, `flash5_64x64x4x2.png` (spritesheet de explosão)
- `playerLife3_red.png`, `kenvector_future.ttf`

Áudio: não estava no repo Unity. Buscar em Kenney.nl (mesmo provável origem dos sprites).

---

## OTA e Deploy

```bash
# Calibrar e publicar novos levels
eas update --branch production --message "recalibração fases 7-12"

# Rollout faseado
eas channel:edit production --rollout-branch canary --rollout-percentage 0.1
eas channel:edit production --rollout-percentage 0.5
eas channel:edit production --rollout-percentage 1.0
```

Atualiza: lógica TypeScript, assets, `levels.json`.  
Requer nova versão na loja: novos módulos nativos, permissões, major SDK update.

---

## Escalabilidade Futura

O calibrador e o level-engine são projetados para ser reutilizados em outros jogos 2D:

- `EntityRegistry` aceita qualquer tipo de entidade
- `CalibratorStrategy` é plugável
- A UI do calibrador gera controles a partir do schema das entidades registradas
- Próximo jogo 2D: registra seus tipos de entidade, reutiliza toda a infraestrutura

---

## Analytics

Integração com **Firebase Analytics** (gratuito até 10 bilhões de eventos/mês). Cada sessão envia: fase jogada, resultado (vitória/derrota), mortes, tempo sobrevivido.

### Dashboard no Calibrador
- **Scatter plot**: eixo X = índice da fase, eixo Y = taxa de conclusão
- Pontos em vermelho = fase muito difícil (conclusão < 40%)
- Pontos em azul = fase fácil demais (fora da curva esperada)
- Clique no ponto → abre a fase diretamente no editor para recalibrar
- Métricas resumo: taxa de conclusão média, fases com problema, mortes médias/fase

### AnalyticsPlugin (reutilizável)
```typescript
interface AnalyticsPlugin {
  trackLevelStart(levelId: string): void
  trackLevelComplete(levelId: string, stats: LevelStats): void
  trackLevelFail(levelId: string, stats: LevelStats): void
}

class FirebaseAnalytics implements AnalyticsPlugin { }   // produção
class NullAnalytics implements AnalyticsPlugin { }       // dev mode
```

---

## Monetização

### Modelo: Freemium (Ads + IAP)
- **Ads rewarded**: jogador assiste voluntariamente para ganhar vida extra ou powerup
- **Sistema de vidas**: 5 vidas. Ao esgotar, espera 30min ou assiste ad
- **IAP "vidas infinitas por 24h"**: R$3,90
- **IAP skins premium**: R$2,90–R$9,90 (via gemas)
- **Pacotes bundle** com desconto

### Duas moedas
| Moeda | Como ganhar | Como gastar |
|---|---|---|
| 🪙 Moedas (soft) | Jogando, kills, fases completas, ads rewarded | Skins comuns, lives extras |
| 💎 Gemas (hard/IAP) | Compra real via RevenueCat | Skins premium, pacotes, ad-free |

### MonetizationPlugin (reutilizável)
```typescript
interface MonetizationPlugin {
  showRewardedAd(): Promise<RewardResult>
  isAdFree(): boolean
  getLives(): number
  store: StorePlugin
}

class AdMobMonetization implements MonetizationPlugin { }
class RevenueCatMonetization implements MonetizationPlugin { }
class FreeMonetization implements MonetizationPlugin { }  // dev mode
```

---

## Loja In-Game

### Categorias de itens
| Categoria | Exemplos | Desbloqueio |
|---|---|---|
| 🚀 Naves | Padrão, UFO, Chamas, Raio, Fantasma | Nível / Moedas / Gemas |
| 👾 Inimigos (skin) | Clássico, Neon, Pixel art retrô | Moedas / Gemas |
| 💥 Efeitos de tiro | Laser, Plasma, Arco-íris | Moedas / Gemas |
| ⭐ Powerup skins | Visuais alternativos para shield e 2x | Moedas |
| 🎵 Trilha sonora | Packs de música alternativa | Gemas |

### StorePlugin (reutilizável)
```typescript
interface StorePlugin {
  getItems(category: string): StoreItem[]
  purchaseItem(itemId: string): Promise<PurchaseResult>
  getBalance(): { coins: number; gems: number }
  equipItem(itemId: string): void
  getEquipped(category: string): StoreItem
}
```

Os itens são registrados pelo jogo, não hardcoded no plugin:
```typescript
store.registerItem({ id: 'ship-ufo',   category: 'ships', price: { coins: 800 } })
store.registerItem({ id: 'ship-ghost', category: 'ships', price: { gems: 1 } })
```

O próximo jogo 2D registra seus próprios itens — a infraestrutura de pagamento, carrinho e UI da loja são reutilizados.

---

## Fora do escopo (MVP)

- Leaderboard online (Survival com score local inicialmente)
- Multiplayer
- Animações complexas de cutscene entre fases
- Backend de telemetria (TelemetryCalibratorStrategy fica para v3)
