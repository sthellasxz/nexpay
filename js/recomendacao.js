// Sistema de recomendação NexPay.
// 1) Elimina as maquininhas que não servem para o negócio (filtros obrigatórios).
// 2) Calcula quanto o negócio pagaria de taxa por mês em cada uma.
// 3) Dá uma nota de 0 a 100 combinando custo, adequação, investimento e prazo,
//    com pesos que mudam conforme a prioridade escolhida.
import { organizarTaxas, taxaParcela, brl } from './util.js';

const PESOS = {
  taxa:         { custo: 0.70, adequacao: 0.20, investimento: 0.05, prazo: 0.05 },
  rapido:       { custo: 0.45, adequacao: 0.15, investimento: 0.10, prazo: 0.30 },
  investimento: { custo: 0.40, adequacao: 0.15, investimento: 0.35, prazo: 0.10 },
  semCelular:   { custo: 0.55, adequacao: 0.25, investimento: 0.10, prazo: 0.10 },
};

const recebeNaHora = (m) => /na hora|mesmo dia/i.test(m.prazo_recebimento || '');

// Custo mensal estimado com taxas + aluguel
export function custoMensal(m, r) {
  const t = m.t || organizarTaxas(m.taxas);
  const parc = taxaParcela(t, r.parcelasMedias).valor ?? t.credito_vista ?? 0;
  const mix = r.mix; // percentuais que somam 100
  const taxaMedia =
    (mix.debito * (t.debito ?? 0) +
     mix.credito * (t.credito_vista ?? 0) +
     mix.parcelado * parc +
     mix.pix * (t.pix ?? 0)) / 100;
  return {
    taxaMedia,
    taxas: r.faturamento * taxaMedia / 100,
    aluguel: Number(m.aluguel_mensal) || 0,
    total: r.faturamento * taxaMedia / 100 + (Number(m.aluguel_mensal) || 0),
  };
}

function servePara(m, r) {
  const publico = (m.publico || '').toUpperCase();
  if (r.pessoa === 'PF' && !publico.includes('PF')) return false;
  if (r.pessoa !== 'PF' && publico === 'PF') return false;
  if (r.impressora && !m.imprime_comprovante) return false;
  if (r.prioridade === 'semCelular' && m.precisa_celular) return false;
  if (r.conectividade === 'chip' && !m.conexao.includes('chip') && !m.precisa_celular) return false;
  if (r.orcamento != null && Number(m.preco) > r.orcamento) return false;
  if (m.slug.startsWith('safrapay') && r.faturamento < 100000) return false;
  return true;
}

function adequacao(m, r, motivos) {
  let nota = 40;
  const tipos = (m.maquininha_tipo_negocio || []).map((x) => x.tipos_negocio?.slug || x.slug);
  if (tipos.includes(r.tipoNegocio)) { nota += 30; motivos.push('Indicada para o seu tipo de negócio'); }

  if (r.local === 'loja' && m.imprime_comprovante) { nota += 15; motivos.push('Imprime comprovante no balcão'); }
  if (r.local === 'rua' && !m.precisa_celular && m.conexao.includes('chip')) { nota += 15; motivos.push('Funciona na rua com chip próprio'); }
  if (r.local === 'entregas' && (m.conexao.includes('chip') || m.tipo === 'celular')) { nota += 15; motivos.push('Leve e com internet própria para entregas'); }
  if (r.local === 'varios' && (m.tipo === 'celular' || m.volume_mensal === 'pequeno')) { nota += 15; motivos.push('Fácil de levar para qualquer lugar'); }

  if (r.conectividade === 'celular' && (m.tipo === 'celular' || m.precisa_celular)) { nota += 15; motivos.push('Usa o seu celular'); }
  if (r.conectividade === 'wifi' && m.conexao.includes('wifi')) nota += 10;
  if (r.conectividade === 'chip' && m.conexao.includes('chip')) nota += 15;

  // Quem recebe bastante Pix perde pontos numa maquininha que não aceita Pix
  if (r.mix.pix >= 10 && !m.aceita_pix) nota -= 20;

  const volume = r.faturamento < 5000 ? 'pequeno' : r.faturamento < 30000 ? 'medio' : 'grande';
  if (m.volume_mensal === volume) nota += 10;
  return Math.min(nota, 100);
}

export function recomendar(maquininhas, r) {
  const candidatas = maquininhas.filter((m) => servePara(m, r));
  if (!candidatas.length) return [];

  const linhas = candidatas.map((m) => {
    const motivos = [];
    const custo = custoMensal(m, r);
    const investimento = Number(m.preco) + custo.aluguel * 12;
    return { m, custo, investimento, motivos, adequacao: adequacao(m, r, motivos) };
  });

  const menorCusto = Math.min(...linhas.map((l) => l.custo.total));
  const maiorInvest = Math.max(...linhas.map((l) => l.investimento), 1);
  const pesos = PESOS[r.prioridade] || PESOS.taxa;

  for (const l of linhas) {
    const notaCusto = l.custo.total > 0 ? 100 * Math.max(menorCusto, 0.01) / l.custo.total : 100;
    const notaInvest = 100 * (1 - l.investimento / maiorInvest);
    const notaPrazo = recebeNaHora(l.m) ? 100 : /1 dia/i.test(l.m.prazo_recebimento || '') ? 70 : 30;
    l.nota = pesos.custo * notaCusto + pesos.adequacao * l.adequacao + pesos.investimento * notaInvest + pesos.prazo * notaPrazo;

    if (l.custo.total === menorCusto) l.motivos.unshift('Menor custo estimado entre as opções');
    if (recebeNaHora(l.m)) l.motivos.push('Recebe no mesmo dia');
    if (l.investimento === 0) l.motivos.push('Sem custo para começar');
    else if (Number(l.m.preco) > 0 && Number(l.m.preco) < 60) l.motivos.push(`Custa só ${brl(l.m.preco)}`);
  }

  // Nota final relativa: a melhor opção vira referência de compatibilidade
  const melhor = Math.max(...linhas.map((l) => l.nota));
  for (const l of linhas) {
    l.compatibilidade = Math.round(Math.min(99, (l.nota / melhor) * 95));
    l.pontuacao = Math.round(l.nota * 10);
  }
  return linhas.sort((a, b) => b.nota - a.nota);
}
