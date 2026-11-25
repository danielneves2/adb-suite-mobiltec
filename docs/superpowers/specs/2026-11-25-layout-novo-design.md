# Layout novo — "Industrial Retro-Tech"

**Data:** 2026-11-25 · **Status:** aprovado pelo usuário ("faz do jeito que você sabe que é melhor; o que mandei é referência").

Referências do usuário: `novo/referencia tela.png` (layout), `novo/e576bf05-….png` (arte do Android, PNG com transparência) e o texto de direção visual colado na conversa (paleta, tipografia e o que muda por região).

## Por quê
O app funciona, mas a cara atual (Space Mono em tudo, neon, cantos retos, bordas de 2 px) parece protótipo. O time quer uma ferramenta com aparência de software proprietário premium para suporte, homologação e diagnóstico Android, sem perder a identidade: colchetes laranja, `>>_`, barras roxas, Android pontilhado e a estética retrofuturista.

## Objetivos
- Superfícies neutras em ~90% da tela; roxo (~7%) e laranja (~3%) só em detalhes estratégicos. Os indicadores de status ficam fora dessa conta.
- Hierarquia clara: Inter na interface, JetBrains Mono em dados técnicos (comandos, logs, serial), fonte "pixel/retro" só na marca.
- Uma tela inicial útil ("Visão geral do dispositivo") quando nenhum comando está aberto.
- Novo ícone do app e favicon: terminal `[>>_]` com borda roxa e setas e traço laranja.

## Não-objetivos
- Mudar o comportamento dos comandos, a execução ou o catálogo.
- Login e perfil de usuário (etapa 4). O canto do perfil no print fica de fora.
- Tela de Configurações e "Scripts". Não aparecem até existirem.

## Anti-objetivos
- Não pode virar "mais um app genérico": a marca e o terminal continuam com personalidade.
- Não pode piorar a velocidade de uso: qualquer comando continua a 1 clique a partir do menu.
- Não pode depender de internet: as fontes e as imagens são locais.

## Abordagens consideradas (menu lateral)
- **A — menu de categorias com visual novo (escolhida).** Ícone e nome, no estilo do print, com "Início" no topo no lugar de "Fixados". Mantém 1 clique até qualquer comando e não cria seções vazias.
- B — menu de seções igual ao print (Início, Comandos, Scripts, Logs, Dispositivos, Arquivos, Configurações), com as categorias virando filtros dentro de "Comandos". É mais fiel ao print, mas cria seções sem conteúdo e põe 2 cliques até o comando.

O usuário delegou a escolha; foi a A.

## Sistema visual
**Cores (tokens em `src/styles/tokens.css`):**

| Uso | Hex |
|---|---|
| fundo principal | `#000000` |
| painéis e menus | `#0D0D0D` |
| cards e componentes | `#151515` |
| hover / selecionado | `#1C1C1C` |
| bordas e divisores | `#252525` |
| roxo institucional | `#790A5C` |
| roxo claro (ícone ativo, `//`) | `#C0339A` |
| laranja de destaque | `#FF8800` |
| texto principal | `#F2F2F2` |
| texto secundário | `#929299` |
| status conectado | `#00C982` |
| status de alerta | `#FFB020` |
| status de erro | `#FF5C5C` |

**Forma:**
- Bordas de 1 px, quase sempre `#252525`.
- Cantos de 4 px em botões, campos e chips; 6 px em cards e painéis.
- Sem brilho e sem sombra colorida.

**Tipografia:**

| Papel | Fonte |
|---|---|
| Interface | Inter 400/500/600/700, 13 px base |
| Técnica | JetBrains Mono 400/600: comandos, saída, serial, log de atividade, caminhos |
| Marca | Space Mono 700, a fonte atual, usada só no logotipo |

O VT323 sai do app.

**Assinaturas:**
- `//` roxo antes dos títulos de seção.
- `[ ]` laranja em volta do logotipo.
- `///` roxo depois da marca.
- Grade retrô de fundo com opacidade muito baixa só no card da visão geral.

## Regiões
1. **Barra superior (compacta, 56 px):**
   - À esquerda, o ícone `>>_` e `[ ADB SUITE / M O B I L T E C ]` com `///`.
   - Depois, o seletor de aparelho em lista suspensa. O botão mostra o ícone de celular, uma bolinha de status (verde conectado, amarela não autorizado, vermelha offline), "Marca Modelo" e "Android N · SERIAL", mais uma seta. A lista mostra todos os aparelhos.
   - À direita, "Diagnosticar conexão" (secundário) e "Coletar diagnóstico" (primário, roxo sólido).
   - Embaixo, uma linha laranja de 1 px.
2. **Menu lateral (200 px):**
   - Ícone e nome, com "Início" no topo (antes "Fixados"), depois as categorias e "Meus comandos".
   - O item ativo tem fundo `#151515`, barra roxa de 2 px à esquerda e ícone roxo claro.
   - Abaixo de 1100 px de largura, mostra só os ícones, com tooltip.
3. **Lista de comandos:**
   - Título de seção `// COMANDOS FIXADOS 05` (ou o nome da categoria).
   - Busca com ícone e o atalho `Ctrl K`. Ctrl+K foca a busca em qualquer lugar do app.
   - Itens compactos: ícone da categoria, nome (Inter 600) e categoria (secundária), estrela à direita (fixar/desfixar; laranja quando fixado), `[!]` em comando com confirmação e `LOCAL` em comando seu.
   - Separadores discretos. Só o selecionado ganha card com borda.
   - "+ Novo comando" continua no rodapé.
4. **Área principal sem comando (tela "Início"):** "Visão geral do dispositivo".
   - Cabeçalho com selo de status: "Conectado (ADB)", "Não autorizado" ou "Sem aparelho".
   - Card do aparelho:
     - nome grande;
     - serial em mono com botão copiar;
     - 4 blocos: Sistema operacional, Número de série, Status ADB, Transporte (USB, ou Wi-Fi quando o serial é `IP:porta`);
     - a arte do Android à direita, com brilho reduzido (opacidade ~0,6) e escondida em telas estreitas.
   - "Ações rápidas": Diagnosticar conexão, Coletar diagnóstico, Informações do aparelho, Arquivos coletados (abre a pasta).
   - "Última atividade": eventos reais da sessão em mono:
     - `[hh:mm:ss] [ADB] Aparelho conectado: …`, também desconectado e não autorizado;
     - `[CMD] Nome — concluído em 0,6 s`;
     - `[ERRO] Nome — <motivo>`.
   - Sem aparelho, o card vira o passo a passo para conectar.
   - Clicar em "Início" fecha o comando aberto e volta para essa tela.
5. **Área principal com comando:** o mesmo conteúdo de hoje, com o visual novo.
   - Terminais (comando, comando livre, saída) em JetBrains Mono.
   - Comando e `$` em laranja; saída em cinza claro `#D4D4D8`, para não espalhar laranja.
6. **Barra inferior, estilo status bar de IDE (28 px):**
   - "● N dispositivo(s) conectado(s)" | aparelho | Android N | "ADB: OK" (ou "ADB: erro") | espaço | mensagem temporária | "Pasta de saída: <caminho>" com Alterar e Abrir.

## Ícone e favicon
SVG próprio (`assets/icone-app.svg`): quadrado arredondado com fundo `#0D0D0D`, borda roxa, `>>` e `_` em laranja `#FF8800`. Ele gera:
- os ícones do Tauri (`tauri icon`);
- o favicon (`public/favicon.svg`);
- o ícone da barra superior.

## O que fica com quem implementa
Tamanhos finos de espaçamento, os ícones de linha de cada região e o comportamento em telas estreitas, seguindo os tokens acima.
