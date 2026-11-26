# Janela compacta padrão + atualização automática (0.4.1)

Aprovado pelo Daniel em 2026-11-26 ("vamos criar uma nova tela de tamanho reduzido padrão" / "se atualizamos o projeto ele atualiza pra ele mudando o número da versão").

## Por quê
Num notebook Full HD com zoom de 150% a área útil é ~1280 × 672 (pixels lógicos). O app abria com 1280 × 800 (cortado embaixo) e em Configurações só "Livre" cabia (o menor fixo era 1280 × 720). E a atualização exigia clique em "Atualizar agora"; o pedido é que a versão publicada chegue sozinha.

## Decisões
- **Tamanho ao abrir:** 1120 × 630 (era 1280 × 800), centralizado. Largura > 1100 para não cair no layout de menu só com ícones.
- **Novo tamanho fixo "1120 × 630 — Compacta"**, primeiro depois de "Livre". Cabe em 1280 × 672.
- **Mínimo da janela:** 900 × 520 (era 960 × 600), pra caber em 1366 × 768 com zoom de 125% (~1093 × 576 úteis).
- **Encaixe ao abrir:** em "Livre", se 1120 × 630 (+ barra de título) não couber na área útil, a janela diminui até caber (nunca abaixo do mínimo) e centraliza.
- **Atualização:**
  - Ao abrir, se achar versão nova, baixa, instala e reabre sozinho (a barra mostra "Baixando atualização N%" / "Reiniciando…"). Ao abrir ninguém está no meio de um comando.
  - Com o app aberto, procura de novo a cada 1 hora, em silêncio; se achar, só mostra o botão "Atualizar agora" (não reinicia na cara do técnico).
  - Falha na instalação automática: mostra o botão (estado `available`) pra tentar na mão; não trava o app.
- Publicar = subir a versão (package.json, tauri.conf.json, Cargo.toml) e rodar `scripts/publicar-versao.mjs`. Os apps instalados (≥ 0.3.0) pegam sozinhos.

## Fora do escopo
Zoom/escala da interface; lembrar posição/tamanho da janela entre aberturas.

## Abordagens consideradas
- Fixo "Compacta" como padrão (trava a janela): descartado, monitor grande ficaria preso pequeno.
- Janela invisível até medir a tela: descartado, risco de o app não aparecer se algo falhar no JS.
- Escolhido: tamanho inicial menor + encaixe na tela + opção fixa Compacta.
