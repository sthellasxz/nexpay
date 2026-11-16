/*
 * EcoFert — interações da página: ilustração da lixeira, sensores (modal),
 * trilha do processo, guia de resíduos, calculadora de impacto e menu ativo.
 */
(() => {
  'use strict';

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Remove acentos e pontuação para comparar textos com segurança
  const normalizar = (t) => t
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // ---------- Ilustração da lixeira (um único SVG reutilizado) ----------
  function hotspot(chave, x, y) {
    const s = SENSORES[chave];
    return `
      <g class="hotspot" data-sensor="${chave}" tabindex="0" role="button" aria-label="${s.nome}: ver detalhes">
        <title>${s.nome}</title>
        <circle class="halo" cx="${x}" cy="${y}" r="16"/>
        <circle class="nucleo" cx="${x}" cy="${y}" r="9"/>
        <circle class="ponto" cx="${x}" cy="${y}" r="2.6"/>
      </g>`;
  }

  function lixeiraSVG() {
    return `
      <svg class="lixeira" viewBox="0 0 300 320" data-etapa="0" role="img" aria-labelledby="titulo-lixeira">
        <title id="titulo-lixeira">Lixeira EcoFert com sensores</title>
        <ellipse class="sombra" cx="150" cy="306" rx="100" ry="9"/>

        <g class="corpo">
          <rect class="casco" x="62" y="110" width="176" height="188" rx="32"/>
          <rect class="heat" x="80" y="232" width="140" height="58" rx="22"/>
          <rect class="visor" x="98" y="140" width="104" height="52" rx="14"/>
          <g class="rotor">
            <g transform="translate(150 166)">
              <rect x="-38" y="-3" width="76" height="6" rx="3" transform="rotate(20)"/>
              <rect x="-38" y="-3" width="76" height="6" rx="3" transform="rotate(-40)"/>
              <circle r="5"/>
            </g>
          </g>
          <rect class="substrato" x="84" y="186" width="132" height="8" rx="4"/>
          <path class="composto" d="M84 298 Q150 222 216 298 Z"/>
          <g class="muda">
            <path class="talo" d="M150 268 V236"/>
            <path class="folha" d="M150 242 C136 240 128 230 128 220 C142 222 150 230 150 242Z"/>
            <path class="folha" d="M150 236 C164 234 172 224 172 214 C158 216 150 224 150 236Z"/>
          </g>
        </g>

        <g class="scrap-wrap"><circle class="scrap" cx="150" cy="44" r="9"/></g>

        <g class="tampa">
          <rect class="tampa-corpo" x="54" y="86" width="192" height="30" rx="15"/>
          <rect class="puxador" x="132" y="78" width="36" height="9" rx="4.5"/>
          ${hotspot('ultra', 222, 101)}
        </g>

        ${hotspot('servo', 62, 101)}
        ${hotspot('motor', 150, 126)}
        ${hotspot('esp32', 222, 178)}
        ${hotspot('dht22', 80, 246)}
        ${hotspot('celula', 150, 302)}
      </svg>`;
  }

  function montarLixeiras() {
    $$('[data-lixeira]').forEach((el) => { el.innerHTML = lixeiraSVG(); });
  }

  function montarLegendaHero() {
    $('#legenda-hero').innerHTML = Object.keys(SENSORES)
      .map((k) => `<li><button type="button" class="chip" data-sensor="${k}">${SENSORES[k].nome}</button></li>`)
      .join('');
  }

  // Inclinação suave da lixeira do hero acompanhando o mouse
  function ativarInclinacao() {
    const alvo = $('.bin-hero');
    if (!alvo || reduzirMovimento || !matchMedia('(pointer: fine)').matches) return;
    alvo.addEventListener('pointermove', (e) => {
      const r = alvo.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      alvo.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
      alvo.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
    });
    alvo.addEventListener('pointerleave', () => {
      alvo.style.setProperty('--rx', '0deg');
      alvo.style.setProperty('--ry', '0deg');
    });
  }

  // ---------- Modal de sensores ----------
  const modal = $('#modal-sensor');

  function abrirSensor(chave) {
    const s = SENSORES[chave];
    if (!s) return;
    $('#modal-tag').textContent = s.componente;
    $('#modal-titulo').textContent = s.nome;
    $('#modal-funcao').textContent = s.funcao;
    $('#modal-quando').textContent = s.quando;
    $('#modal-codigo').textContent = s.codigo;
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  }

  modal.addEventListener('click', (e) => {
    // Fecha ao clicar no fundo (fora da caixa) ou no botão ×
    const dentro = e.target.closest('.modal-corpo');
    if (!dentro || e.target.matches('[data-fechar]')) modal.close();
  });

  // ---------- Processo interativo ----------
  let etapaAtual = 0;

  function montarTrilha() {
    $('#trilha').innerHTML = ETAPAS.map((e, i) => `
      <button type="button" class="trilha-passo" data-passo="${i}" aria-pressed="false">
        <span class="bolinha">${i + 1}</span>
        <span class="rotulo">${e.titulo}</span>
      </button>`).join('');
  }

  function mostrarEtapa(indice) {
    const total = ETAPAS.length;
    const i = Math.max(0, Math.min(total - 1, indice));
    const e = ETAPAS[i];
    etapaAtual = i;

    $$('.trilha-passo').forEach((b, j) => {
      b.setAttribute('aria-pressed', String(j === i));
      b.classList.toggle('concluido', j < i);
    });

    // Estado visual da lixeira e destaque dos sensores da etapa
    const svg = $('#processo .lixeira');
    if (svg) svg.dataset.etapa = String(i + 1);
    $$('#processo .hotspot').forEach((h) => {
      h.classList.toggle('destaque', e.sensores.includes(h.dataset.sensor));
    });

    // Troca do texto com animação de entrada
    const det = $('#detalhe');
    det.classList.remove('entrar');
    void det.offsetWidth; // reinicia a animação
    det.classList.add('entrar');

    $('#etapa-num').textContent = `Etapa ${i + 1} de ${total}`;
    $('#etapa-titulo').textContent = e.titulo;
    $('#etapa-sub').textContent = e.subtitulo;
    $('#etapa-texto').textContent = e.texto;
    $('#etapa-comps').innerHTML = e.sensores.map((k) => `
      <li><button type="button" data-sensor="${k}"><b>${SENSORES[k].nome}</b>${SENSORES[k].resumo}</button></li>`).join('');

    $('#prev').disabled = i === 0;
    $('#next').disabled = i === total - 1;
    $('#contador').textContent = `${i + 1} / ${total}`;
  }

  // ---------- Guia de resíduos ----------
  // Lista plana de itens com a categoria de cada um
  const ITENS_GUIA = Object.entries(GUIA).flatMap(([cat, grupo]) =>
    grupo.itens.map((item) => ({ cat, item }))
  );

  // Pontua cada item pelos termos encontrados na pergunta. Termos mais longos valem mais.
  function buscarGuia(pergunta) {
    const q = normalizar(pergunta);
    if (!q) return [];
    return ITENS_GUIA
      .map((registro) => {
        const termos = [registro.item.nome, ...registro.item.palavras].map(normalizar);
        let pontos = 0;
        termos.forEach((termo) => {
          if (termo && new RegExp(`\\b${escaparRegex(termo)}`).test(q)) {
            pontos = Math.max(pontos, termo.length);
          }
        });
        return { ...registro, pontos };
      })
      .filter((r) => r.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos);
  }

  function responder(pergunta) {
    const caixa = $('#resposta');
    const achados = buscarGuia(pergunta);

    if (!achados.length) {
      caixa.className = 'resposta visivel vazio';
      caixa.innerHTML = `
        <span class="etiqueta">Item não encontrado</span>
        <h4>Não encontramos esse item ainda</h4>
        <p>Regra prática: alimentos vegetais crus e sem tempero costumam ser seguros. Carnes, laticínios, óleos, plásticos e fezes de animais não entram.</p>`;
      return;
    }

    const [melhor, ...outros] = achados;
    const grupo = GUIA[melhor.cat];
    const relacionados = outros.slice(0, 3).map((o) => o.item.nome);

    caixa.className = `resposta visivel ${grupo.cor}`;
    caixa.innerHTML = `
      <span class="etiqueta">${grupo.titulo}</span>
      <h4>${melhor.item.nome}</h4>
      <p>${melhor.item.dica}</p>
      ${relacionados.length ? `<p class="rel">Também relacionado: ${relacionados.join(', ')}</p>` : ''}`;
  }

  function montarGuia() {
    $('#colunas').innerHTML = Object.values(GUIA).map((grupo) => `
      <article class="coluna ${grupo.cor}">
        <h3>${grupo.titulo}</h3>
        <ul>
          ${grupo.itens.map((i) => `<li><button type="button" data-item="${i.nome}">${i.nome}</button></li>`).join('')}
        </ul>
      </article>`).join('');

    const exemplos = ['Posso jogar casca de banana?', 'Borra de café', 'Casca de laranja', 'Papel toalha', 'Óleo de cozinha', 'Osso de frango'];
    $('#sugestoes').innerHTML = exemplos
      .map((t) => `<button type="button" class="chip" data-pergunta="${t}">${t}</button>`)
      .join('');
  }

  // ---------- Calculadora de impacto ----------
  const fmt = (n, casas = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

  function atualizarImpacto() {
    const kgSemana = Number($('#kg-semana').value);
    const kgAno = kgSemana * 52;
    $('#kg-sem-out').textContent = `${fmt(kgSemana)} kg por semana`;
    $('#imp-kg').textContent = `${fmt(kgAno, 0)} kg`;
    $('#imp-co2').textContent = `${fmt(kgAno * IMPACTO.co2e_por_kg, 0)} kg`;
    $('#imp-ch4').textContent = `${fmt(kgAno * IMPACTO.ch4_por_kg, 1)} kg`;
  }

  // ---------- Menu com seção ativa ----------
  function observarSecoes() {
    const links = $$('.menu a');
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => {
          a.setAttribute('aria-current', String(a.dataset.secao === en.target.id));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => observador.observe(s));
  }

  // ---------- Eventos ----------
  function ligarEventos() {
    document.addEventListener('click', (e) => {
      const sensor = e.target.closest('[data-sensor]');
      if (sensor) { abrirSensor(sensor.dataset.sensor); return; }

      const passo = e.target.closest('[data-passo]');
      if (passo) { mostrarEtapa(Number(passo.dataset.passo)); return; }

      const item = e.target.closest('[data-item]');
      if (item) {
        $('#busca').value = item.dataset.item;
        responder(item.dataset.item);
        return;
      }

      const pergunta = e.target.closest('[data-pergunta]');
      if (pergunta) {
        $('#busca').value = pergunta.dataset.pergunta;
        responder(pergunta.dataset.pergunta);
      }
    });

    // Hotspots do SVG também respondem ao teclado
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.hotspot')) {
        e.preventDefault();
        abrirSensor(e.target.dataset.sensor);
      }
    });

    $('#prev').addEventListener('click', () => mostrarEtapa(etapaAtual - 1));
    $('#next').addEventListener('click', () => mostrarEtapa(etapaAtual + 1));

    $('#form-busca').addEventListener('submit', (e) => {
      e.preventDefault();
      responder($('#busca').value);
    });

    $('#kg-semana').addEventListener('input', atualizarImpacto);
  }

  // ---------- Inicialização ----------
  function iniciar() {
    montarLixeiras();
    montarLegendaHero();
    montarTrilha();
    mostrarEtapa(0);
    montarGuia();
    atualizarImpacto();
    ativarInclinacao();
    observarSecoes();
    ligarEventos();
  }

  iniciar();
})();
