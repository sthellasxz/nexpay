# NexPay

Site do Projeto Integrador (Senac Joinville) para pesquisar, comparar e receber recomendação de maquininhas de cartão e apps que transformam o celular em maquininha.

**Tecnologias:** HTML, CSS e JavaScript no front-end; banco PostgreSQL no Supabase (com login, senhas criptografadas e regras de segurança RLS); Chart.js nos gráficos.

## Como rodar

O site é estático: basta servir a pasta `NexPay` com qualquer servidor local, por exemplo:

```
npx http-server NexPay -p 5510
```

e abrir `http://localhost:5510`. (Abrir o arquivo direto com duplo clique não funciona, porque os módulos JavaScript precisam de um servidor.)

## Estrutura

```
NexPay/
├── index.html          página inicial
├── marcas.html         marcas e vantagens
├── catalogo.html       catálogo com busca, filtros e seleção para comparar
├── maquininha.html     detalhes, taxas, gráfico e simulador (?slug=...)
├── comparar.html       comparação lado a lado com gráfico (exige login)
├── recomendacao.html   formulário e sistema de recomendação
├── contato.html        formulário de contato
├── entrar.html         login e cadastro
├── conta.html          área do usuário: dados, favoritos e histórico
├── admin.html          painel admin: relatórios, CRUD, contatos e logs
├── marca.html          identidade visual (logo e cores)
├── assets/img/         logos em SVG
├── css/                cores.css (paleta) e estilo.css (estilos gerais)
├── js/
│   ├── supabase.js     conexão com o banco
│   ├── layout.js       cabeçalho, rodapé e login
│   ├── util.js         funções de apoio (formatação, taxas, desenhos)
│   ├── recomendacao.js algoritmo de recomendação
│   └── admin.js        lógica do painel admin
└── database/
    ├── 01_estrutura.sql  tabelas, gatilhos e regras de segurança
    └── 02_dados.sql      marcas, maquininhas e taxas (pesquisa de 08/10/2026)
```

## Como funciona a recomendação

1. Elimina as opções que não servem (ex.: precisa de impressora, só aceita PJ, passa do orçamento).
2. Calcula o custo mensal de cada maquininha: faturamento × (mix de débito, crédito, parcelado e Pix × taxa de cada um) + aluguel.
3. Dá uma nota combinando custo, adequação ao negócio, investimento inicial e prazo de recebimento, com pesos que mudam conforme a prioridade escolhida.
4. Mostra as 3 melhores, o ranking completo e grava a recomendação em `logs_recomendacoes`.

## Administrador

Depois de criar a conta pelo site, transforme o usuário em admin no SQL Editor do Supabase:

```sql
update public.perfis set tipo = 'admin'
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

## Aviso

As taxas são de referência, pesquisadas em sites oficiais e comparadores, e mudam com frequência. Confira sempre no site oficial de cada empresa.
