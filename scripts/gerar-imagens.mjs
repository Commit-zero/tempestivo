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
const AZUL = "#123260";
const PAPEL = "#fbfaf7";

// O símbolo sem o fundo arredondado, para os ícones de fundo inteiro (Apple e mascarável).
const simboloSemFundo = simbolo.replace(/<rect width="64" height="64" rx="15" fill="#123260"\/>/, "");

function paginaDeIcone(tamanho, { fundoInteiro, zonaSegura = 1 }) {
  const svg = fundoInteiro ? simboloSemFundo : simbolo;
  const lado = Math.round(tamanho * zonaSegura);
  return `<!doctype html><html><body style="margin:0;width:${tamanho}px;height:${tamanho}px;display:grid;place-items:center;background:${fundoInteiro ? AZUL : "transparent"}">
    <div style="width:${lado}px;height:${lado}px">${svg.replace("<svg ", `<svg width="${lado}" height="${lado}" `)}</div></body></html>`;
}

const paginaDeCompartilhamento = `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,600&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${PAPEL}; font-family: Geist, system-ui, sans-serif; color: #101926;
         display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px; padding: 72px 72px 64px; position: relative; overflow: hidden; }
  body::after { content: ""; position: absolute; inset: auto 0 0 0; height: 14px; background: ${AZUL}; }
  .marca { display: flex; align-items: center; gap: 16px; font-family: "Source Serif 4", Georgia, serif; font-weight: 600; font-size: 40px; color: ${AZUL}; }
  .marca svg { width: 64px; height: 64px; }
  h1 { font-family: "Source Serif 4", Georgia, serif; font-weight: 600; font-size: 60px; line-height: 1.08; letter-spacing: -0.02em; margin-top: 56px; }
  p.sub { margin-top: 24px; font-size: 26px; line-height: 1.4; color: #44516a; }
  .cartao { align-self: center; background: #fff; border: 2px solid #d9dee8; border-radius: 28px; padding: 36px; display: grid; gap: 18px;
            box-shadow: 0 24px 60px -30px rgba(18,50,96,.45); }
  .linha { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .ato { font-size: 28px; font-weight: 600; }
  .selo { background: #fbefd9; color: #8e5400; font-size: 20px; font-weight: 500; padding: 6px 16px; border-radius: 999px; }
  .rotulo { font-size: 20px; color: #5b6880; }
  .data { font-size: 38px; font-weight: 600; letter-spacing: -0.01em; }
  .meta { font-size: 22px; color: #8e5400; }
  .rodape { border-top: 2px solid #e6e9ef; padding-top: 16px; display: flex; justify-content: space-between; font-size: 20px; }
  .ok { color: #036639; font-weight: 500; } .aux { color: #5b6880; }
</style></head><body>
  <div>
    <div class="marca">${simbolo}Tempestivo</div>
    <h1>Nunca perca um prazo e receba seus honorários.</h1>
    <p class="sub">A agenda de prazos do advogado autônomo: calcula, explica, cobra a conferência e avisa antes que seja tarde.</p>
  </div>
  <div class="cartao">
    <div class="linha"><span class="ato">Contestação</span><span class="selo">vence em 4 dias</span></div>
    <div><div class="rotulo">Data final calculada</div><div class="data">04/12/2026 (sexta)</div></div>
    <div class="meta">Meta interna: 02/12/2026</div>
    <div class="rodape"><span class="ok">conferido hoje</span><span class="aux">Cálculo auxiliar, confira.</span></div>
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
