# Enemy Movement Design — Anchored Micro-Movement

**Status:** Aprovado (inimigos de combate + asteroide multidireção) — pronto para implementar
**Data:** 2026-06-14
**Autor:** Game Design
**Implementa:** `apps/game/src/game/GameLoop.ts` (`moveEnemies`), `apps/game/src/game/types.ts` (`Enemy`), `apps/game/src/entities/registerEntities.ts`
**Substitui:** o comportamento "formação clássica que desce ao bater na borda" para inimigos de combate.

---

## 1. A ideia (Maycon, verbatim)

> "os inimigos não precisam ficar descendo, acho que no grid podemos deixar eles na
> posição e cada um vai ter um movimento diferente mas só ali no quadradinho dele de
> movimento"

Tradução de design: inimigos de combate **não descem mais em formação**. Cada um fica
**ancorado na posição de spawn do grid** e faz um **micro-movimento local**, oscilando
"no quadradinho dele", com padrão e ritmo variando por tipo. O asteroide continua sendo
obstáculo (desce e atravessa).

## 2. Por que isso é melhor (e o que destrava)

- O player agora se move em **2D livre** e pode subir e encostar. Formação descendo era
  herança do Space Invaders 1-eixo; com player 2D ela vira ruído.
- Spawn por **wave system** já posiciona o inimigo na célula do grid. Micro-movimento
  ancorado **conserva a leitura do mapa** que o designer montou no editor — o que ele
  desenhou é o que o jogador enxerga.
- Cada tipo ganha **personalidade visível** pelo jeito de se mexer, sem custar HP/dano.
- **Alimenta a calibração por dados:** o padrão vira mais um eixo de dificuldade que o
  Level Engine pode pontuar (movimento agitado = mais difícil de acertar), em vez de
  caso especial hardcoded.

## 3. Modelo de movimento (parâmetros, não casos especiais)

Cada inimigo guarda a **âncora** (posição de spawn) e oscila em torno dela. O game-mobile-dev
adiciona um descritor de movimento por **tipo de entidade** (em `registerEntities.ts`),
lido para o estado de cada inimigo no spawn — mesmo caminho que `hp`, `burstCount` etc.

### 3.1 Campos novos no `Enemy` (state)

```
anchorX: number        // x de spawn (origem da oscilação)
anchorY: number        // y de spawn
movementPattern: 'oscillate-h' | 'orbit' | 'bob-v' | 'drift-return' | 'static' | 'descend'
amplitudeX: number     // px de deslocamento máximo no eixo X (a partir da âncora)
amplitudeY: number     // px de deslocamento máximo no eixo Y
frequency: number      // ciclos por segundo (Hz) — quão rápido oscila
phase: number          // offset inicial da fase em radianos (desincroniza vizinhos)
dirX: number           // só asteroide ('descend'): componente X do vetor unitário (-0.7071 | 0 | +0.7071)
dirY: number           // só asteroide ('descend'): componente Y do vetor unitário (+0.7071 | +1)
```

`movementType: 'horizontal' | 'vertical'` **é aposentado** para inimigos de combate; o
asteroide passa a usar `movementPattern: 'descend'` (ver §5). Manter o campo como alias
durante a migração é opcional do dev.

### 3.2 Descritor por tipo (em `registerEntities.ts`)

O `EntityType.properties` ganha o bloco de movimento. Valores propostos:

```
movementPattern, amplitudeX, amplitudeY, frequency
```

### 3.3 Como o GameLoop integra cada padrão

A cada tick, para inimigos de combate (vivos):

```
t += dt
posição = âncora + offset(pattern, amplitude, frequency, phase, t)
```

- `oscillate-h`: `x = anchorX + amplitudeX * sin(2π·f·t + phase)`; y fixo.
- `bob-v`:       `y = anchorY + amplitudeY * sin(2π·f·t + phase)`; x fixo.
- `orbit`:       `x = anchorX + amplitudeX * cos(2π·f·t + phase)`,
                 `y = anchorY + amplitudeY * sin(2π·f·t + phase)` (elipse pequena).
- `drift-return`: desliza até `+amplitudeX` numa direção e volta (sin assimétrico/triangular),
                  com pausa no extremo — sensação de "investida e recuo".
- `static`: sem offset (reservado para bosses/torres futuras).
- `descend`: ignora âncora; asteroide viaja em linha reta no vetor `(dirX, dirY)` sorteado no
             spawn — `pos += (dirX, dirY) · speed · dt` (§5). Removido ao sair de qualquer borda.

`phase` é semeada **por inimigo** (ex.: derivada do índice no grid: `phase = (col*0.7 + row*1.3)`),
para vizinhos **nunca oscilarem em sincronia** — evita o "cardume colado" e o pior caso de colisão.

## 4. Números por tipo de inimigo de combate

Célula do grid = 32px, corpo do inimigo = 32px. Vizinhos colados ficam centro-a-centro a
32px. Regra dura: **amplitude ≤ 12px por eixo** — garante gap ≥ 8px entre corpos no pior
caso (validado: `gap = 32 − 2·amp`). Com fase desincronizada, o pior caso quase nunca
ocorre. Nada de amplitude ≥16 (gap 0 = sobreposição).

| Tipo | Personalidade | Pattern | amplitudeX | amplitudeY | frequency (Hz) | Justificativa |
|------|---------------|---------|-----------|-----------|----------------|----------------|
| **basic-enemy** | Padrão, previsível | `oscillate-h` | 10 | 0 | 0.5 | Vaivém lateral suave (1 ciclo a cada 2s). Fácil de ler e acertar — é o tutorial vivo. |
| **fast-enemy** | Agitado, nervoso | `orbit` | 12 | 8 | 1.4 | Órbita elíptica rápida (~0.7s/volta). Visualmente "zumbindo". Amplitude no teto (12) mas frequência alta = alvo escorregadio, sem sair do quadradinho. Combina com burst 3 e HP baixo (40). |
| **strong-enemy** | Lento, pesado | `bob-v` | 0 | 6 | 0.25 | Sobe/desce pesado (1 ciclo a cada 4s), amplitude curta. Parece "respirar". Alvo quase parado — justo, porque tem 200 HP e é multi-hit. |

**Coerência com a spec v2 (§Sistema de Inimigos):** Padrão = médio, Rápido = ágil/baixo HP,
Forte = lento/tanque. O movimento reforça essas leituras sem mexer em HP/dano/XP.

### 4.1 Por que esses números e não outros

- **basic 0.5Hz / amp 10:** lento o bastante pra novato acompanhar a mira; rápido o
  bastante pra não parecer estátua. É a referência neutra que a calibração usa de base.
- **fast 1.4Hz / órbita 12×8:** o eixo Y curto (8) evita encostar no vizinho de cima/baixo;
  o X no teto (12) dá a sensação de fuga. Frequência ~3× a do basic = "rápido" sem teleporte.
- **strong 0.25Hz / amp 6:** o mais lento e curto de todos. Tanque tem que ser **fácil de
  acertar repetidamente** (multi-hit), senão vira parede frustrante. Bob vertical lê como peso.

## 5. Asteroide — **cai em 3 direções (reto + 2 diagonais)** ✅ aprovado

> Maycon: "pode adicionar para o asteroid vir de outras direções também, reto e diagonal"

O asteroide é **obstáculo**, não alvo ancorado — continua sem micro-movimento (não orbita,
não oscila no quadradinho). O que muda: em vez de cair **sempre reto**, ele agora viaja em
**linha reta numa de 3 direções fixas**, sorteada no spawn. Mais variedade de desvio, mesma
função (algo que cai e você se esquiva), custo de implementação mínimo.

### 5.1 As 3 direções (vetores exatos)

O asteroide passa a guardar um **vetor de direção normalizado** (`dirX, dirY`) e se move
`pos += dir · speed · dt`. As 3 opções:

| Nome | dirX | dirY | Ângulo (do vertical) | Leitura |
|------|------|------|----------------------|---------|
| `straight` | `0` | `+1` | 0° | Cai reto, como hoje. |
| `diag-left` | `-0.7071` | `+0.7071` | 45° p/ esquerda | Desce indo p/ baixo-esquerda. |
| `diag-right` | `+0.7071` | `+0.7071` | 45° p/ direita | Desce indo p/ baixo-direita. |

`0.7071 ≈ √2/2 = sin(45°) = cos(45°)`. O vetor é **unitário** (`√(dx²+dy²)=1`) nas 3, então
a velocidade real é idêntica — diagonal **não** é mais rápida (ver §5.3).

**Por que só 3 direções (reto + 2 diagonais a 45°) e não um leque contínuo de ângulos:**
- 3 padrões são **legíveis**: o jogador aprende as 3 trajetórias e desenvolve skill de leitura.
  Ângulo aleatório contínuo vira loteria — não dá pra antecipar, e antecipação é o que torna
  o desvio justo (mesmo princípio do §6.3 dos inimigos).
- `dirY` sempre positivo (`+0.7071` ou `+1`): o asteroide **sempre desce**. Nada de vir de baixo
  ou na horizontal pura — isso descaracterizaria "algo caindo do céu" e quebraria a leitura.
- 45° é o ângulo máximo razoável: a componente horizontal (0.7071) iguala a vertical, dá um
  desvio lateral nítido sem o asteroide "rasgar a tela de lado". Ângulos menores (ex.: 30°)
  seriam variação fraca demais pra justificar a complexidade.

### 5.2 Como a direção é escolhida — **sorteio aleatório no spawn (1/3 cada)**

**Recomendado:** sortear uma das 3 direções no momento do spawn, **uniforme (1/3 = 33,3% cada)**.

- **Variedade automática, custo zero de design:** o designer não precisa configurar direção por
  asteroide no editor — toda fase com asteroide ganha as 3 trajetórias de graça. Coerente com o
  princípio "parâmetros, não casos especiais hardcoded".
- **Por que aleatório e não configurável no editor:** a graça do obstáculo é a imprevisibilidade
  controlada. Fixar a direção no editor dá trabalho manual (o problema que este projeto inteiro
  combate) e tornaria cada fase decorável. Uniforme 1/3 entrega o equilíbrio "reto vs diagonal"
  sem ajuste fino.
- **Por que não por posição:** derivar direção da coluna de spawn (ex.: esquerda → diag-right)
  seria determinístico e previsível demais, e amarraria a trajetória ao layout — menos variedade.

**Determinismo / teste:** o GameLoop já usa `Math.random()` só no drop de fuel (FUEL-1); este é
o **segundo e último** ponto de aleatoriedade. O `ts-test-writer` mocka `Math.random()` para
forçar cada uma das 3 direções e asserta o vetor resultante. Mapeamento do sorteio (estável,
testável):

```
r = Math.random()          // [0, 1)
r < 1/3            → straight   (0, +1)
1/3 <= r < 2/3     → diag-left  (-0.7071, +0.7071)
r >= 2/3           → diag-right (+0.7071, +0.7071)
```

### 5.3 Velocidade — **idêntica nas 3 direções**

- Magnitude inalterada: `speedMultiplier 0.8` do asteroide (sem mudança na spec v2 nem no
  registro de entidade).
- Como o vetor é **normalizado** (unitário), `pos += dir · speed · dt` percorre a **mesma
  distância por tick** em qualquer direção. A diagonal **não** é √2 mais rápida — esse é o bug
  clássico de "movimento diagonal acelerado" e está explicitamente proibido (§7).
- Resultado prático: na diagonal o asteroide leva **mais tempo** para cruzar a tela do topo ao
  chão (porque gasta velocidade no eixo X), o que é correto e justo — dá ao jogador a mesma
  janela de reação.

### 5.4 Saída de tela — **some em QUALQUER borda** (confirmado)

Hoje o asteroide é removido só ao passar do **fundo**. Com diagonais ele pode sair pela
**lateral** antes de chegar embaixo. Portanto a regra de cleanup muda para:

> Remover o asteroide quando sair de **qualquer** borda (com folga do raio do corpo):
> `x < -r` **ou** `x > screenW + r` **ou** `y > screenH + r`.

Não precisa checar `y < -r` (topo), porque `dirY` é sempre positivo — ele nunca sobe. Manter a
folga de 1 raio (`r`) evita o asteroide "piscar" sumindo com metade do corpo ainda na tela.

### 5.5 Drift horizontal do backlog — **absorvido / cancelado**

O "tempero de drift horizontal" que estava no backlog (oscilar o X sutilmente enquanto desce)
está **descartado**. As diagonais entregam a mesma intenção — quebrar o trilho vertical único —
de forma mais legível e barata. Não acumular as duas coisas: asteroide se move **em linha reta**
numa das 3 direções, **sem** senoide de drift por cima. Um obstáculo com trajetória reta e
previsível é mais justo de desviar do que um que serpenteia.

### 5.6 Interação (inalterada)

Continua **obstáculo puro**: não conta para a condição de vitória (não é "inimigo a abater"),
causa **dano por contato** (mesma janela de invencibilidade 1500ms), **não atira**, e a partir
do level 5 dropa fuel ao ser destruído (FUEL-1) — nada disso muda com a direção.

## 6. Interação com o resto do jogo

### 6.1 Wave system
Sem mudança de fluxo: a wave spawna o inimigo na célula → `anchorX/anchorY` = posição de
spawn → micro-movimento roda em volta dela. `advanceWave()` e `buildEnemies()` só precisam
preencher os campos novos a partir do `EntityPlacement` (mesmo mapeamento de hoje em
`mapPlacementsToEnemies`). A condição de fim de level (todos mortos) não muda.

### 6.2 Combate / dano por contato (sendo adicionado)
- Player 2D pode subir e encostar. Como o inimigo **não desce mais até o player**, o contato
  é **iniciado pelo player** — coerente com o trade-off Archero (parar pra atirar × se expor).
- Como ninguém sai do quadradinho, o player consegue **prever** onde o corpo vai estar →
  contato é evitável → dano por contato é **justo** (não é "te empurraram").
- O dano por contato usa a mesma janela de invencibilidade já existente (1500ms) pra não
  derreter o player ao raspar.

### 6.3 Jogabilidade do alvo (não impossível de acertar)
- Amplitude ≤12px e corpo 32px: o inimigo **sempre cobre a célula original** — uma bala mirada
  no centro da célula acerta em praticamente qualquer fase do ciclo.
- Auto-fire é vertical (sobe reto). `oscillate-h`/`orbit` movem no X, então exigem leve
  reposicionamento do player → skill, não loteria. `bob-v` (strong) quase não foge da mira.
- Bullets já trackam a posição corrente do atirador (`handleEnemyShooting` usa `enemy.x/y`
  atual), então o tiro inimigo continua saindo do corpo certo mesmo oscilando.

## 7. Trade-offs (explícitos)

- **Divertido:** cada inimigo tem "vida própria", a tela fica viva sem caos; o player lê
  personalidade pelo movimento. Veterano otimiza mira no ritmo de cada tipo.
- **Justo:** amplitude pequena + fase desincronizada = alvo previsível, vizinhos nunca colam,
  ninguém sai da tela nem do quadradinho. Contato é sempre culpa/escolha do player.
- **Custo:** a tela não "avança sozinha" — o player precisa ir até os inimigos (coerente com
  level sem timer da spec v2). Risco: fases muito espalhadas podem virar caça-níquel chato;
  mitigação fica no design de wave (densidade), não no movimento.
- **O que evitar (instruções de implementação):**
  - Amplitude ≥16px em qualquer eixo (sobreposição de vizinhos colados).
  - Fase global única para todos (cardume sincronizado, feio e injusto).
  - Deixar o offset acumular/derivar (drift sem retorno) — sempre relativo à âncora fixa.
  - Aplicar `descend` a inimigos de combate ou micro-movimento (oscilação/órbita) ao asteroide.
  - **Movimento diagonal acelerado:** multiplicar `speed` por componente não-normalizada. O vetor
    é unitário; diagonal percorre a MESMA distância/tick que o reto. Nada de `(±1, +1)` cru.
  - Sortear direção do asteroide fora do spawn (ex.: a cada tick) — direção é fixa pela vida dele.
  - Remover asteroide só pelo fundo — com diagonal ele sai pela lateral; checar todas as bordas.
  - Mover inimigo "morto" (`alive=false`) — pular no loop como hoje.

## 8. O que o game-mobile-dev implementa

1. `types.ts`: adicionar a `Enemy` os campos `anchorX, anchorY, movementPattern, amplitudeX,
   amplitudeY, frequency, phase`.
2. `registerEntities.ts`: adicionar ao `properties` de cada tipo o bloco de movimento da
   tabela §4 (basic/fast/strong) e §5 (asteroid = `descend`, amplitudes 0).
3. `GameLoop`:
   - `mapPlacementsToEnemies`/`buildEnemies`: setar `anchorX=x, anchorY=y`, ler pattern/amp/freq
     do placement, derivar `phase` por índice no grid. **Asteroide:** sortear `(dirX, dirY)` via
     `Math.random()` no spawn pelo mapeamento 1/3 de §5.2 e gravar no estado.
   - `moveEnemies`: substituir a lógica de formação por `posição = âncora + offset(pattern,…,t)`;
     no ramo `descend`, aplicar `pos += (dirX, dirY) · speed · dt`.
   - **Cleanup do asteroide:** remover ao sair de qualquer borda (`x < -r || x > screenW+r ||
     y > screenH+r`), não só pelo fundo (§5.4).
   - Manter um acumulador de tempo (`t`) no loop para alimentar as senoides.
4. Tabela §4/§5 são **dados** — futuramente expostos ao calibrador por planeta (amplitude/freq
   podem escalar por planeta como eixo de dificuldade). Nada hardcoded por level.

Aprovado pelo Maycon (inimigos de combate + asteroide multidireção, 2026-06-14). Liberado para implementação.
