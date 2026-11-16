/*
 * EcoFert — dashboard IoT simulado.
 * Telemetria com pequenas variações e um "Modo Demonstração" que percorre o ciclo completo.
 * Para usar dados reais, substitua a função `variarLeitura` por leituras do ESP32
 * (por exemplo, via fetch periódico ao endpoint de telemetria).
 */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  // Estado inicial de referência (igual ao que aparece no HTML)
  const BASE = { peso: 1.8, temp: 31, umid: 58, nivel: 35, mat: 70, tampa: 'fechada' };
  const estado = { ...BASE, motor: false, aquec: false };

  const MAX_PONTOS = 30;
  const historico = { temp: [], umid: [] };
  const limites = { temp: [20, 60], umid: [30, 90] };

  const rand = (min, max) => min + Math.random() * (max - min);
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
  const fmtKg = (n) => n.toFixed(1).replace('.', ',');

  // Preenche o gráfico com leituras anteriores para não começar vazio
  for (let i = 0; i < 20; i++) {
    historico.temp.push(31 + rand(-1, 1));
    historico.umid.push(58 + rand(-2, 2));
  }

  // ---------- Log de eventos ----------
  function registrar(msg) {
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const li = document.createElement('li');
    li.innerHTML = `<time>${hora}</time>`;
    li.append(document.createTextNode(msg));
    const log = $('#log');
    log.prepend(li);
    while (log.children.length > 12) log.lastElementChild.remove();
  }

  // ---------- Atualização da tela ----------
  function render() {
    $('#m-peso').textContent = `${fmtKg(estado.peso)} kg`;
    $('#m-temp').textContent = `${Math.round(estado.temp)} °C`;
    $('#m-umid').textContent = `${Math.round(estado.umid)} %`;
    $('#m-nivel').textContent = `${Math.round(estado.nivel)} %`;
    $('#m-tampa').textContent = `${estado.tampa === 'aberta' ? 'Tampa aberta' : 'Tampa fechada'} · Ultrassônico`;

    const mat = Math.round(estado.mat);
    $('#barra-mat').style.width = `${estado.mat}%`;
    $('#barra-prog').setAttribute('aria-valuenow', String(mat));
    $('#mat-pct').textContent = `${mat}%`;
    $('#estagio-texto').textContent = estado.mat >= 100
      ? 'Composto pronto para colheita'
      : `Fase de Maturação: ${mat}%`;

    const dias = Math.max(0, Math.ceil(((100 - estado.mat) / 100) * 30));
    $('#tempo-restante').textContent = dias > 0
      ? `Tempo estimado para colheita: ~${dias} ${dias === 1 ? 'dia' : 'dias'}`
      : 'Pronto para colheita';

    marcarAtuador('tampa', estado.tampa === 'aberta', 'Aberta', 'Fechada');
    marcarAtuador('motor', estado.motor, 'Ligado', 'Desligado');
    marcarAtuador('aquec', estado.aquec, 'Ligado', 'Desligado');

    atualizarGrafico();
  }

  function marcarAtuador(nome, ativo, textoOn, textoOff) {
    const li = document.querySelector(`#atuadores [data-ator="${nome}"]`);
    li.classList.toggle('ligado', ativo);
    li.querySelector('b').textContent = ativo ? textoOn : textoOff;
  }

  // ---------- Gráfico (SVG puro, sem bibliotecas) ----------
  function caminho(valores, [min, max]) {
    const W = 600, H = 200, P = 14;
    const passo = (W - 2 * P) / (MAX_PONTOS - 1);
    const pontos = valores.map((v, i) => {
      const x = P + (MAX_PONTOS - valores.length + i) * passo;
      const y = H - P - ((limitar(v, min, max) - min) / (max - min)) * (H - 2 * P);
      return { x, y };
    });
    const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { d, ultimo: pontos[pontos.length - 1] };
  }

  function atualizarGrafico() {
    const t = caminho(historico.temp, limites.temp);
    const u = caminho(historico.umid, limites.umid);
    $('#linha-temp').setAttribute('d', t.d);
    $('#linha-umid').setAttribute('d', u.d);
    const pt = $('#ponto-temp'), pu = $('#ponto-umid');
    pt.setAttribute('cx', t.ultimo.x); pt.setAttribute('cy', t.ultimo.y);
    pu.setAttribute('cx', u.ultimo.x); pu.setAttribute('cy', u.ultimo.y);

    // Resumo de mínimos e máximos do histórico exibido
    const mm = (lista) => [Math.min(...lista), Math.max(...lista)].map((v) => Math.round(v));
    const [tMin, tMax] = mm(historico.temp);
    const [uMin, uMax] = mm(historico.umid);
    $('#t-min').textContent = `${tMin} °C`;
    $('#t-max').textContent = `${tMax} °C`;
    $('#u-min').textContent = `${uMin} %`;
    $('#u-max').textContent = `${uMax} %`;
  }

  function empurrar(lista, valor) {
    lista.push(valor);
    if (lista.length > MAX_PONTOS) lista.shift();
  }

  // ---------- Telemetria simulada em repouso ----------
  function variarLeitura() {
    if (demo) return;
    estado.temp = limitar(estado.temp + rand(-0.4, 0.4), 26, 36);
    estado.umid = limitar(estado.umid + rand(-0.8, 0.8), 50, 66);
  }

  // ---------- Modo Demonstração ----------
  const FASES = [
    {
      nome: 'Descarte', dur: 2800,
      inicio: () => { estado.tampa = 'aberta'; registrar('Tampa aberta: ultrassônico detectou aproximação.'); },
      tick: (p, s) => { estado.peso = s.peso + 0.35 * p; estado.nivel = Math.min(100, s.nivel + 14 * p); },
      fim: () => { estado.tampa = 'fechada'; registrar(`Tampa fechada. Peso acumulado: ${fmtKg(estado.peso)} kg.`); }
    },
    {
      nome: 'Trituração', dur: 3000,
      inicio: () => { estado.motor = true; registrar('Motor DC acionado: lâminas trituram o resíduo.'); },
      tick: (p, s) => { estado.nivel = s.nivel - 12 * p; },
      fim: () => { estado.motor = false; registrar('Trituração concluída. Volume reduzido.'); }
    },
    {
      nome: 'Aquecimento', dur: 3200,
      inicio: () => { estado.aquec = true; registrar('Mistura e aquecimento iniciados. Microrganismos ativos.'); },
      tick: (p, s) => { estado.temp = s.temp + (50 - s.temp) * p; estado.umid = s.umid + (68 - s.umid) * p; },
      fim: () => {}
    },
    {
      nome: 'Composto finalizado', dur: 2600,
      inicio: () => { estado.aquec = false; registrar('Resfriamento e maturação em andamento.'); },
      tick: (p, s) => {
        estado.mat = s.mat + (100 - s.mat) * p;
        estado.temp = s.temp + (33 - s.temp) * p;
        estado.umid = s.umid + (60 - s.umid) * p;
      },
      fim: () => registrar('Composto pronto! Adubo disponível para colheita.')
    }
  ];

  let demo = null; // { idx, t0, snap, quadro }
  const botao = $('#btn-demo');
  const pilula = $('#demo-fase');

  function mostrarFase(texto) {
    pilula.innerHTML = texto ? `<span class="fase-pill">${texto}</span>` : '';
  }

  function iniciarDemo() {
    if (demo) return;
    Object.assign(estado, BASE, { motor: false, aquec: false });
    $('#log').innerHTML = '';
    registrar('Modo demonstração iniciado.');
    demo = { idx: -1 };
    botao.disabled = true;
    botao.textContent = 'Demonstração em andamento…';
    proximaFase();
  }

  function proximaFase() {
    demo.idx += 1;
    if (demo.idx >= FASES.length) { encerrarDemo(); return; }
    const fase = FASES[demo.idx];
    demo.snap = { ...estado };
    demo.t0 = performance.now();
    fase.inicio();
    mostrarFase(`${fase.nome} · ${demo.idx + 1}/${FASES.length}`);
    demo.quadro = requestAnimationFrame(loop);
  }

  function loop(agora) {
    const fase = FASES[demo.idx];
    const p = Math.min(1, (agora - demo.t0) / fase.dur);
    fase.tick(p, demo.snap);
    render();
    if (p < 1) {
      demo.quadro = requestAnimationFrame(loop);
    } else {
      fase.fim();
      proximaFase();
    }
  }

  function encerrarDemo() {
    demo = null;
    render();
    mostrarFase('Demonstração concluída');
    botao.disabled = false;
    botao.textContent = 'Repetir demonstração';
  }

  // ---------- Inicialização ----------
  botao.addEventListener('click', iniciarDemo);

  setInterval(variarLeitura, 2000);

  // Amostra a cada segundo para formar o histórico do gráfico
  setInterval(() => {
    empurrar(historico.temp, estado.temp);
    empurrar(historico.umid, estado.umid);
    atualizarGrafico();
  }, 1000);

  render();
})();
