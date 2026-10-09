// Painel administrativo: relatórios, CRUD de maquininhas e marcas, contatos e logs.
// As permissões de verdade ficam no banco (RLS): mesmo que alguém abra esta
// página sem ser admin, o Supabase recusa qualquer alteração.
import { supabase } from './supabase.js';
import { iniciarLayout } from './layout.js';
import { esc, pct, brl, dataBr, dataHoraBr, precoTexto, organizarTaxas, taxaParcela } from './util.js';

const usuario = await iniciarLayout('admin');
if (!usuario) location.href = 'entrar.html?voltar=admin.html';
else if (!usuario.admin) {
  document.querySelector('main .container').innerHTML =
    '<div class="vazio"><h2>Acesso restrito</h2><p>Esta área é só para administradores.</p><a class="btn" href="index.html">Voltar ao início</a></div>';
  throw new Error('não é admin');
}

const $ = (id) => document.getElementById(id);
const linhas = (texto) => texto.split('\n').map((l) => l.trim()).filter(Boolean);
const slugify = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\+/g, '-plus').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let marcas = [];
let maquininhas = [];
let tipos = [];

// ---------- Abas ----------
document.querySelector('.abas-admin').addEventListener('click', (e) => {
  const b = e.target.closest('[data-aba]');
  if (!b) return;
  document.querySelectorAll('.abas-admin .chip').forEach((x) => x.classList.toggle('ativo', x === b));
  document.querySelectorAll('[data-painel]').forEach((p) => p.classList.toggle('oculto', p.dataset.painel !== b.dataset.aba));
  if (b.dataset.aba === 'logs') carregarLogs();
  if (b.dataset.aba === 'contatos') carregarContatos();
});
document.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

// ---------- Carregar dados ----------
async function carregarCatalogo() {
  const [m, q, t] = await Promise.all([
    supabase.from('marcas').select('*, vantagens_marcas(vantagem)').order('nome'),
    supabase.from('maquininhas').select('*, marcas(nome, cor), taxas(tipo, parcelas, valor), maquininha_tipo_negocio(tipo_negocio_id)').order('modelo'),
    supabase.from('tipos_negocio').select('id, nome').order('nome'),
  ]);
  marcas = m.data || [];
  maquininhas = (q.data || []).map((x) => ({ ...x, t: organizarTaxas(x.taxas) }));
  tipos = t.data || [];
  desenharMaquininhas();
  desenharMarcas();
}

// ---------- Relatórios ----------
let graficos = [];
async function carregarRelatorios() {
  const [recs, contatos, perfis] = await Promise.all([
    supabase.from('logs_recomendacoes').select('maquininha_recomendada_id, maquininhas(modelo)'),
    supabase.from('contatos').select('lida'),
    supabase.from('perfis').select('id', { count: 'exact', head: true }),
  ]);
  const naoLidas = (contatos.data || []).filter((c) => !c.lida).length;
  $('n-nao-lidas').textContent = naoLidas ? `(${naoLidas})` : '';

  $('numeros').innerHTML = `
    <div><b>${marcas.length}</b><span>marcas</span></div>
    <div><b>${maquininhas.filter((m) => m.tipo === 'maquininha').length}</b><span>maquininhas</span></div>
    <div><b>${maquininhas.filter((m) => m.tipo === 'celular').length}</b><span>apps de celular</span></div>
    <div><b>${(recs.data || []).length}</b><span>recomendações feitas</span></div>
    <div><b>${perfis.count ?? 0}</b><span>usuários cadastrados</span></div>
    <div><b>${naoLidas}</b><span>contatos não lidos</span></div>`;

  graficos.forEach((g) => g.destroy());
  // Menor débito por marca
  const porMarca = marcas.map((b) => {
    const v = maquininhas.filter((m) => m.marca_id === b.id).map((m) => m.t.debito).filter((x) => x != null);
    return { nome: b.nome, cor: b.cor, valor: v.length ? Math.min(...v) : null };
  }).filter((x) => x.valor != null).sort((a, b) => a.valor - b.valor);
  graficos.push(new Chart($('g-debito'), {
    type: 'bar',
    data: { labels: porMarca.map((x) => x.nome), datasets: [{ data: porMarca.map((x) => x.valor), backgroundColor: '#5C9A6E', borderRadius: 6 }] },
    options: { maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => pct(c.parsed.x) } } }, scales: { x: { ticks: { callback: (v) => v + '%' } } } },
  }));
  // Mais recomendadas
  const contagem = {};
  for (const r of recs.data || []) {
    const nome = r.maquininhas?.modelo || 'Removida';
    contagem[nome] = (contagem[nome] || 0) + 1;
  }
  const top = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 6);
  graficos.push(new Chart($('g-recomendadas'), {
    type: 'doughnut',
    data: {
      labels: top.length ? top.map((x) => x[0]) : ['Nenhuma ainda'],
      datasets: [{ data: top.length ? top.map((x) => x[1]) : [1], backgroundColor: ['#1E4634', '#2F6B4F', '#5C9A6E', '#A9CFA0', '#DCEBD5', '#EAE0C8'] }],
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'right' } } },
  }));

  // Tabela do relatório
  $('tabela-relatorio').innerHTML = `<thead><tr><th>Marca</th><th>Modelo</th><th>Tipo</th><th>Preço</th><th class="num">Pix</th><th class="num">Débito</th><th class="num">Crédito</th><th class="num">12x</th><th>Recebimento</th><th>Cadastrada em</th></tr></thead>
    <tbody>${relatorio().map((r) => `<tr>${r.map((c, i) => `<td class="${i >= 4 && i <= 7 ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

function relatorio() {
  return [...maquininhas].sort((a, b) => a.marcas.nome.localeCompare(b.marcas.nome) || a.modelo.localeCompare(b.modelo)).map((m) => [
    m.marcas.nome, m.modelo, m.tipo === 'celular' ? 'Celular' : 'Maquininha', precoTexto(m),
    pct(m.t.pix), pct(m.t.debito), pct(m.t.credito_vista), pct(taxaParcela(m.t, 12).valor),
    m.prazo_recebimento || '', dataHoraBr(m.created_at),
  ]);
}

$('exportar-csv').addEventListener('click', () => {
  const cab = ['Marca', 'Modelo', 'Tipo', 'Preço', 'Pix', 'Débito', 'Crédito à vista', 'Crédito 12x', 'Recebimento', 'Cadastrada em'];
  const csv = [cab, ...relatorio()].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `relatorio-nexpay-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- Maquininhas ----------
function desenharMaquininhas() {
  const busca = $('busca-maq').value.trim().toLowerCase();
  const lista = maquininhas.filter((m) => !busca || (m.modelo + ' ' + m.marcas.nome).toLowerCase().includes(busca));
  $('tabela-maq').innerHTML = `<thead><tr><th>Modelo</th><th>Marca</th><th>Tipo</th><th class="num">Débito</th><th class="num">Crédito</th><th>Taxas de</th><th>Atualizada em</th><th></th></tr></thead>
    <tbody>${lista.map((m) => `<tr>
      <td><a href="maquininha.html?slug=${encodeURIComponent(m.slug)}" target="_blank">${esc(m.modelo)}</a></td>
      <td>${esc(m.marcas.nome)}</td>
      <td>${m.tipo === 'celular' ? 'Celular' : 'Maquininha'}</td>
      <td class="num">${pct(m.t.debito)}</td>
      <td class="num">${pct(m.t.credito_vista)}</td>
      <td>${dataBr(m.taxas_atualizadas_em)}</td>
      <td>${dataHoraBr(m.updated_at)}</td>
      <td><button class="btn btn-pequeno btn-contorno" data-editar-maq="${m.id}">Editar</button><button class="btn btn-pequeno btn-perigo" data-excluir-maq="${m.id}">Excluir</button></td>
    </tr>`).join('')}</tbody>`;
}
$('busca-maq').addEventListener('input', desenharMaquininhas);

// Campos de taxa: Pix, débito, crédito à vista e 2x a 12x
const CAMPOS_TAXA = [['pix', 'Pix'], ['debito', 'Débito'], ['credito_vista', 'Crédito 1x'],
  ...Array.from({ length: 11 }, (_, i) => [`p${i + 2}`, `${i + 2}x`])];
$('campos-taxas').innerHTML = CAMPOS_TAXA.map(([id, nome]) =>
  `<div class="campo"><label for="t-${id}">${nome}</label><input id="t-${id}" type="number" min="0" max="99" step="0.01"></div>`).join('');

let editandoMaq = null;
function abrirMaquininha(m) {
  editandoMaq = m;
  $('titulo-maq').textContent = m ? `Editar ${m.modelo}` : 'Nova maquininha';
  $('aviso-maq').innerHTML = '';
  $('m-marca').innerHTML = marcas.map((b) => `<option value="${b.id}">${esc(b.nome)}</option>`).join('');
  $('m-tipos').innerHTML = tipos.map((t) => `<label><input type="checkbox" data-tipo="${t.id}"> ${esc(t.nome)}</label>`).join('');

  const v = m || { preco: 0, aluguel_mensal: 0, conexao: [], aceita_pix: true, pros: [], contras: [], publico: 'PF e PJ', volume_mensal: 'pequeno', tipo: 'maquininha' };
  $('m-marca').value = v.marca_id ?? marcas[0]?.id;
  $('m-modelo').value = v.modelo || '';
  $('m-slug').value = v.slug || '';
  $('m-tipo').value = v.tipo;
  $('m-descricao').value = v.descricao || '';
  $('m-preco').value = v.preco;
  $('m-aluguel').value = v.aluguel_mensal;
  $('m-prazo').value = v.prazo_recebimento || '';
  $('m-publico').value = v.publico || 'PF e PJ';
  $('m-volume').value = v.volume_mensal || 'pequeno';
  $('m-requisitos').value = v.requisitos || '';
  document.querySelectorAll('[data-conexao]').forEach((c) => { c.checked = v.conexao.includes(c.dataset.conexao); });
  $('m-imprime').checked = !!v.imprime_comprovante;
  $('m-pix').checked = !!v.aceita_pix;
  $('m-celular').checked = !!v.precisa_celular;
  $('m-popular').checked = !!v.popular;
  $('m-pros').value = (v.pros || []).join('\n');
  $('m-contras').value = (v.contras || []).join('\n');
  $('m-obs').value = v.observacao_taxas || '';
  $('m-fonte').value = v.fonte_url || '';
  $('m-data').value = v.taxas_atualizadas_em || new Date().toISOString().slice(0, 10);

  const t = m ? m.t : { pix: null, debito: null, credito_vista: null, parcelas: {} };
  for (const [id] of CAMPOS_TAXA) {
    const valor = id.startsWith('p') ? t.parcelas[Number(id.slice(1))] : t[id];
    $(`t-${id}`).value = valor ?? '';
  }
  const tiposMaq = new Set((m?.maquininha_tipo_negocio || []).map((x) => x.tipo_negocio_id));
  document.querySelectorAll('[data-tipo]').forEach((c) => { c.checked = tiposMaq.has(Number(c.dataset.tipo)); });
  $('dialog-maq').showModal();
}
$('m-modelo').addEventListener('input', () => {
  if (!editandoMaq) {
    const marca = marcas.find((b) => b.id === Number($('m-marca').value));
    $('m-slug').value = slugify(`${marca?.slug || ''} ${$('m-modelo').value}`);
  }
});
$('nova-maq').addEventListener('click', () => abrirMaquininha(null));

$('form-maq').addEventListener('submit', async (e) => {
  e.preventDefault();
  const aviso = $('aviso-maq');
  const botao = e.target.querySelector('button[type="submit"]');
  botao.disabled = true;
  const conexao = [...document.querySelectorAll('[data-conexao]:checked')].map((c) => c.dataset.conexao);
  const dados = {
    marca_id: Number($('m-marca').value),
    modelo: $('m-modelo').value.trim(),
    slug: $('m-slug').value.trim(),
    tipo: $('m-tipo').value,
    descricao: $('m-descricao').value.trim() || null,
    preco: Number($('m-preco').value) || 0,
    aluguel_mensal: Number($('m-aluguel').value) || 0,
    prazo_recebimento: $('m-prazo').value.trim() || null,
    publico: $('m-publico').value,
    volume_mensal: $('m-volume').value,
    requisitos: $('m-requisitos').value.trim() || null,
    conexao,
    imprime_comprovante: $('m-imprime').checked,
    aceita_pix: $('m-pix').checked,
    precisa_celular: $('m-celular').checked,
    popular: $('m-popular').checked,
    pros: linhas($('m-pros').value),
    contras: linhas($('m-contras').value),
    observacao_taxas: $('m-obs').value.trim() || null,
    fonte_url: $('m-fonte').value.trim() || null,
    taxas_atualizadas_em: $('m-data').value || null,
  };

  try {
    // 1) Salva a maquininha
    const { data: salva, error } = editandoMaq
      ? await supabase.from('maquininhas').update(dados).eq('id', editandoMaq.id).select('id').single()
      : await supabase.from('maquininhas').insert(dados).select('id').single();
    if (error) throw error;
    const id = salva.id;

    // 2) Substitui as taxas
    const taxas = [];
    for (const [campo] of CAMPOS_TAXA) {
      const valor = $(`t-${campo}`).value;
      if (valor === '') continue;
      if (campo.startsWith('p')) taxas.push({ maquininha_id: id, tipo: 'credito_parcelado', parcelas: Number(campo.slice(1)), valor: Number(valor) });
      else taxas.push({ maquininha_id: id, tipo: campo, valor: Number(valor) });
    }
    let r = await supabase.from('taxas').delete().eq('maquininha_id', id);
    if (r.error) throw r.error;
    if (taxas.length) { r = await supabase.from('taxas').insert(taxas); if (r.error) throw r.error; }

    // 3) Tipos de negócio
    const tiposSel = [...document.querySelectorAll('[data-tipo]:checked')].map((c) => ({ maquininha_id: id, tipo_negocio_id: Number(c.dataset.tipo) }));
    r = await supabase.from('maquininha_tipo_negocio').delete().eq('maquininha_id', id);
    if (r.error) throw r.error;
    if (tiposSel.length) { r = await supabase.from('maquininha_tipo_negocio').insert(tiposSel); if (r.error) throw r.error; }

    // 4) Recursos e especificações básicas, calculados a partir dos campos
    const { data: recursos } = await supabase.from('recursos').select('id, nome');
    const tem = {
      'Impressora': dados.imprime_comprovante, 'Chip de internet': conexao.includes('chip'), 'Wi-Fi': conexao.includes('wifi'),
      'Bluetooth': conexao.includes('bluetooth'), 'Aproximação (NFC)': conexao.includes('nfc'), 'Pix': dados.aceita_pix,
      'Sem celular': !dados.precisa_celular,
      // maquininha com preço 0 e sem aluguel informado = "sob consulta", não dá para afirmar que não tem aluguel
      'Sem aluguel': dados.aluguel_mensal === 0 && !(dados.preco === 0 && dados.tipo === 'maquininha'),
    };
    await supabase.from('maquininha_recursos').delete().eq('maquininha_id', id);
    const rec = (recursos || []).filter((x) => tem[x.nome]).map((x) => ({ maquininha_id: id, recurso_id: x.id }));
    if (rec.length) await supabase.from('maquininha_recursos').insert(rec);
    await supabase.from('especificacoes').delete().eq('maquininha_id', id);
    await supabase.from('especificacoes').insert([
      { maquininha_id: id, tipo: 'Conexão', valor: conexao.join(', ') || '—' },
      { maquininha_id: id, tipo: 'Comprovante', valor: dados.imprime_comprovante ? 'Impresso' : 'Digital (SMS/e-mail)' },
      { maquininha_id: id, tipo: 'Funciona sem celular', valor: dados.precisa_celular ? 'Não' : 'Sim' },
      { maquininha_id: id, tipo: 'Público', valor: dados.publico },
    ]);

    $('dialog-maq').close();
    await carregarCatalogo();
    carregarRelatorios();
  } catch (erro) {
    aviso.innerHTML = `<p class="mensagem mensagem-erro">Não foi possível salvar: ${esc(erro.message)}</p>`;
  } finally {
    botao.disabled = false;
  }
});

$('tabela-maq').addEventListener('click', async (e) => {
  const editar = e.target.closest('[data-editar-maq]');
  const excluir = e.target.closest('[data-excluir-maq]');
  if (editar) abrirMaquininha(maquininhas.find((m) => m.id === Number(editar.dataset.editarMaq)));
  if (excluir) {
    const m = maquininhas.find((x) => x.id === Number(excluir.dataset.excluirMaq));
    if (!confirm(`Excluir "${m.modelo}" e todas as taxas dela? Isso não pode ser desfeito.`)) return;
    const { error } = await supabase.from('maquininhas').delete().eq('id', m.id);
    if (error) alert('Não foi possível excluir: ' + error.message);
    await carregarCatalogo();
    carregarRelatorios();
  }
});

// ---------- Marcas ----------
function desenharMarcas() {
  $('tabela-marcas').innerHTML = `<thead><tr><th></th><th>Marca</th><th>Grupo</th><th class="num">Modelos</th><th>Atualizada em</th><th></th></tr></thead>
    <tbody>${marcas.map((b) => `<tr>
      <td><span style="display:inline-block;width:18px;height:18px;border-radius:6px;background:${esc(b.cor)}"></span></td>
      <td>${esc(b.nome)}</td><td>${esc(b.grupo)}</td>
      <td class="num">${maquininhas.filter((m) => m.marca_id === b.id).length}</td>
      <td>${dataHoraBr(b.updated_at)}</td>
      <td><button class="btn btn-pequeno btn-contorno" data-editar-marca="${b.id}">Editar</button><button class="btn btn-pequeno btn-perigo" data-excluir-marca="${b.id}">Excluir</button></td>
    </tr>`).join('')}</tbody>`;
}

let editandoMarca = null;
function abrirMarca(b) {
  editandoMarca = b;
  $('titulo-marca').textContent = b ? `Editar ${b.nome}` : 'Nova marca';
  $('aviso-marca').innerHTML = '';
  $('b-nome').value = b?.nome || '';
  $('b-slug').value = b?.slug || '';
  $('b-grupo').value = b?.grupo || '';
  $('b-site').value = b?.site_url || '';
  $('b-cor').value = b?.cor || '#1E4634';
  $('b-descricao').value = b?.descricao || '';
  $('b-vantagens').value = (b?.vantagens_marcas || []).map((v) => v.vantagem).join('\n');
  $('dialog-marca').showModal();
}
$('b-nome').addEventListener('input', () => { if (!editandoMarca) $('b-slug').value = slugify($('b-nome').value); });
$('nova-marca').addEventListener('click', () => abrirMarca(null));

$('form-marca').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = {
    nome: $('b-nome').value.trim(), slug: $('b-slug').value.trim(), grupo: $('b-grupo').value.trim() || null,
    site_url: $('b-site').value.trim() || null, cor: $('b-cor').value, descricao: $('b-descricao').value.trim() || null,
  };
  try {
    const { data: salva, error } = editandoMarca
      ? await supabase.from('marcas').update(dados).eq('id', editandoMarca.id).select('id').single()
      : await supabase.from('marcas').insert(dados).select('id').single();
    if (error) throw error;
    let r = await supabase.from('vantagens_marcas').delete().eq('marca_id', salva.id);
    if (r.error) throw r.error;
    const vantagens = linhas($('b-vantagens').value).map((vantagem) => ({ marca_id: salva.id, vantagem }));
    if (vantagens.length) { r = await supabase.from('vantagens_marcas').insert(vantagens); if (r.error) throw r.error; }
    $('dialog-marca').close();
    await carregarCatalogo();
    carregarRelatorios();
  } catch (erro) {
    $('aviso-marca').innerHTML = `<p class="mensagem mensagem-erro">Não foi possível salvar: ${esc(erro.message)}</p>`;
  }
});

$('tabela-marcas').addEventListener('click', async (e) => {
  const editar = e.target.closest('[data-editar-marca]');
  const excluir = e.target.closest('[data-excluir-marca]');
  if (editar) abrirMarca(marcas.find((b) => b.id === Number(editar.dataset.editarMarca)));
  if (excluir) {
    const b = marcas.find((x) => x.id === Number(excluir.dataset.excluirMarca));
    const n = maquininhas.filter((m) => m.marca_id === b.id).length;
    if (!confirm(`Excluir a marca "${b.nome}" e as ${n} maquininhas dela? Isso não pode ser desfeito.`)) return;
    const { error } = await supabase.from('marcas').delete().eq('id', b.id);
    if (error) alert('Não foi possível excluir: ' + error.message);
    await carregarCatalogo();
    carregarRelatorios();
  }
});

// ---------- Contatos ----------
async function carregarContatos() {
  const { data } = await supabase.from('contatos').select('*').order('created_at', { ascending: false });
  $('tabela-contatos').innerHTML = data?.length
    ? `<thead><tr><th>Data</th><th>Nome</th><th>E-mail</th><th>Assunto</th><th>Mensagem</th><th></th></tr></thead>
       <tbody>${data.map((c) => `<tr class="${c.lida ? '' : 'nao-lida'}">
         <td>${dataHoraBr(c.created_at)}</td><td>${esc(c.nome)}</td>
         <td><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></td><td>${esc(c.assunto)}</td>
         <td class="msg-mensagem">${esc(c.mensagem)}</td>
         <td><button class="btn btn-pequeno btn-contorno" data-lida="${c.id}" data-valor="${!c.lida}">${c.lida ? 'Marcar não lida' : 'Marcar lida'}</button><button class="btn btn-pequeno btn-perigo" data-excluir-contato="${c.id}">Excluir</button></td>
       </tr>`).join('')}</tbody>`
    : '<tbody><tr><td class="vazio">Nenhuma mensagem recebida.</td></tr></tbody>';
}
$('tabela-contatos').addEventListener('click', async (e) => {
  const lida = e.target.closest('[data-lida]');
  const excluir = e.target.closest('[data-excluir-contato]');
  if (lida) await supabase.from('contatos').update({ lida: lida.dataset.valor === 'true' }).eq('id', Number(lida.dataset.lida));
  if (excluir) {
    if (!confirm('Excluir esta mensagem?')) return;
    await supabase.from('contatos').delete().eq('id', Number(excluir.dataset.excluirContato));
  }
  if (lida || excluir) { await carregarContatos(); carregarRelatorios(); }
});

// ---------- Logs ----------
const ACOES = { INSERT: 'Cadastro', UPDATE: 'Edição', DELETE: 'Exclusão' };
async function carregarLogs() {
  const { data } = await supabase.from('logs_admin').select('*').order('created_at', { ascending: false }).limit(200);
  $('tabela-logs').innerHTML = data?.length
    ? `<thead><tr><th>Data e hora</th><th>Ação</th><th>Tabela</th><th class="num">Registro</th><th>Usuário</th></tr></thead>
       <tbody>${data.map((l) => `<tr><td>${dataHoraBr(l.created_at)}</td><td>${ACOES[l.acao] || esc(l.acao)}</td>
         <td>${esc(l.tabela)}</td><td class="num">${esc(l.registro_id)}</td>
         <td>${l.usuario_id === usuario.id ? 'Você' : esc(l.usuario_id?.slice(0, 8) || 'Sistema')}</td></tr>`).join('')}</tbody>`
    : '<tbody><tr><td class="vazio">Nenhuma alteração registrada ainda.</td></tr></tbody>';
}

await carregarCatalogo();
carregarRelatorios();
