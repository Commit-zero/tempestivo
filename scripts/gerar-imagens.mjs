// Gera as imagens da marca a partir do símbolo em SVG: ícones do app, ícone da Apple,
// ícones do manifesto (inclusive o mascarável) e a imagem de compartilhamento (Open Graph).
// Usa o navegador do Playwright, já instalado para os testes de tela; não há dependência nova.
//
//   pnpm imagens                          (Chromium do Playwright)
//   PLAYWRIGHT_CHANNEL=msedge pnpm imagens (navegador instalado na máquina)
//
// As imagens geradas são versionadas. Rode de novo só quando a marca mudar.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const simbolo = readFileSync(resolve(raiz, "src/app/icon.svg"), "utf-8").replace(/<title>.*?<\/title>/, "");
const CARIMBO = "#4136A8";
// O mesmo exemplo da capa (I intimação, F sem expediente, M meta, V vencimento);
// src/test/marca.test.ts confere esta linha contra os dados da faixa.
const FAIXA = "I 1 F F 2 3 4 5 F F F 6 7 8 9 10 F F 11 12 13M 14 15V";

// O símbolo sem o fundo arredondado, para os ícones de fundo inteiro (Apple e mascarável).
const simboloSemFundo = simbolo.replace(/<rect width="64" height="64" rx="14" fill="#4136A8"\/>/, "");

function paginaDeIcone(tamanho, { fundoInteiro, zonaSegura = 1 }) {
  const svg = fundoInteiro ? simboloSemFundo : simbolo;
  const lado = Math.round(tamanho * zonaSegura);
  return `<!doctype html><html><body style="margin:0;width:${tamanho}px;height:${tamanho}px;display:grid;place-items:center;background:${fundoInteiro ? CARIMBO : "transparent"}">
    <div style="width:${lado}px;height:${lado}px">${svg.replace("<svg ", `<svg width="${lado}" height="${lado}" `)}</div></body></html>`;
}

function celulaDaFaixa(codigo) {
  const classe = codigo === "I" ? "inicio" : codigo === "F" ? "fora" : codigo.endsWith("M") ? "meta" : codigo.endsWith("V") ? "fim" : "";
  const texto = codigo === "I" ? "•" : codigo === "F" ? "–" : parseInt(codigo, 10);
  return `<li class="${classe}">${texto}</li>`;
}

const paginaDeCompartilhamento = `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 1200px; height: 630px; background: #F4F6FA; font-family: Archivo, system-ui, sans-serif; color: #122240;
         display: flex; flex-direction: column; justify-content: space-between; padding: 64px 72px; }
  .marca { display: flex; align-items: center; gap: 16px; font-weight: 700; font-size: 40px; font-stretch: 112%; }
  .marca svg { width: 64px; height: 64px; }
  h1 { font-size: 62px; line-height: 1.06; font-weight: 800; font-stretch: 118%; letter-spacing: -0.02em; max-width: 19ch; }
  .cartao { background: #fff; border-top: 8px solid ${CARIMBO}; border-radius: 10px; padding: 24px 24px 20px; display: grid; gap: 18px; }
  ol { list-style: none; display: grid; grid-template-columns: repeat(23, 1fr); gap: 5px; }
  li { height: 62px; display: grid; place-items: center; border: 2px solid #D3D9E5; border-radius: 6px; font-size: 25px; font-weight: 700; font-stretch: 75%; }
  li.fora { border-style: dashed; color: #4C5A74; background: repeating-linear-gradient(135deg, transparent 0 5px, #D3D9E5 5px 7px); }
  li.inicio { border-color: #122240; }
  li.meta { border-color: #8A5200; color: #8A5200; }
  li.fim { background: ${CARIMBO}; border-color: ${CARIMBO}; color: #fff; }
  .rodape { display: flex; gap: 32px; font-size: 23px; }
  .rodape b { font-weight: 700; } .meta-texto { color: #8A5200; font-weight: 600; } .aux { color: #4C5A74; margin-left: auto; }
</style></head><body>
  <div class="marca">${simbolo}Tempestivo</div>
  <h1>Nunca perca um prazo e receba seus honorários.</h1>
  <div class="cartao">
    <ol>${FAIXA.split(" ").map(celulaDaFaixa).join("")}</ol>
    <div class="rodape"><b>Vence em 04/12/2026</b><span class="meta-texto">Meta interna: 02/12/2026</span><span class="aux">Exemplo fictício. Cálculo auxiliar, confira.</span></div>
  </div>
</body></html>`;

/** ICO com imagens PNG embutidas (formato aceito por todos os navegadores atuais). */
function montarIco(pngs) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(pngs.length, 4);
  let deslocamento = 6 + 16 * pngs.length;
  const entradas = pngs.map(({ tamanho, dados }) => {
    const entrada = Buffer.alloc(16);
    entrada.writeUInt8(tamanho >= 256 ? 0 : tamanho, 0);
    entrada.writeUInt8(tamanho >= 256 ? 0 : tamanho, 1);
    entrada.writeUInt16LE(1, 4);
    entrada.writeUInt16LE(32, 6);
    entrada.writeUInt32LE(dados.length, 8);
    entrada.writeUInt32LE(deslocamento, 12);
    deslocamento += dados.length;
    return entrada;
  });
  return Buffer.concat([cabecalho, ...entradas, ...pngs.map(({ dados }) => dados)]);
}

const navegador = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const pagina = await navegador.newPage();

async function capturar(html, largura, altura, { transparente = true } = {}) {
  await pagina.setViewportSize({ width: largura, height: altura });
  await pagina.setContent(html, { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);
  return pagina.screenshot({ type: "png", omitBackground: transparente });
}

function gravar(caminho, dados) {
  const destino = resolve(raiz, caminho);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, dados);
  console.log(`gerado ${caminho} (${dados.length} bytes)`);
}

const ico16 = await capturar(paginaDeIcone(16, { fundoInteiro: false }), 16, 16);
const ico32 = await capturar(paginaDeIcone(32, { fundoInteiro: false }), 32, 32);
const ico48 = await capturar(paginaDeIcone(48, { fundoInteiro: false }), 48, 48);
gravar("src/app/favicon.ico", montarIco([{ tamanho: 16, dados: ico16 }, { tamanho: 32, dados: ico32 }, { tamanho: 48, dados: ico48 }]));
gravar("src/app/apple-icon.png", await capturar(paginaDeIcone(180, { fundoInteiro: true, zonaSegura: 0.82 }), 180, 180, { transparente: false }));
gravar("public/icones/icone-192.png", await capturar(paginaDeIcone(192, { fundoInteiro: false }), 192, 192));
gravar("public/icones/icone-512.png", await capturar(paginaDeIcone(512, { fundoInteiro: false }), 512, 512));
// Mascarável: o sistema recorta até 20% das bordas, então o símbolo fica na zona segura central.
gravar("public/icones/icone-mascaravel-512.png", await capturar(paginaDeIcone(512, { fundoInteiro: true, zonaSegura: 0.72 }), 512, 512, { transparente: false }));
gravar("src/app/opengraph-image.png", await capturar(paginaDeCompartilhamento, 1200, 630, { transparente: false }));

await navegador.close();
