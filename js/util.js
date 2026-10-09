// Funções de apoio usadas em várias páginas.

// Escapa texto vindo do banco antes de colocar no HTML (proteção contra XSS)
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function pct(valor) {
  if (valor == null) return '—';
  return Number(valor).toFixed(2).replace('.', ',') + '%';
}

export function brl(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dataBr(data) {
  if (!data) return '—';
  const d = new Date(data.length === 10 ? data + 'T12:00:00' : data);
  return d.toLocaleDateString('pt-BR');
}

export function dataHoraBr(data) {
  return data ? new Date(data).toLocaleString('pt-BR') : '—';
}

export function parametro(nome) {
  return new URLSearchParams(location.search).get(nome);
}

// Texto de preço: compra, aluguel, grátis (apps) ou sob consulta
export function precoTexto(m) {
  if (Number(m.preco) > 0) return brl(m.preco);
  if (Number(m.aluguel_mensal) > 0) return brl(m.aluguel_mensal) + '/mês';
  if (m.tipo === 'celular') return 'Grátis';
  return 'Sob consulta';
}

const NOMES_CONEXAO = { chip: 'Chip', wifi: 'Wi-Fi', bluetooth: 'Bluetooth', nfc: 'Aproximação' };
export function conexaoTexto(lista) {
  return (lista || []).map((c) => NOMES_CONEXAO[c] || c).join(' · ');
}

// Organiza a lista de taxas vinda do banco: { pix, debito, credito_vista, parcelas: {2: x, ...} }
export function organizarTaxas(taxas) {
  const t = { pix: null, debito: null, credito_vista: null, parcelas: {} };
  for (const tx of taxas || []) {
    if (tx.tipo === 'credito_parcelado') t.parcelas[tx.parcelas] = Number(tx.valor);
    else t[tx.tipo] = Number(tx.valor);
  }
  return t;
}

// Taxa de uma parcela; se a marca não divulga aquela parcela, estima
// em linha reta entre os pontos conhecidos (1x = crédito à vista).
export function taxaParcela(t, n) {
  if (n <= 1) return { valor: t.credito_vista, estimada: false };
  if (t.parcelas[n] != null) return { valor: t.parcelas[n], estimada: false };
  const pontos = [[1, t.credito_vista], ...Object.entries(t.parcelas).map(([k, v]) => [Number(k), v])]
    .filter(([, v]) => v != null)
    .sort((a, b) => a[0] - b[0]);
  if (pontos.length < 2) return { valor: null, estimada: true };
  let antes = pontos[0];
  let depois = pontos[pontos.length - 1];
  for (const p of pontos) {
    if (p[0] < n) antes = p;
    if (p[0] > n) { depois = p; break; }
  }
  if (depois[0] < n) return { valor: depois[1], estimada: true };
  const valor = antes[1] + (depois[1] - antes[1]) * ((n - antes[0]) / (depois[0] - antes[0]));
  return { valor: Math.round(valor * 100) / 100, estimada: true };
}

// Desenho da maquininha (ou do celular) na cor da marca — sem usar fotos das empresas
export function desenhoDispositivo(m, cor = '#1E4634') {
  const smart = /smart|lio|pro 3|profit/i.test(m.modelo);
  if (m.tipo === 'celular') {
    return `<svg viewBox="0 0 120 160" aria-hidden="true">
      <rect x="30" y="8" width="60" height="144" rx="12" fill="#1B2A22"/>
      <rect x="35" y="18" width="50" height="118" rx="6" fill="#F6F0E1"/>
      <circle cx="60" cy="66" r="16" fill="${cor}"/>
      <g fill="none" stroke="${cor}" stroke-width="3" stroke-linecap="round">
        <path d="M54 94 a10 10 0 0 1 12 0"/><path d="M50 101 a17 17 0 0 1 20 0"/>
      </g>
      <rect x="44" y="116" width="32" height="8" rx="4" fill="${cor}" opacity=".35"/>
      <rect x="52" y="12" width="16" height="3" rx="1.5" fill="#55665C"/>
    </svg>`;
  }
  const impressora = m.imprime_comprovante
    ? `<rect x="34" y="4" width="52" height="14" rx="4" fill="#EAE0C8"/><rect x="40" y="0" width="40" height="8" rx="2" fill="#FFFCF5"/>`
    : '';
  const teclado = smart
    ? `<rect x="36" y="44" width="48" height="84" rx="6" fill="#F6F0E1"/>
       <rect x="42" y="52" width="36" height="8" rx="3" fill="${cor}" opacity=".5"/>
       <rect x="42" y="66" width="16" height="16" rx="4" fill="${cor}" opacity=".3"/><rect x="62" y="66" width="16" height="16" rx="4" fill="${cor}" opacity=".3"/>
       <rect x="42" y="86" width="16" height="16" rx="4" fill="${cor}" opacity=".3"/><rect x="62" y="86" width="16" height="16" rx="4" fill="${cor}" opacity=".3"/>`
    : `<rect x="38" y="36" width="44" height="30" rx="4" fill="#F6F0E1"/>
       ${[0, 1, 2, 3].map((l) => [0, 1, 2].map((c) =>
          `<rect x="${40 + c * 15}" y="${76 + l * 13}" width="11" height="8" rx="2.5" fill="#FFFCF5" opacity=".85"/>`).join('')).join('')}`;
  return `<svg viewBox="0 0 120 160" aria-hidden="true">
    ${impressora}
    <rect x="28" y="14" width="64" height="140" rx="14" fill="${cor}"/>
    <rect x="28" y="14" width="64" height="140" rx="14" fill="none" stroke="#1B2A22" stroke-opacity=".15" stroke-width="2"/>
    ${smart ? '' : `<rect x="38" y="24" width="44" height="6" rx="3" fill="#FFFCF5" opacity=".35"/>`}
    ${teclado}
    ${m.precisa_celular ? `<g fill="none" stroke="#FFFCF5" stroke-width="2.5" stroke-linecap="round" opacity=".8"><path d="M54 140 a8 8 0 0 1 12 0"/></g>` : ''}
  </svg>`;
}

// Card usado no catálogo, na página inicial e na área do usuário
export function cardMaquininha(m, { comparar = false } = {}) {
  const t = organizarTaxas(m.taxas);
  const marca = m.marcas || {};
  return `<article class="card card-maq">
    <a class="card-maq-imagem" href="maquininha.html?slug=${encodeURIComponent(m.slug)}" aria-label="Ver ${esc(m.modelo)}">
      ${m.tipo === 'celular' ? '<span class="etiqueta">No celular</span>' : m.popular ? '<span class="etiqueta">Popular</span>' : ''}
      ${desenhoDispositivo(m, marca.cor)}
    </a>
    <div class="card-maq-corpo">
      <span class="card-maq-marca">${esc(marca.nome)}</span>
      <h3><a href="maquininha.html?slug=${encodeURIComponent(m.slug)}" style="color:inherit;text-decoration:none">${esc(m.modelo)}</a></h3>
      <span class="texto-suave" style="font-size:.85rem">${esc(conexaoTexto(m.conexao))}${m.imprime_comprovante ? ' · Impressora' : ''}</span>
      <div class="taxas-mini">
        <div><b>${pct(t.debito)}</b><span>Débito</span></div>
        <div><b>${pct(t.credito_vista)}</b><span>Crédito</span></div>
        <div><b>${t.pix == null ? '—' : pct(t.pix)}</b><span>Pix</span></div>
      </div>
      ${comparar
        ? `<span class="preco">${esc(precoTexto(m))}</span>
           <div class="card-maq-acoes">
             <button type="button" class="btn btn-contorno btn-pequeno" data-ver-taxas="${m.id}">Ver taxas</button>
             <label class="comparar-check"><input type="checkbox" data-comparar="${m.id}"><span class="desligado">⇄ Comparar</span><span class="ligado">✓ Comparando</span></label>
           </div>`
        : `<div class="card-maq-rodape">
             <span class="preco">${esc(precoTexto(m))}</span>
             <a class="btn btn-pequeno" href="maquininha.html?slug=${encodeURIComponent(m.slug)}">Ver mais</a>
           </div>`}
    </div>
  </article>`;
}

// Seleção padrão de colunas para listar maquininhas com marca e taxas
export const SELECT_MAQUININHA = '*, marcas(id, nome, slug, cor), taxas(tipo, parcelas, valor)';
