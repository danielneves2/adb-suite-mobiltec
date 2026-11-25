# Visual – ADB Suite ("Industrial Retro-Tech")

Ferramenta de engenharia com personalidade de terminal retrofuturista. A proporção fica em ~90% neutro, ~7% roxo e ~3% laranja; os indicadores de status não entram nessa conta. Detalhes em `docs/superpowers/specs/2026-11-25-layout-novo-design.md`.

## Cores (`src/styles/tokens.css`)
| Token | Hex | Uso |
|---|---|---|
| `--fundo` | `#000000` | fundo principal |
| `--painel` | `#0D0D0D` | topo, menu, lista, barra de status |
| `--card` | `#151515` | cards, botões secundários, campos |
| `--card-hover` | `#1C1C1C` | hover e item selecionado |
| `--divisor` | `#252525` | bordas e divisores (1 px) |
| `--roxo` | `#790A5C` | roxo institucional: botão primário, barra do item ativo, selos |
| `--roxo-claro` | `#C0339A` | `//` dos títulos, ícone ativo, `[!]` |
| `--laranja` | `#FF8800` | colchetes da marca, `>>_`, estrela fixada, texto do comando, linha do topo |
| `--texto` | `#F2F2F2` | texto principal |
| `--texto-2` | `#929299` | texto secundário, rótulos |
| `--saida` | `#D4D4D8` | texto da saída dos comandos |
| `--ok` / `--alerta` / `--erro` | `#00C982` / `#FFB020` / `#FF5C5C` | status |

## Tipografia
- **Interface**: Inter (400–700), 13 px base, títulos 20–22 px em 600.
- **Técnica**: JetBrains Mono (400/600), para comandos, saída, serial, caminhos e o log de atividade.
- **Marca**: JetBrains Mono 700 (ADB SUITE) e 400 bem espaçada (M O B I L T E C), entre colchetes laranja finos desenhados em CSS (2 px).
- Todas as fontes são locais (@fontsource) e funcionam offline.

## Forma
- Bordas de 1 px (`--divisor`).
- Cantos de 4 px em controles e 6 px em cards e painéis.
- Sem brilho, sem sombra colorida e sem neon.
- A arte do Android (`assets/android-neon.png`) aparece só na visão geral, encaixada à direita do card do aparelho.

## Assinaturas
- `//` roxo antes dos títulos de seção (`.secao-titulo`).
- `[ ]` laranja em volta do logotipo e `///` roxo depois dele.
- Ícone do app `[>>_]` (`assets/icone-app.svg`).
- Grade retrô com opacidade muito baixa no card da visão geral.

## Layout
- **Topo** (56 px): marca, seletor de aparelho e ações, com uma linha laranja de 1 px embaixo.
- **Faixa central**: menu lateral (200 px, só ícones abaixo de 1100 px), lista de comandos (~300 px) e área principal fluida.
- **Barra de status** (28 px), no estilo de IDE.
