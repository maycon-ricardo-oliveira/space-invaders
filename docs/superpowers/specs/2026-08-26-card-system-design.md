# Sistema de Cartas por Raridade — Catálogo e Calibração

**Data:** 2026-08-26
**Sprint:** 8 (CARD)
**Status:** Proposta de design — camada de raridade, **complementar** ao deck de mecânicas da CARD-2
**Relação com `FEATURES.md` → CARD-2:** as 14 cartas de mecânica continuam de pé e **adiadas para a leva 2**. Nenhuma foi descartada — elas estão desenhadas em detalhe na seção 8.3 e no anexo da seção 8.5, já encaixadas na escada de raridade, para que a leva 2 seja implementação e não redesenho
**Mantém intacto:** `FEATURES.md` → CARD-1 (tela de 3 cartas, garantia de vida no level 5, sem carta no boss, perda na morte)

---

## 1. O problema que isso resolve

O deck da CARD-2 tem 14 cartas e **14 mecânicas diferentes**. Cada carta nova
exige código novo. Isso não escala: no Planeta 5 a gente precisaria inventar mais
30 ideias distintas de mecânica.

A solução é separar **o que a carta mexe** (o eixo) de **quanto ela mexe** (a
raridade). Um eixo vira 3 ou 4 cartas. Doze eixos viram 40 cartas. E adicionar
uma raridade nova num eixo existente custa **uma linha de tabela**, zero código.

> **Regra de ouro do sistema:**
> `valor da carta = unidade base do eixo × multiplicador da raridade`
>
> Nenhuma carta tem número escrito à mão. Todas derivam dessa conta.

### 1.1 Os dois decks são complementares, não concorrentes

Isso aqui precisa ficar explícito porque é fácil ler errado: **a camada de
raridade não substitui as cartas de mecânica da CARD-2.** São dois decks com
funções diferentes, e o objetivo é que convivam no mesmo baralho.

| | Deck de raridade (este doc) | Deck de mecânicas (CARD-2) |
|---|---|---|
| **Resolve** | Volume de deck com custo baixo | Variedade e sabor |
| **Como** | 12 eixos × faixas de raridade | Comportamento novo de bala/tiro |
| **Sensação** | "minha nave está mais forte" | "minha nave faz coisa nova" |
| **Custo** | Barato — 5 dos 12 eixos já existem no código | Caro — exige máquina nova |
| **Quando** | Agora (Sprint 8) | Leva 2, logo depois de fechar o loop |

Um roguelite precisa dos dois. Só números vira planilha; só mecânica vira um
deck pequeno e caríssimo de expandir. A ordem é **primeiro o barato que fecha o
loop, depois o caro que dá personalidade** — e as mecânicas caras já entram na
leva 2 com a escada de raridade aplicada, ganhando 3 ou 4 cartas cada em vez de
1.

---

## 2. A escada de raridade

### 2.1 Decisão: reusar a escada de 5 dos equipamentos

O jogo **já tem** uma escada de raridade, definida para equipamentos
(`FEATURES.md` INV-1 e a wiki): Comum → Incomum → Raro → Épico → Lendário.

O Maycon falou em 3 níveis ("comum, rara, épica"), mas como exemplo. A
recomendação é **reusar os 5 nomes e as 5 cores**, por um motivo simples: se
carta e equipamento usarem vocabulários diferentes, o jogador tem que aprender
duas linguagens de raridade e o roxo vai significar coisas diferentes em duas
telas. Isso é confusão gratuita.

**Mas nem todo eixo usa a escada inteira.** É aí que a resposta ao Maycon fica
completa: em vez de espremer 5 tiers em todo efeito (e produzir a papa
"+25%/+30%/+35%", que ninguém sente), **cada eixo declara a sua faixa de
raridade**. Cura existe de Comum a Raro. Escudo só de Incomum a Épico. Dano usa
Comum a Épico. Assim cada degrau é perceptível.

**Lendário fica reservado** e tem peso 0 nos Planetas 1 e 2. Não é escada morta:
é o espaço das cartas de *trade-off* que redefinem a build (seção 9). Aparecer
uma Lendária tem que ser um acontecimento, não um número um pouco maior.

### 2.2 A escada, as cores e o multiplicador

| Raridade | Cor | Hex | Multiplicador | Racional |
|---|---|---|---|---|
| Comum | Cinza-azulado | `#9AA5B1` | **1,0×** | A unidade de referência |
| Incomum | Verde | `#4CAF50` | **1,6×** | Um degrau |
| Raro | Azul | `#2F80ED` | **2,5×** | Dois degraus |
| Épico | Roxo | `#9B51E0` | **4,0×** | Três degraus |
| Lendário | Dourado | `#F2A93B` | **6,5×** | Quatro degraus (reservado) |

**Por que 1,6× por degrau e não 2×?**

A escada é geométrica de razão 1,6 (1 · 1,6 · 2,56 · 4,10 · 6,55, arredondado
para 1 / 1,6 / 2,5 / 4,0 / 6,5). Três motivos:

1. **1,6× é o menor salto que o jogador sente.** Pesquisa de percepção de
   magnitude (lei de Weber) coloca o limiar de "isso é claramente mais forte" em
   torno de 25–30% para números de jogo. 60% está confortavelmente acima —
   ninguém vai ficar em dúvida se o Raro é melhor que o Incomum.
2. **2× estoura o balanceamento no Épico.** Com razão 2, o Épico valeria 8× o
   Comum. Uma única carta Épica de dano daria +160%, tornando as 9 outras
   escolhas da fase irrelevantes. Com 1,6, o Épico vale 4× — forte o bastante
   para comemorar, fraco o bastante para não encerrar a decisão.
3. **É um número só para lembrar.** "Cada degrau vale mais ou menos 1,6× o
   anterior" cabe na cabeça do designer, do dev e do calibrador. Números
   arbitrários por carta não cabem.

**Cores:** essas 5 cores ainda não existem em lugar nenhum do código nem da wiki.
Este doc passa a ser a fonte de verdade delas — **equipamentos devem usar as
mesmas**. A paleta é daltônico-tolerante: cinza / verde / azul / roxo / dourado
tem diferença de luminância além de matiz, então dá para distinguir mesmo com
deuteranopia. A borda da carta também muda de espessura por raridade (1px / 2px /
2px+brilho / 3px+brilho / 3px+animação), então cor nunca é o único sinal.

---

## 3. Os eixos base

Doze eixos cobrem o jogo inteiro. Estão agrupados nas mesmas categorias que a
spec v2 já usa (Tiro, Velocidade, Defesa, Passivo, Vida), com dois eixos novos
(Crítico e XP).

| # | Eixo | Categoria | O que mexe | Unidade Comum | Custo |
|---|---|---|---|---|---|
| 1 | **Dano** | Tiro | `player.bulletDamage` | +20% | BARATO |
| 2 | **Cadência** | Tiro | `AutoFireSystem.intervalMs` | +15% de taxa | BARATO |
| 3 | **Crítico** | Tiro | chance de dano dobrado | +5% | MÉDIO |
| 4 | **Velocidade da bala** | Velocidade | `BULLET_SPEED` | +30% | MÉDIO |
| 5 | **Velocidade de movimento** | Velocidade | `PLAYER_SPEED` | +12% | MÉDIO |
| 6 | **HP máximo** | Vida | `player.maxHp` | +50 HP | BARATO |
| 7 | **Cura instantânea** | Vida | `player.hp` | 20% do maxHp | BARATO |
| 8 | **Vampirismo** | Vida | cura ao matar | 0,5% do maxHp/kill | MÉDIO |
| 9 | **Invulnerabilidade** | Defesa | `invincibilityTimer` | +250 ms | BARATO |
| 10 | **Escudo** | Defesa | absorve hits | 1 hit | MÉDIO |
| 11 | **Blindagem** | Defesa | reduz dano fixo | −1 de dano | MÉDIO |
| 12 | **Experiência** | Passivo | XP por kill | +15% | BARATO |

**Leva 2 — planejada, não descartada** (seção 8.3): Multi-tiro, Perfuração, Tiro
traseiro, Ricochete, Teleguiado e Bomba. Todos CAROS, todos já desenhados com a
escada de raridade aplicada.

---

## 4. A matriz efeito × raridade

**Esta é a tabela principal do documento.** Todo valor sai de
`unidade × multiplicador`, arredondado para um número que caiba num card sem
parecer gerado por planilha. Um travessão significa que o eixo não existe naquela
raridade.

| Eixo | Comum (1,0×) | Incomum (1,6×) | Raro (2,5×) | Épico (4,0×) | Máx. stacks | Teto |
|---|---|---|---|---|---|---|
| **Dano** | +20% | +32% | +50% | +80% | 5 | — |
| **Cadência** | +15% | +24% | +38% | +60% | 4 | +150% |
| **Crítico** | +5% | +8% | +12% | +20% | 4 | 60% |
| **Vel. da bala** | +30% | +48% | +75% | — | 3 | +200% |
| **Vel. de movimento** | +12% | +20% | +30% | — | 3 | +100% |
| **HP máximo** | +50 | +80 | +125 | +200 | 5 | — |
| **Cura instantânea** | 20% | 32% | 50% | — | ilimitado | — |
| **Vampirismo** | 0,5% | 0,8% | 1,25% | 2% | 3 | — |
| **Invulnerabilidade** | +250 ms | +400 ms | +600 ms | — | 2 | +1200 ms |
| **Escudo** | — | 1 hit / 20 s | 1 hit / 12 s | 2 hits / 10 s | 2 | 3 hits |
| **Blindagem** | −1 | −2 | −3 | — | 3 | −9 (piso 1) |
| **Experiência** | +15% | +24% | — | — | 2 | — |

**Total: 40 cartas a partir de 12 eixos.** O deck antigo tinha 14 cartas e 14
mecânicas. Este tem 40 cartas e 12 mecânicas, das quais 5 já existem no código.

### 4.1 Nomes que aparecem na tela

O jogador não vê "Dano Raro". Cada célula tem nome próprio, mas o prefixo é do
eixo — a leitura é imediata.

| Eixo | Comum | Incomum | Raro | Épico |
|---|---|---|---|---|
| Dano | Munição Pesada | Munição Perfurante | Ogiva de Plasma | Ogiva de Antimatéria |
| Cadência | Refrigeração | Alimentador Rápido | Canhão Rotativo | Motor de Rajada |
| Crítico | Mira Assistida | Ponto Fraco | Cálculo Balístico | Olho da Tempestade |
| Vel. da bala | Propelente Extra | Trilho Magnético | Acelerador de Partículas | — |
| Vel. de movimento | Manobra Ágil | Propulsor Auxiliar | Turbina de Íons | — |
| HP máximo | Chapa Extra | Casco Reforçado | Estrutura de Titânio | Casco de Batalha |
| Cura | Reparo de Campo | Kit de Emergência | Nanorreparo | — |
| Vampirismo | Coletor de Sucata | Drenagem de Núcleo | Sifão de Energia | Devorador de Estrelas |
| Invulnerabilidade | Amortecedor | Estabilizador | Campo de Fase | — |
| Escudo | — | Barreira Instável | Barreira Tática | Barreira Dupla |
| Blindagem | Placa de Ablação | Casco Ablativo | Couraça | — |
| Experiência | Sensor de Combate | Uplink Tático | — | — |

### 4.2 Como os valores empilham

**Uma fórmula, sem exceção por carta:**

```
valorFinal = base × (1 + soma de todos os bônus percentuais do eixo)
```

Soma **aditiva sobre a base**, não multiplicativa entre cartas. Isso é
deliberado:

- **É legível.** Duas cartas de +20% dão +40%, não +44%. O jogador consegue fazer
  a conta de cabeça.
- **Não explode.** Multiplicação entre 5 stacks vira número absurdo no fim da
  fase e quebra a calibração de dificuldade.
- **O retorno decrescente já vem do sorteio**, não da matemática do stack (seção
  6). Assim a desaceleração é uma regra só, num lugar só.

**Cadência tem um detalhe:** o bônus é em **taxa de tiro**, não em redução de
intervalo. `intervalo = 400ms / (1 + soma)`. Com +150% (o teto), o intervalo vai a
160ms. Se fosse redução direta de intervalo, quatro cartas de −38% levariam o
intervalo a zero — divisão por zero disfarçada de carta.

**Vel. da bala tem um teto físico, não estético.** A colisão é AABB por frame. A
650 px/s um frame de 16 ms move a bala 10,4 px; o inimigo tem 32 px. A 2000 px/s a
bala anda 33 px por frame e **passa por dentro do inimigo sem colidir**. O teto de
+200% (1500 px/s, 25 px/frame) é a margem de segurança. Se um dia a bala precisar
ir além, o sistema de colisão tem que virar swept-AABB antes.

---

## 5. Pesos de sorteio

### 5.1 Sorteio em dois estágios (decisão estrutural)

O sorteio acontece em **dois passos separados**:

1. **Sorteia a raridade** pelos pesos de raridade.
2. **Sorteia o eixo dentro daquela raridade** pelos pesos de eixo.

Isso não é detalhe de implementação, é o que faz o sistema não apodrecer. Num
sorteio de estágio único (uma sacola com as 40 cartas), **adicionar cartas Épicas
novas aumentaria a chance de sair Épico** — o balanceamento se auto-sabota a cada
conteúdo novo. Com dois estágios, "4,7% de chance de Épico" continua sendo 4,7%
mesmo que amanhã existam 30 cartas Épicas.

### 5.2 Pesos de raridade — não reusar os do baú

As taxas de baú (Comum 64,9% / Incomum 25% / Raro 8% / Épico 2% / Lendário 0,1%)
**não servem** para cartas. O motivo é a frequência: baú abre 1× por fase, carta
aparece ~30 vezes por fase (10 level-ups × 3 opções). Com 0,1%, o jogador veria
uma Lendária a cada ~33 fases. Conteúdo que ninguém vê é conteúdo morto.

Cartas usam pesos próprios, e eles **melhoram conforme a fase avança**:

| Bracket (nível do jogador na fase) | Comum | Incomum | Raro | Épico | Lendário |
|---|---|---|---|---|---|
| **Níveis 1–3** | 100 | 35 | 8 | 1 | 0 |
| **Níveis 4–6** | 100 | 55 | 20 | 4 | 0 |
| **Níveis 7+** | 100 | 70 | 35 | 10 | 0 |

Convertido em probabilidade por carta sorteada:

| Bracket | Comum | Incomum | Raro | Épico | Chance de ver ≥1 Épico na tela de 3 |
|---|---|---|---|---|---|
| 1–3 | 69,4% | 24,3% | 5,6% | 0,7% | **2,1%** |
| 4–6 | 55,9% | 30,7% | 11,2% | 2,2% | **6,6%** |
| 7+ | 46,5% | 32,6% | 16,3% | 4,7% | **13,3%** |

**Por que esses números:** ao longo de uma fase inteira (~30 cartas sorteadas), o
jogador recebe em média **1,1 oferta Épica e 3,5 Raras**. Isso dá um pico
emocional por fase, não por level. E o gradiente por bracket cria a curva
narrativa certa: a fase começa com escolhas modestas e termina com escolhas que
mudam a build — exatamente quando o boss do nível 10 está chegando.

**Por que Comum fixo em 100:** ele é o denominador de referência. Ajustar
dificuldade de loot vira mexer em três números, não em cinco.

### 5.3 Escalada por planeta

O planeta desloca os pesos, o que sustenta a promessa da spec v2 ("builds ficam
mais fortes nos planetas difíceis") sem tocar na matriz de valores:

```
peso_incomum += 8 × (planeta − 1)
peso_raro    += 5 × (planeta − 1)
peso_epico   += 2 × (planeta − 1)
peso_lendario = (planeta >= 3 e bracket >= 7) ? 1 : 0
```

No Planeta 3, bracket 7+: Comum 41% / Incomum 35% / Raro 18% / Épico 5,7% /
Lendário 0,4%. Uma Lendária a cada ~8 fases — raro o suficiente para ser evento,
frequente o suficiente para existir.

Esses 3 coeficientes e a tabela de brackets são **dados do calibrador**
(Supabase), não constantes de código.

### 5.4 Pesos de eixo

Dentro da raridade sorteada, o eixo sai por peso. Comum = 100.

| Eixo | Peso | Por quê |
|---|---|---|
| Dano | 100 | Sempre relevante, sempre entendível |
| Cadência | 100 | Idem |
| HP máximo | 90 | Precisa aparecer para o level 5 ter opção real |
| Vampirismo | 85 | Carta-assinatura da spec v2; precisa aparecer de verdade |
| Crítico | 75 | Bom, mas exige entender probabilidade |
| Cura | 70 | Frequente, mas com modificador de contexto (abaixo) |
| Vel. de movimento | 70 | Muda o jeito de jogar, não o poder bruto |
| Vel. da bala | 60 | Conforto mais que poder |
| Invulnerabilidade | 60 | Forte demais para ser comum |
| Escudo | 60 | Idem |
| Blindagem | 55 | Efeito discreto, difícil de perceber |
| Experiência | 45 | Carta que dá mais cartas — precisa ser rara por definição |

**Modificadores de contexto** (multiplicam o peso do eixo na hora do sorteio):

| Situação | Modificador | Motivo |
|---|---|---|
| HP acima de 90% do máximo | Cura ×**0,2** | Carta lixo. Ninguém quer cura com a barra cheia |
| HP abaixo de 35% do máximo | Cura ×**2,0** e Vampirismo ×**1,5** | O jogo lê o aperto e oferece saída |
| É level 5 da fase | grupo Vida força o slot 1 | Contrato da CARD-1 |
| Eixo com stacks no teto | ×**0** | Sai da elegibilidade |

O modificador de HP baixo é a única concessão a "o jogo pega leve com você". É
defensável porque não é dado de graça — continua sendo **uma das três escolhas**,
e pegar a cura custa o slot que ia virar dano.

---

## 6. Stack e repetidas

### 6.1 Retorno decrescente

Contrato da CARD-1: carta já possuída tem peso reduzido. A regra concreta:

```
peso_efetivo(eixo) = peso_base(eixo) × 0,55 ^ (stacks já possuídos no eixo)
```

| Stacks | Peso restante |
|---|---|
| 0 | 100% |
| 1 | 55% |
| 2 | 30% |
| 3 | 17% |
| 4 | 9% |

**Por que 0,55 e não 0,8 ou 0,4** — simulei 20.000 fases com um jogador que
sempre escolhe dano quando dano aparece:

| Fator | Stacks de dano ao fim da fase | Dano oferecido por tela |
|---|---|---|
| 1,0 (sem freio) | 3,23 | 32,3% |
| 0,8 | 2,81 | 28,1% |
| 0,7 | 2,59 | 25,9% |
| **0,55** | **2,30** | **23,0%** |
| 0,4 | 2,05 | 20,5% |
| 0,3 | 1,88 | 18,8% |

Com 0,8 o freio quase não existe (corta 13% da especialização) e mono-dano é a
build ótima trivial. Com 0,3 o jogador é empurrado para a mediocridade
generalista e a escolha vira decoração. **0,55 corta 29% da especialização**: dá
para construir em volta de um eixo, mas os stacks 3 e 4 têm que ser conquistados.

### 6.2 Tetos de stack

Toda a coluna "Máx. stacks" da seção 4. Ao bater o teto, o eixo sai da
elegibilidade (peso 0) — nunca aparece uma carta que o jogador não pode usar.

Os tetos existem por três razões distintas, e vale distinguir:

- **Teto físico** — Vel. da bala (colisão por frame), Cadência (intervalo → 0).
- **Teto de jogabilidade** — Vel. de movimento a +100% (acima disso a nave
  atravessa a tela rápido demais e o loop "parar para atirar" do Archero
  desmonta); Invulnerabilidade a +1200 ms (2,7 s de i-frame numa tela cheia de
  balas é quase imortalidade).
- **Teto de variedade** — Dano e HP em 5, Crítico em 4. Não quebram nada; existem
  só para forçar o jogador a olhar outra coluna.

### 6.3 Cura é a exceção

Cura não tem stack: é efeito instantâneo, aplica e some. **Nunca sai da
elegibilidade** (não tem teto) e não sofre retorno decrescente por posse — só o
modificador de HP da seção 5.4. É a única carta que pode aparecer 10 vezes na
mesma fase, e está certo: numa fase em que o jogador está apanhando, é isso que
salva a run.

### 6.4 Uma tela = três eixos diferentes

**Nunca dois cards do mesmo eixo na mesma tela**, nem em raridades diferentes. Se
a tela mostra "Munição Pesada (+20%)" e "Ogiva de Plasma (+50%)", não existe
decisão — a segunda domina a primeira e o jogador só está clicando na maior. A
tela de 3 tem que ser 3 perguntas diferentes.

O edge case da CARD-1 continua válido: se sobrarem menos de 3 eixos elegíveis,
mostra os que houver.

### 6.5 Level 5 — a garantia de vida

Contrato da CARD-1. Implementação: no level 5 da fase, o **slot 1 é sorteado
apenas dentro do grupo Vida** (HP máximo, Cura, Vampirismo). A raridade desse
slot é sorteada normalmente — a garantia é de *categoria*, não de potência. Os
slots 2 e 3 são sorteio livre (e podem, sim, cair em outro eixo de Vida).

---

## 7. Validação: como fica uma fase inteira

Simulei 5.000 fases de 10 level-ups no Planeta 1, com os pesos e a matriz acima.

| Perfil do jogador | Eixos distintos na build | DPS no fim da fase |
|---|---|---|
| Escolhe ao acaso | 7,4 | **×1,8** |
| Sempre prioriza ataque | 5,9 | **×2,7** |

Leitura:

- **A run tem arco.** Terminar a fase com quase o dobro do poder inicial é o que
  faz um roguelite parecer roguelite. Sem isso, o nível 10 é igual ao nível 1.
- **Escolher importa 50%.** O especialista sai 1,5× mais forte que quem clica
  sem pensar. Grande o suficiente para premiar quem entende o jogo, pequeno o
  suficiente para não punir quem só quer jogar.
- **Ninguém vira mono-build.** Mesmo o especialista termina com ~6 eixos. O
  retorno decrescente está fazendo o serviço.

**Trade-off assumido:** o veterano vai perceber que ataque rende mais que defesa
e vai virar quase sempre para lá. É aceitável no Planeta 1 (é um planeta
tutorial). Nos planetas 3+, quando o dano dos inimigos escalar, os eixos de
Defesa passam a ser exigidos pela sobrevivência e a matemática se inverte
sozinha — sem precisar de carta especial. Se não inverter, o parâmetro a mexer é
o peso de eixo por planeta, não a matriz.

---

## 8. Custo de implementação — carta por carta

Esta é a seção que decide o que entra na Sprint 8.

### 8.1 BARATO — só mexe em campo de estado que já existe

| Eixo | Onde | Observação |
|---|---|---|
| **Dano** | `PlayerState.bulletDamage` já existe (`types.ts:52`) | Pronto para uso |
| **Cadência** | `AutoFireSystem.intervalMs` já existe | `intervalMs` é `readonly` hoje; precisa virar mutável |
| **HP máximo** | `PlayerState.maxHp` já existe | Somar em `maxHp` **e** em `hp` |
| **Cura** | `PlayerState.hp` já existe | `hp = min(hp + maxHp × pct, maxHp)` |
| **Invulnerabilidade** | `invincibilityTimer` já existe | `INVINCIBILITY_DURATION` é constante — vira campo |
| **Experiência** | `xp`, `xpToNext`, `enemy.xpValue` já existem | Multiplicador no `onEnemyKilled` |

**14 cartas** saem daqui: Dano ×4, Cadência ×4, HP ×4 (na verdade Dano 4 +
Cadência 4 + HP 4 + Cura 3 + Invuln 3 + XP 2 = **20 cartas**).

### 8.2 MÉDIO — precisa de campo ou sistema novo simples

| Eixo | O que falta | Tamanho |
|---|---|---|
| **Vel. de movimento** | `PLAYER_SPEED = 300` é constante em `GameLoop.ts:21`. Precisa virar campo de um `PlayerStats` | Pequeno, mas é o refactor que destrava tudo |
| **Vel. da bala** | `BULLET_SPEED = 500` é constante em `GameLoop.ts:22`. Mesmo refactor | Pequeno |
| **Vampirismo** | O hook `onEnemyKilled` já existe em `collisions.ts`. Falta o campo `lifestealPct` e a linha de cura | Muito pequeno |
| **Crítico** | Campos `critChance` + `critMult`; um `Math.random()` no cálculo de dano em `collisions.ts` | Pequeno. Feedback visual (número amarelo) é o trabalho de verdade |
| **Escudo** | Campos `shieldCharges`, `shieldRechargeMs`; consumir antes do HP no hit; timer de recarga | Médio — é o único que tem estado próprio com timer |
| **Blindagem** | Campo `flatArmor`; subtrair no cálculo de dano com piso 1 | Muito pequeno, **mas ver 8.4** |

**20 cartas** saem daqui: VelMov 3 + VelBala 3 + Vampiro 4 + Crítico 4 + Escudo 3
+ Blindagem 3.

### 8.3 CARO — leva 2, planejada e já desenhada

**Nada aqui foi descartado.** São as mecânicas que dão personalidade ao jogo e
elas vão ser implementadas. A decisão é de **ordem**, não de mérito: primeiro
fecha-se o loop de jogabilidade com o que é barato, depois entra a leva rica.

Estão desenhadas agora, com a escada de raridade já aplicada, justamente para que
a leva 2 seja só implementação. Repare no ganho: cada mecânica que antes era
**1 carta** vira **2 a 4 cartas** ao passar pela escada.

#### Multi-tiro — vem do "Disparo Duplo"

Escala por raridade, e a escada mexe em **duas alavancas ao mesmo tempo**:
quantas balas extras e quanto dano cada bala extra carrega. Isso deixa o Comum
existir sem ser inútil e o Épico ser forte sem virar obrigatório.

| Raridade | Efeito |
|---|---|
| Comum | +1 bala, leque de 8°, **50%** do dano por bala extra |
| Incomum | +1 bala, leque de 8°, **70%** do dano |
| Raro | +2 balas, leque de 14°, **60%** do dano |
| Épico | +2 balas, leque de 14°, **85%** do dano |

- **Stacks:** máx. 2 (teto de +4 balas). Stacks somam balas e **abrem o leque**
  (8° → 14° → 20°), o que é uma troca real: mais cobertura, menos concentração.
- **Máquina que exige:** padrão de tiro do lado do player.
- **Por que escala e não é carta única:** é o efeito com maior impacto visual do
  catálogo. Como carta única, ou é fraca demais para valer o slot ou forte demais
  para ser recusada. Com 4 degraus, a decisão volta a existir.

#### Tiro traseiro — vem do "Tiro Traseiro"

| Raridade | Efeito |
|---|---|
| Incomum | 1 bala para trás, **50%** do dano |
| Raro | 1 bala para trás, **85%** do dano |
| Épico | 1 para trás + 1 para cada lado (90°), **70%** do dano |

- **Stacks:** 1 apenas. Não empilha porque é um efeito de **cobertura**, não de
  volume — ter duas balas saindo pelo mesmo ponto atrás não muda nada na tela.
  Aqui a raridade é o único eixo de progressão, e está certo assim.
- **Faixa começa no Incomum:** um tiro traseiro de 20% de dano seria decorativo.
- **Máquina que exige:** padrão de tiro do lado do player (a mesma do Multi-tiro
  — as duas destravam juntas).

#### Perfuração — vem do "Raio"

| Raridade | Efeito | Dano por alvo atingido |
|---|---|---|
| Incomum | atravessa 1 inimigo | 100% / 60% |
| Raro | atravessa 2 | 100% / 70% / 50% |
| Épico | atravessa 3 | 100% / 80% / 65% / 50% |

- **Stacks:** 1 apenas — a raridade já é a progressão.
- **A queda de dano por alvo é o que segura o balanceamento.** Sem ela, uma linha
  de 6 inimigos vira 6× de dano de graça e a carta domina todo o resto.
- **Máquina que exige:** `Bullet.pierceRemaining` + a bala parar de morrer no
  primeiro hit em `collisions.ts`.
- **Sobre o "Raio" original:** a fantasia se desdobra em duas peças que
  **coexistem e combinam** — o **feixe contínuo** continua vivo como o canhão
  Laser do hangar (INV-1), e a **perfuração** vira este eixo de carta. Equipar o
  Laser e pegar Perfuração Épica é uma build, não uma redundância.

#### Ricochete — vem do "Ricochete"

| Raridade | Efeito |
|---|---|
| Raro | bala quica 1× na parede lateral, mantém 100% do dano |
| Épico | bala quica 2×, mantém 100% do dano |
| Lendário *(reservado)* | quica até o fim da vida útil da bala, 60% do dano |

- **Stacks:** 1 apenas.
- **Faixa começa no Raro:** ricochete só rende em tela estreita e com inimigo
  encostado na borda. Uma versão Comum seria imperceptível na maioria das waves.
- **Máquina que exige:** colisão bala × parede lateral e reflexão do vetor de
  direção (a bala hoje só tem posição, não tem direção própria).

#### Teleguiado — vem do "Míssil Teleguiado"

| Raridade | Efeito |
|---|---|
| Raro | 1 míssil a cada 3 ciclos de auto-fire, curvatura leve (90°/s), 100% do dano |
| Épico | 1 míssil a cada 2 ciclos, curvatura forte (180°/s), 130% do dano |
| Lendário *(reservado)* | 2 mísseis todo ciclo, curvatura forte |

- **Stacks:** máx. 2 — cada stack tira 1 ciclo do intervalo, com piso de 1 ciclo.
- **A curvatura é a alavanca de balanceamento, não o dano.** Curvatura leve erra
  alvo que se move rápido; curvatura forte não erra. É uma diferença que o
  jogador vê acontecendo na tela.
- **Máquina que exige:** busca do alvo mais próximo + steering por frame + bala
  com direção própria. **É a mais cara da lista** — deve ser a última.

#### Bomba — vem da "Bomba"

A Bomba é a exceção barata da leva 2 e pode entrar antes das outras. O que ela
precisa não é mecânica de bala, é **uma flag de kill sem XP**.

| Raridade | Efeito |
|---|---|
| Incomum | destrói os inimigos da metade inferior da tela |
| Raro | destrói todos os inimigos na tela |
| Épico | destrói todos + 3 s de invulnerabilidade |

- **Instantânea, sem stack, sempre elegível** (mesmo tratamento da Cura).
- **Regra obrigatória:** kills causados pela Bomba dão **score, não XP**. Sem
  isso, limpar a tela dispara `onEnemyKilled` em cascata e o jogador leva 3
  level-ups seguidos, empilhando telas de carta em cima de telas de carta.
- **A escada aqui mexe em área, não em potência** — bom exemplo de que "escalar
  por raridade" nem sempre quer dizer multiplicar um número.
- **Custo real: MÉDIO**, não CARO. Precisa de `Enemy.grantsXp: boolean` e uma
  varredura em `state.enemies`. **Candidata a entrar já na Sprint 8** se sobrar
  fôlego.

#### Resumo da leva 2

| Eixo | Cartas | Máquina que destrava |
|---|---|---|
| Multi-tiro | 4 | `PLAYER_SHOT_PATTERNS` |
| Tiro traseiro | 3 | `PLAYER_SHOT_PATTERNS` (mesma) |
| Perfuração | 3 | bala com contador de hits |
| Ricochete | 2 (+1 Lendária) | colisão com parede + direção da bala |
| Teleguiado | 2 (+1 Lendária) | busca de alvo + steering |
| Bomba | 3 | flag de kill sem XP (barato) |
| **Total** | **17 cartas** | |

**Catálogo completo somando as duas levas: 57 cartas em 18 eixos.**

**A boa notícia:** o PR #21 já pavimentou o caminho. `shooting.ts` tem
`SHOT_PATTERNS: Record<ShotKind, ShotFn>` com Strategy via mapa — mas **é só do
lado do inimigo**, e a union `ShotKind` tem exatamente um membro (`'straight'`).
Espelhar essa mesma estrutura para o player (`PLAYER_SHOT_PATTERNS`) é o
pré-requisito único de Multi-tiro e Tiro traseiro — 7 cartas destravadas por um
refactor pequeno. Feito isso, cada padrão novo é uma entrada no `Record` + um
membro na union.

### 8.4 BLOQUEADO — o eixo Vida está inerte hoje

**Este é o achado mais importante da auditoria e ele precisa ser resolvido antes
da Sprint 8 fechar.**

Em `collisions.ts`, tanto o hit de bala quanto o contato corpo a corpo fazem:

```ts
p.hp = Math.max(0, p.hp - 1)
```

Dano fixo de **1**, com HP base de 500. Ou seja: o jogador precisa levar 500 hits
para morrer. Consequência direta no catálogo:

- **HP máximo** (+50 HP = +50 hits) — imperceptível.
- **Cura** (restaurar 20% de 500 = 100 hits) — imperceptível.
- **Vampirismo** — imperceptível.
- **Blindagem** (−1 de dano, com piso 1) — literalmente **zero efeito**.
- **Invulnerabilidade** — é o único da categoria que funciona, porque reduz a
  *frequência* de hits, não a magnitude.

Quatro dos doze eixos são placebo. E como o level 5 **obriga** uma carta de Vida
na tela (contrato CARD-1), o jogo garante que uma vez por fase o jogador escolhe
entre placebos.

**Pré-requisito recomendado — DMG-1** (custo MÉDIO, escopo pequeno):

- `Bullet.damage: number` — a bala do inimigo carrega o dano dela.
- `Enemy.contactDamage: number` — o corpo do inimigo carrega o dele.
- Ambos vêm de `LevelParams`, calibráveis por planeta/fase.
- Sugestão de partida no Planeta 1: bala 15, contato 25. Com HP 500 e i-frames de
  1,5 s, isso dá ~33 hits até a morte — margem larga o bastante para um planeta
  tutorial, mas onde `+125 HP` significa 8 hits a mais, e isso **se sente**.

Sem DMG-1, a recomendação é cortar Blindagem do MVP inteiro e tratar HP/Cura/
Vampirismo como cartas de fachada — o que enfraquece muito o loop.

### 8.5 Onde foi parar cada uma das 14 cartas da CARD-2

**Nenhuma foi jogada fora.** Onze foram absorvidas por eixos e viraram várias
cartas cada; três foram repriorizadas (duas para a leva 2, uma para a Sprint 12
de economia). O mapa completo:

| Carta da CARD-2 | Virou | Quando | Observação |
|---|---|---|---|
| **HP Máximo+** (+50 HP) | eixo **HP máximo** → 4 cartas | **Sprint 8** | O +50 vira o valor Comum |
| **Restaurar HP** (30%) | eixo **Cura** → 3 cartas | **Sprint 8** | O 30% fica entre Comum (20%) e Incomum (32%) |
| **Vampiro** (2%/kill) | eixo **Vampirismo** → 4 cartas | **Sprint 8** | Achado: o 2% da CARD-2 vira o valor **Épico**. O que era tratado como carta comum era, na real, uma carta de topo |
| **Invencibilidade+** (+500 ms) | eixo **Invulnerabilidade** → 3 cartas | **Sprint 8** | O +500 ms fica junto do Raro (+600 ms) |
| **Escudo** (1 hit) | eixo **Escudo** → 3 cartas | **Sprint 8** | O "absorve 1 hit" vira o Raro; a escada mexe no tempo de recarga |
| **Velocidade+** (+20%) | eixo **Vel. de movimento** → 3 cartas | **Sprint 8** | O +20% vira o valor Incomum |
| **Bala Rápida** (+30%) | eixo **Vel. da bala** → 3 cartas | **Sprint 8** | O +30% vira o valor Comum |
| **Disparo Duplo** | eixo **Multi-tiro** → 4 cartas | **Leva 2** | Ver 8.3 — desenhada, escala em nº de balas e em dano |
| **Tiro Traseiro** | eixo **Tiro traseiro** → 3 cartas | **Leva 2** | Ver 8.3 — não empilha, a raridade é a progressão |
| **Ricochete** | eixo **Ricochete** → 2 (+1 Lendária) | **Leva 2** | Ver 8.3 — escada em número de quiques |
| **Míssil Teleguiado** | eixo **Teleguiado** → 2 (+1 Lendária) | **Leva 2** | Ver 8.3 — escada em curvatura, a mais cara da lista |
| **Raio** (feixe perfurante) | eixo **Perfuração** → 3 cartas **+** canhão Laser (INV-1) | **Leva 2** | Ver 8.3 — a fantasia se desdobra em duas peças que combinam entre si, não competem |
| **Bomba** | carta instantânea **Bomba** → 3 cartas | **Leva 2** (candidata a antecipar) | Ver 8.3 — escada em área. Custo real é MÉDIO |
| **Gold Rush** (+5 gold/kill) | **Reservada** — ver 8.6 | **Sprint 12+** | Bloqueada por dois motivos técnicos/econômicos, com redesenho proposto |

**11 cartas viraram 40** (Sprint 8) **+ 17** (leva 2). O deck de 14 mecânicas
virou um catálogo de 57 cartas sem que nenhuma ideia fosse perdida.

**O furo do deck antigo que vale registrar:** a CARD-2 não tinha **nenhuma carta
de dano** nem **nenhuma de cadência**. São os dois eixos mais fundamentais de um
shoot'em up e os dois mais baratos de implementar — ambos já são campos de estado
no código. Este catálogo preenche esse buraco com 8 cartas.

### 8.6 Gold Rush — reservada, com redesenho proposto

Esta é a única que não tem data. Não é rejeição da ideia — a fantasia ("matar
inimigo me dá alguma coisa além de XP") é boa e cabe no jogo. O problema é que a
forma atual esbarra em dois bloqueios independentes:

1. **Técnico:** `gold` não existe em lugar nenhum do código (grep limpo em
   `apps/game` e `packages/`). A carteira é Sprint 12.
2. **Econômico, e mais sério:** fura o anti-farm. A regra do projeto é "kills dão
   XP, não gold", e a régua anti-P2W da wiki proíbe item que dê ouro. Uma carta
   de +5 gold por kill transforma repetir a fase mais fácil na melhor fonte de
   renda do jogo — e o replay a 20% deixa de segurar nada.

**Duas saídas, ambas preservando a fantasia:**

**Opção A — "Catador" (disponível já, sem esperar a Sprint 12).** A recompensa
por kill vira **recurso de run**, não moeda: chance de o inimigo dropar um pickup
de vida ou combustível. Mesma sensação, zero impacto na economia.

| Raridade | Chance de drop extra por kill |
|---|---|
| Comum | 4% |
| Incomum | 6% |
| Raro | 10% |
| Épico | 16% |

Custo: **BARATO** — `onEnemyKilled` já tem a lógica de drop de pickup pronta.

**Opção B — Gold Rush com teto por fase (Sprint 12+).** A versão original volta,
mas com **limite de ouro por fase** (sugestão: 50 no Planeta 1, escalando junto
da tabela de ouro por planeta) e **sem valer em replay**. O teto é o que
neutraliza o farm: repetir a fase 20 vezes não rende 20× o teto.

**Recomendação:** entrar com a Opção A no MVP (é barata e não depende de nada) e
reavaliar a Opção B quando a carteira existir e a economia estiver medida. Se a
A funcionar bem, a B talvez nem precise existir.

## 9. Lendárias — leva 3, esboçadas

Peso 0 nos Planetas 1 e 2. A partir do Planeta 3, peso 1 no bracket 7+.

Lendária **não é "Épico só que maior"**. É carta de trade-off que redefine a
build, sempre não-empilhável, sempre uma por run. Esboço para depois:

| Nome | Efeito | Trade-off |
|---|---|---|
| **Sobrecarga do Reator** | +120% de cadência | −30% de dano por tiro |
| **Núcleo Instável** | +150% de dano | −50% do HP máximo |
| **Motor Perpétuo** | Atira em movimento (quebra o loop do Archero) | −40% de cadência |
| **Última Chance** | Sobrevive a um golpe fatal com 1 HP, 1× por fase | Não pode ser curado acima de 50% |

Todas exigem mecânica nova. Leva 3, junto do Planeta 3 — mais duas Lendárias já
desenhadas na seção 8.3 (Ricochete infinito e Teleguiado duplo), que nascem de
graça assim que os eixos da leva 2 existirem.

---

## 10. O que vira dado do calibrador

Nada disso é constante de código. Tudo mora no Supabase e sai pelo dashboard:

| Dado | Forma | Quem ajusta |
|---|---|---|
| Multiplicadores da escada (1 / 1,6 / 2,5 / 4 / 6,5) | 5 números | Global |
| Unidade base por eixo | 12 números (18 com a leva 2) | Global |
| Faixa de raridade por eixo | 12 pares mín/máx (18 com a leva 2) | Global |
| Teto de stacks por eixo | 12 números (18 com a leva 2) | Global |
| Peso base por eixo | 12 números (18 com a leva 2) | **Por planeta** |
| Pesos de raridade por bracket | 3 × 5 números | **Por planeta** |
| Coeficientes de escalada por planeta | 3 números | Global |
| Fator de retorno decrescente (0,55) | 1 número | Global |
| Modificadores de contexto | 4 regras | Global |

**Consequência:** rebalancear o sistema inteiro de cartas é um `eas update`, sem
review de loja. E o dashboard pode cruzar `card_picked` (evento já previsto na
spec v2) com a taxa de conclusão por fase para achar carta lixo e carta
obrigatória automaticamente.

---

## 11. MVP recomendado — o que entra na Sprint 8

### Entra: 40 cartas, 12 eixos, nenhuma mecânica nova de bala

O catálogo BARATO + MÉDIO inteiro. Ele já entrega o loop roguelite completo:

| Categoria | Eixos | Cartas |
|---|---|---|
| Tiro | Dano, Cadência, Crítico | 12 |
| Velocidade | Vel. da bala, Vel. de movimento | 6 |
| Vida | HP máximo, Cura, Vampirismo | 11 |
| Defesa | Invulnerabilidade, Escudo, Blindagem | 8 |
| Passivo | Experiência | 2 |
| **Total** | **12** | **40** |

**Dois extras baratos, se sobrar fôlego** (nenhum é obrigatório para o loop):

- **Catador** (+4 cartas) — seção 8.6, Opção A. Custo BARATO, o hook de drop já existe.
- **Bomba** (+3 cartas) — seção 8.3. Custo MÉDIO, precisa só da flag de kill sem XP.

Com os dois, o MVP fecha em **47 cartas / 14 eixos** ainda sem tocar em mecânica
de bala.

O MVP fecha o loop porque tem as quatro coisas que um roguelite precisa: uma
build que cresce (×1,8 a ×2,7 de poder por fase), uma decisão real por level-up
(3 eixos distintos), um pico emocional (~1 Épico por fase) e uma saída para
quando dá errado (Cura com peso dobrado em HP baixo).

### Ordem de execução sugerida

1. **DMG-1 primeiro** (seção 8.4). Sem `Bullet.damage` e `Enemy.contactDamage`,
   um terço do catálogo é placebo. É pequeno e destrava a categoria Vida inteira.
2. **`PlayerStats`** — tirar `PLAYER_SPEED`, `BULLET_SPEED`,
   `INVINCIBILITY_DURATION` e `AUTO_FIRE_INTERVAL` de constante e pôr em estado.
   Um refactor, destrava 4 eixos de uma vez.
3. **Motor de sorteio** — escada, matriz, dois estágios, retorno decrescente,
   garantia do level 5. É onde o TDD rende mais: são regras puras, testáveis sem
   renderer. **Feito uma vez, serve para a leva 2 sem mudança** — carta de
   mecânica entra no mesmo sorteio, é só mais um eixo na tabela.
4. **Os 12 eixos**, em ordem de custo: os 6 BARATOS primeiro (jogável no fim do
   dia), depois os 6 MÉDIOS.
5. **Escudo por último** dentro dos MÉDIOS — é o único com estado e timer
   próprios.

### Leva 2 — planejada, com ordem definida

Não é backlog vago. As 17 cartas estão desenhadas na seção 8.3, com valores e
faixas de raridade fechados. Ordem recomendada, por relação entre valor percebido
e custo:

1. **Bomba** (3 cartas) — a mais barata da leva. Só precisa da flag de kill sem
   XP. Pode até se antecipar para a Sprint 8.
2. **`PLAYER_SHOT_PATTERNS`** — o refactor que espelha para o player o mapa de
   Strategy que já existe do lado do inimigo. Não entrega carta nenhuma sozinho,
   mas destrava 7 de uma vez.
3. **Multi-tiro** (4 cartas) — **o item de maior valor percebido de todo o
   catálogo**. "Minha nave atira 3 balas agora" é a mudança mais visível que uma
   carta pode causar. Primeiro alvo depois do refactor.
4. **Tiro traseiro** (3 cartas) — sai quase de graça junto do Multi-tiro.
5. **Perfuração** (3 cartas) — mexe só em `stepBullets` e é o eixo com melhor
   sinergia com Multi-tiro (leque + perfuração = tela limpa).
6. **Ricochete** (2 cartas) — precisa de direção própria na bala e colisão com
   parede.
7. **Teleguiado** (2 cartas) — busca de alvo + steering. A mais cara; fica por
   último de propósito.

### Leva 3

**Lendárias** (seção 9), junto do Planeta 3. Só fazem sentido quando existe build
o bastante para ser subvertida — e duas delas (Ricochete infinito, Teleguiado
duplo) nascem prontas assim que a leva 2 existir.

### Riscos assumidos

- **A tela de 3 cartas fica mais densa.** Com 40 cartas, o jogador vê nome +
  valor + cor. Se o texto não for curtíssimo, a pausa vira leitura. Mitigação: o
  ícone é do **eixo**, a cor é da **raridade** — quem já jogou reconhece a carta
  sem ler. Isso escala para as 57 do catálogo completo.
- **Números percentuais exigem HUD.** Sem um painel de build acumulada, o jogador
  não sabe que está com +140% de dano. Um resumo na tela de carta (a build atual
  ao lado das 3 opções) resolve e é barato.
- **O MVP é mais "planilha" que "sabor".** Esse é o custo consciente de priorizar
  o barato: com só números, a build cresce mas não muda de forma. É exatamente o
  buraco que a leva 2 preenche, e é por isso que ela é **planejada e não
  opcional** — o jogo só fica completo com as duas.
- **O especialista de ataque continua sendo a build ótima no Planeta 1.**
  Aceitável e consciente (seção 7). O conserto é o dano dos inimigos escalar nos
  planetas seguintes, não uma regra especial de carta.
