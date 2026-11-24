# Visual – ADB Suite

Estilo: retrô de terminal, compacto, escuro. Cantos retos (radius 0), bordas simples de 1–2 px, **sem** sombras deslocadas, faixas listradas ou linhas duplicadas.

## Tipografia
- Interface: **Space Mono** (400/700), 12 px base; títulos 20 px bold; rótulos 10 px bold, caixa alta, `letter-spacing: .08em`.
- Terminal (comando, comando livre, saída): **VT323**, 18–19 px.

## Cores
| Token | Hex | Uso |
|---|---|---|
| bg | `#131215` | fundo principal |
| bg-topo | `#0E0D10` | topo |
| bg-lista | `#111013` | coluna da lista |
| bg-rail / status | `#0B0A0D` | barra de ícones e rodapé |
| superfície | `#1F1D22` | botões secundários |
| superfície-selecionada | `#2E2B33` | item/aparelho selecionado |
| campo | `#0A090C` | inputs |
| terminal | `#070609` | painel de saída, caixa do comando |
| barra do terminal | `#211F25` | cabeçalho SAIDA.LOG |
| borda | `#322F37` / `#403C46` | bordas de botão / campo |
| texto | `#EDEAEE` | texto principal |
| texto-2 | `#B9B3BD` / `#ADA7B2` / `#A9A4AE` | resumo, secundário, rótulos |
| **roxo (marca, versão forte)** | `#7B0A5D` | botões primários, categoria ativa, linha do topo, "Copiar pro chamado", opção selecionada (texto branco) |
| roxo-claro | `#EA86CF` | marcadores pequenos: bolinha do aparelho, `[!]`, estrela de fixado |
| roxo-fundo | `#2A0921` | faixa de confirmação, opção selecionada |
| roxo-texto | `#F8D8F0` | texto sobre roxo-fundo |
| **laranja terminal** | `#C85F00` | texto do comando, `$`, "executando…" |
| laranja saída | `#E0832A` | texto da saída |

Logo original: roxo `#7E2065`, laranja `#F37804` (`assets/logo-mobiltec.png`).

## Layout
Topo (1 linha, 3 px de borda inferior roxa) → linha com barra de ícones (72 px) + lista (220–250 px) + área principal (fluida) → barra de status. Tudo quebra em coluna em telas estreitas.
