// Cabeçalho e rodapé padronizados (RF003) + estado do login.
import { supabase } from './supabase.js';

const LINKS = [
  { href: 'index.html', texto: 'Início', id: 'inicio' },
  { href: 'marcas.html', texto: 'Marcas', id: 'marcas' },
  { href: 'catalogo.html', texto: 'Catálogo', id: 'catalogo' },
  { href: 'recomendacao.html', texto: 'Recomendação', id: 'recomendacao' },
  { href: 'contato.html', texto: 'Contato', id: 'contato' },
];

// Usuário logado e perfil (null se for visitante)
export async function usuarioAtual() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: perfil } = await supabase.from('perfis').select('nome, tipo').eq('id', session.user.id).maybeSingle();
  return { ...session.user, nome: perfil?.nome || session.user.email, admin: perfil?.tipo === 'admin' };
}

// Manda para a tela de login se não estiver logado
export async function exigirLogin() {
  const usuario = await usuarioAtual();
  if (!usuario) {
    location.href = 'entrar.html?voltar=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
    return null;
  }
  return usuario;
}

export async function iniciarLayout(paginaAtiva) {
  const usuario = await usuarioAtual();

  const itens = LINKS.map((l) =>
    `<li><a href="${l.href}" class="${l.id === paginaAtiva ? 'ativo' : ''}">${l.texto}</a></li>`).join('');
  const conta = usuario
    ? `${usuario.admin ? `<li><a href="admin.html" class="${paginaAtiva === 'admin' ? 'ativo' : ''}">Painel admin</a></li>` : ''}
       <li class="menu-conta"><a href="conta.html" class="${paginaAtiva === 'conta' ? 'ativo' : ''}">Minha conta</a></li>`
    : `<li class="menu-conta"><a href="entrar.html" class="${paginaAtiva === 'entrar' ? 'ativo' : ''}">Entrar</a></li>`;

  const topo = document.getElementById('topo');
  topo.className = 'topo';
  topo.innerHTML = `<div class="container">
      <a class="topo-logo" href="index.html"><img src="assets/img/logo-nexpay-claro.svg" alt="NexPay — página inicial"></a>
      <button class="menu-botao" aria-label="Abrir menu" aria-expanded="false">☰</button>
      <nav aria-label="Menu principal"><ul class="menu">${itens}${conta}</ul></nav>
    </div>`;

  const botao = topo.querySelector('.menu-botao');
  const menu = topo.querySelector('.menu');
  botao.addEventListener('click', () => {
    const aberto = menu.classList.toggle('aberto');
    botao.setAttribute('aria-expanded', aberto);
  });

  const rodape = document.getElementById('rodape');
  rodape.className = 'rodape';
  rodape.innerHTML = `<div class="container">
      <div>
        <img src="assets/img/logo-nexpay-claro.svg" alt="NexPay">
        <p style="margin-top:12px">Compare maquininhas de cartão e apps de celular e descubra a melhor opção para o seu negócio.</p>
        <p>As taxas são de referência e mudam com frequência. Confira sempre no site oficial de cada empresa.</p>
      </div>
      <div>
        <h4>Navegação</h4>
        <ul>${LINKS.map((l) => `<li><a href="${l.href}">${l.texto}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h4>Projeto</h4>
        <ul>
          <li><a href="comparar.html">Comparar maquininhas</a></li>
          <li><a href="${usuario ? 'conta.html' : 'entrar.html'}">${usuario ? 'Minha conta' : 'Entrar ou cadastrar'}</a></li>
        </ul>
      </div>
      <div class="rodape-fim">NexPay · Projeto Integrador · Senac Joinville · ${new Date().getFullYear()}</div>
    </div>`;

  return usuario;
}
