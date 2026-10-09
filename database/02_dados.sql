-- =====================================================================
-- NexPay — dados iniciais (pesquisa feita em 08/10/2026)
-- Taxas para bandeiras Visa/Mastercard no plano de entrada de cada marca.
-- As taxas mudam com frequência: confira sempre no site oficial.
-- =====================================================================

-- Os gatilhos de log ficam desligados durante a carga inicial
alter table public.marcas disable trigger log_marcas;
alter table public.maquininhas disable trigger log_maquininhas;
alter table public.taxas disable trigger log_taxas;

-- ---------- Marcas ----------
insert into public.marcas (nome, slug, grupo, descricao, site_url, cor) values
('PagBank', 'pagbank', 'PagSeguro (grupo UOL)', 'Empresa brasileira que oferece maquininhas sem aluguel, como a Moderninha e a Minizinha. Foco em praticidade, conta digital integrada e recebimento na hora. Ideal para autônomos e pequenos negócios.', 'https://pagbank.com.br', '#FFC801'),
('Cielo', 'cielo', 'Bradesco e Banco do Brasil', 'Uma das maiores operadoras de maquininhas do Brasil. Trabalha com modelos robustos (como a LIO) e tem ampla aceitação de bandeiras. Boa para empresas de médio e grande porte.', 'https://www.cielo.com.br', '#00AEEF'),
('Stone', 'stone', 'StoneCo', 'Empresa brasileira focada em atendimento e tecnologia. Oferece maquininhas robustas com aluguel e serviços financeiros integrados. Taxas negociadas conforme o faturamento.', 'https://www.stone.com.br', '#00A868'),
('Ton', 'ton', 'StoneCo', 'Marca da Stone voltada a autônomos e pequenos empreendedores, com maquininhas sem aluguel e o TapTon, que transforma o celular em maquininha.', 'https://www.ton.com.br', '#00C853'),
('InfinitePay', 'infinitepay', 'CloudWalk', 'Fintech com taxas agressivas e recebimento rápido. Tem uma única maquininha (Smart) e o InfiniteTap para vender pelo celular por aproximação.', 'https://www.infinitepay.io', '#1F1F1F'),
('Mercado Pago', 'mercado-pago', 'Mercado Livre', 'Do grupo Mercado Livre, é referência em maquininhas integradas ao e-commerce. A linha Point é acessível e fácil de usar. Perfeita para quem já vende online.', 'https://www.mercadopago.com.br', '#00B1EA'),
('SafraPay', 'safrapay', 'Banco Safra', 'Do banco Safra, combina pagamentos com soluções bancárias. Voltada a empresas de alto faturamento e correntistas do banco.', 'https://www.safra.com.br/safrapay', '#0B2D5B'),
('Getnet', 'getnet', 'Santander', 'Empresa do grupo Santander, com foco em segurança e integração bancária. Tem opções sem aluguel para pessoa física e modelos com aluguel para empresas.', 'https://site.getnet.com.br', '#EC0000'),
('BIN', 'bin', 'Fiserv', 'Marca da Fiserv no Brasil. Maquininhas simples e eficientes para o varejo, com aluguel mensal. Atende apenas empresas (CNPJ e MEI).', 'https://www.bin.com.br', '#FF6B00'),
('SumUp', 'sumup', 'SumUp (Reino Unido)', 'Fintech europeia com maquininhas sem aluguel e conexão fácil via app. Muito usada por autônomos e pequenos empreendedores.', 'https://www.sumup.com.br', '#111111'),
('Rede', 'rede', 'Itaú Unibanco', 'Pertence ao Itaú e oferece maquininhas com integração bancária. Ideal para empresas que já têm conta no Itaú. Taxas negociadas por contrato.', 'https://www.userede.com.br', '#FF7800'),
('Nubank', 'nubank', 'Nu Holdings', 'Banco digital que oferece o NuTap, recurso que transforma o celular em maquininha para clientes com conta PJ.', 'https://nubank.com.br', '#820AD1');

insert into public.vantagens_marcas (marca_id, vantagem)
select m.id, v.vantagem
from (values
  ('pagbank', 'Sem aluguel'), ('pagbank', 'Recebimento na hora'), ('pagbank', 'Conta digital integrada'),
  ('cielo', 'Ampla aceitação de bandeiras'), ('cielo', 'Modelos robustos'), ('cielo', 'Cielo Tap no celular'),
  ('stone', 'Atendimento especializado'), ('stone', 'Taxas negociáveis por volume'), ('stone', 'Gestão financeira integrada'),
  ('ton', 'Sem aluguel'), ('ton', 'Pix grátis'), ('ton', 'TapTon com taxas baixas'),
  ('infinitepay', 'Taxas entre as menores do mercado'), ('infinitepay', 'Pix grátis'), ('infinitepay', 'Recebimento em 1 dia útil'),
  ('mercado-pago', 'Integração com Mercado Livre'), ('mercado-pago', 'Recebimento na hora'), ('mercado-pago', 'Point Tap gratuito'),
  ('safrapay', 'Integração com o Banco Safra'), ('safrapay', 'Taxas sem antecipação baixas'),
  ('getnet', 'Integração com o Santander'), ('getnet', 'Opção sem aluguel para PF'), ('getnet', 'Get Tap gratuito'),
  ('bin', 'Aceita mais de 30 bandeiras'), ('bin', 'Recibo impresso'),
  ('sumup', 'Sem aluguel'), ('sumup', 'Pix grátis'), ('sumup', 'Recebimento na hora'),
  ('rede', 'Integração com o Itaú'), ('rede', 'Marca consolidada'),
  ('nubank', 'Sem custo de aquisição'), ('nubank', 'Pix grátis'), ('nubank', 'Recebimento no mesmo dia')
) as v(slug, vantagem)
join public.marcas m on m.slug = v.slug;

-- ---------- Maquininhas e apps de celular ----------
insert into public.maquininhas
  (marca_id, modelo, slug, tipo, descricao, preco, aluguel_mensal, conexao, imprime_comprovante,
   aceita_pix, precisa_celular, prazo_recebimento, requisitos, publico, volume_mensal, popular,
   pros, contras, observacao_taxas, fonte_url, taxas_atualizadas_em)
select m.id, v.modelo, v.slug, v.tipo::public.tipo_dispositivo, v.descricao, v.preco, v.aluguel,
       v.conexao, v.imprime, v.pix, v.celular, v.prazo, v.requisitos, v.publico, v.volume, v.popular,
       v.pros, v.contras, v.obs, v.fonte, date '2026-10-08'
from (values
  -- PagBank
  ('pagbank', 'Minizinha NFC 2', 'pagbank-minizinha-nfc-2', 'maquininha', 'Maquininha compacta que funciona conectada ao celular por Bluetooth, pelo app PagBank.', 15.00, 0.00, array['bluetooth','nfc'], false, true, true, 'Na hora', 'Celular com Bluetooth e app PagBank', 'PF e PJ', 'pequeno', true,
    array['Muito barata','Recebimento na hora','Aceita aproximação'], array['Depende do celular','Sem comprovante impresso'], 'Plano Essencial (sem mínimo de vendas). No plano Super Max as taxas caem para 1,44% no débito e 3,49% no crédito à vista.', 'https://pagbank.com.br/para-seu-negocio/maquininhas'),
  ('pagbank', 'Minizinha Chip 3', 'pagbank-minizinha-chip-3', 'maquininha', 'Funciona sozinha, com chip de internet e Wi-Fi integrados, sem precisar do celular.', 47.88, 0.00, array['chip','wifi','nfc'], false, true, false, 'Na hora', null, 'PF e PJ', 'pequeno', true,
    array['Não depende do celular','Chip com internet grátis','Barata'], array['Sem comprovante impresso'], 'Plano Essencial (sem mínimo de vendas). No plano Super Max as taxas caem para 1,44% no débito e 3,49% no crédito à vista.', 'https://pagbank.com.br/para-seu-negocio/maquininhas'),
  ('pagbank', 'Moderninha Plus 2', 'pagbank-moderninha-plus-2', 'maquininha', 'Maquininha com chip e plano de dados grátis, tela maior e boa autonomia de bateria.', 59.88, 0.00, array['chip','nfc'], false, true, false, 'Na hora', null, 'PF e PJ', 'medio', false,
    array['Chip com plano de dados grátis','Não depende do celular'], array['Sem comprovante impresso'], 'Plano Essencial (sem mínimo de vendas). No plano Super Max as taxas caem para 1,44% no débito e 3,49% no crédito à vista.', 'https://pagbank.com.br/para-seu-negocio/maquininhas'),
  ('pagbank', 'Moderninha ProFit', 'pagbank-moderninha-profit', 'maquininha', 'Maquininha com Wi-Fi e chip que imprime comprovante ou envia por SMS.', 83.88, 0.00, array['chip','wifi','nfc'], true, true, false, 'Na hora', null, 'PF e PJ', 'medio', false,
    array['Imprime comprovante','Wi-Fi e chip'], array['Mais cara que as Minizinhas'], 'Plano Essencial (sem mínimo de vendas). No plano Super Max as taxas caem para 1,44% no débito e 3,49% no crédito à vista.', 'https://pagbank.com.br/para-seu-negocio/maquininhas'),
  ('pagbank', 'Moderninha Pro 2', 'pagbank-moderninha-pro-2', 'maquininha', 'Maquininha com chip 4G grátis e impressora, ideal para lojas físicas.', 107.88, 0.00, array['chip','wifi','nfc'], true, true, false, 'Na hora', null, 'PF e PJ', 'medio', true,
    array['Imprime comprovante','Internet 4G grátis','Robusta'], array['Mais pesada'], 'Plano Essencial (sem mínimo de vendas). No plano Super Max as taxas caem para 1,44% no débito e 3,49% no crédito à vista.', 'https://pagbank.com.br/para-seu-negocio/maquininhas'),
  ('pagbank', 'Moderninha Smart 2', 'pagbank-moderninha-smart-2', 'maquininha', 'Maquininha smart com tela touch, Wi-Fi, internet grátis e impressora, com aplicativos de gestão.', 196.08, 0.00, array['chip','wifi','nfc'], true, true, false, 'Na hora', null, 'PF e PJ', 'grande', false,
    array['Tela touch','Imprime comprovante','Apps de gestão'], array['Preço mais alto da linha'], 'Plano Essencial (sem mínimo de vendas). No plano Super Max as taxas caem para 1,44% no débito e 3,49% no crédito à vista.', 'https://pagbank.com.br/para-seu-negocio/maquininhas'),

  -- Cielo
  ('cielo', 'Cielo Zip', 'cielo-zip', 'maquininha', 'Maquininha compacta da Cielo, com Pix por aproximação.', 0.00, 0.00, array['chip','wifi','nfc'], false, true, false, 'Até 2 dias úteis', null, 'PF e PJ', 'pequeno', false,
    array['Aceita muitas bandeiras','Pix por aproximação'], array['Taxas acima das fintechs'], 'Taxas da Cielo sem aluguel (débito e crédito à vista). Parcelado sob consulta. Preço sob consulta no site.', 'https://www.cielo.com.br'),
  ('cielo', 'Cielo Flash', 'cielo-flash', 'maquininha', 'Maquininha com Wi-Fi/3G e impressora, sem aluguel.', 274.80, 0.00, array['chip','wifi','nfc'], true, true, false, 'Até 2 dias úteis', null, 'PF e PJ', 'medio', true,
    array['Imprime comprovante','Aceita muitas bandeiras'], array['Preço alto','Taxa no Pix'], 'Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/cielo'),
  ('cielo', 'Cielo LIO On', 'cielo-lio-on', 'maquininha', 'Maquininha smart com sistema Android, tela touch e impressora.', 238.80, 0.00, array['chip','wifi','nfc'], true, false, false, 'Até 2 dias úteis', null, 'PF e PJ', 'grande', true,
    array['Tela touch','Aplicativos de gestão','Imprime comprovante'], array['Taxas altas no parcelado'], 'Parcelado divulgado apenas em 12x. Pix não informado.', 'https://www.calculadoradetaxas.com.br/public/cielo'),
  ('cielo', 'Cielo Tap', 'cielo-tap', 'celular', 'Transforma o celular em maquininha para receber por aproximação (NFC).', 0.00, 0.00, array['nfc'], false, false, true, 'Até 2 dias úteis', 'Smartphone Android com NFC', 'PF e PJ', 'pequeno', false,
    array['Sem custo de aquisição','Cobra só quando vende'], array['Só aproximação','Sem comprovante impresso'], 'Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/cielo'),

  -- Stone
  ('stone', 'Maquininha Stone', 'stone-pos', 'maquininha', 'Maquininha com Wi-Fi/3G e impressora, contratada com aluguel mensal e taxas negociadas com o consultor.', 0.00, 0.00, array['chip','wifi','nfc'], true, true, false, 'D+30 (antecipação disponível)', null, 'PJ', 'grande', true,
    array['Atendimento especializado','Taxas negociáveis','Imprime comprovante'], array['Aluguel mensal','Taxas não divulgadas publicamente'], 'Stone não publica tabela: taxas negociadas por faturamento. Valores de referência; aluguel sob consulta.', 'https://www.maquinatop.com.br/taxa-maquininha'),

  -- Ton
  ('ton', 'T1', 'ton-t1', 'maquininha', 'Maquininha de entrada da Ton, conectada ao celular por Bluetooth.', 16.80, 0.00, array['bluetooth','nfc'], false, true, true, '1 dia útil', 'Celular com Bluetooth e app Ton', 'PF e PJ', 'pequeno', true,
    array['Muito barata','Pix grátis'], array['Depende do celular','Parcelado caro'], 'Plano 1 dia útil, até R$ 3 mil/mês. Taxas promocionais de 0,57% nos primeiros 30 dias.', 'https://www.calculadoradetaxas.com.br/public/ton'),
  ('ton', 'T2+', 'ton-t2', 'maquininha', 'Maquininha com Wi-Fi e chip 3G, funciona sem celular.', 39.90, 0.00, array['chip','wifi','nfc'], false, true, false, '1 dia útil', null, 'PF e PJ', 'pequeno', false,
    array['Não depende do celular','Pix grátis'], array['Sem comprovante impresso','Parcelado caro'], 'Plano 1 dia útil, até R$ 3 mil/mês. Taxas promocionais de 0,57% nos primeiros 30 dias.', 'https://www.calculadoradetaxas.com.br/public/ton'),
  ('ton', 'T3', 'ton-t3', 'maquininha', 'Maquininha com Wi-Fi/3G e impressora de comprovante.', 86.40, 0.00, array['chip','wifi','nfc'], true, true, false, '1 dia útil', null, 'PF e PJ', 'medio', true,
    array['Imprime comprovante','Pix grátis'], array['Parcelado caro'], 'Plano 1 dia útil, até R$ 3 mil/mês. Taxas promocionais de 0,57% nos primeiros 30 dias.', 'https://www.calculadoradetaxas.com.br/public/ton'),
  ('ton', 'T3 Smart', 'ton-t3-smart', 'maquininha', 'Maquininha smart com tela touch, Wi-Fi/3G e impressora.', 153.50, 0.00, array['chip','wifi','nfc'], true, true, false, '1 dia útil', null, 'PF e PJ', 'grande', false,
    array['Tela touch','Imprime comprovante','Pix grátis'], array['Parcelado caro'], 'Plano 1 dia útil, até R$ 3 mil/mês. Taxas promocionais de 0,57% nos primeiros 30 dias.', 'https://www.calculadoradetaxas.com.br/public/ton'),
  ('ton', 'TapTon', 'ton-tapton', 'celular', 'Transforma o celular em maquininha para vendas por aproximação (NFC).', 0.00, 0.00, array['nfc'], false, true, true, '1 dia útil', 'Smartphone Android com NFC', 'PF e PJ', 'pequeno', true,
    array['Sem custo de aquisição','Débito muito baixo','Parcelado barato'], array['Só aproximação','Só Android'], 'Plano 1 dia útil.', 'https://www.calculadoradetaxas.com.br/public/ton'),

  -- InfinitePay
  ('infinitepay', 'Maquininha Smart (InfiniteSmart)', 'infinitepay-smart', 'maquininha', 'Única maquininha da InfinitePay: smart, com tela touch e impressora.', 199.00, 0.00, array['chip','wifi','nfc'], true, true, false, '1 dia útil', null, 'PF e PJ', 'medio', true,
    array['Taxas baixas','Pix grátis','Parcelado barato'], array['Preço de compra mais alto'], 'Plano Inicial (até R$ 20 mil/mês), recebimento em 1 dia útil.', 'https://www.infinitepay.io/taxas'),
  ('infinitepay', 'InfiniteTap', 'infinitepay-infinitetap', 'celular', 'Transforma o celular em maquininha, com recebimento rápido e taxas competitivas.', 0.00, 0.00, array['nfc'], false, true, true, '1 dia útil', 'Android 10+ ou iPhone com NFC', 'PF e PJ', 'pequeno', true,
    array['Sem custo de aquisição','Funciona no iPhone','Pix grátis'], array['Só aproximação'], 'Plano Inicial (até R$ 20 mil/mês), recebimento em 1 dia útil.', 'https://www.infinitepay.io/taxas'),

  -- Mercado Pago
  ('mercado-pago', 'Point Mini NFC', 'mercado-pago-point-mini-nfc', 'maquininha', 'Maquininha compacta conectada ao celular por Bluetooth, pelo app Mercado Pago.', 23.31, 0.00, array['bluetooth','nfc'], false, true, true, 'Na hora', 'Celular com Bluetooth e app Mercado Pago', 'PF e PJ', 'pequeno', true,
    array['Barata','Recebimento na hora'], array['Depende do celular','Taxas altas'], 'Plano Na Hora.', 'https://www.calculadoradetaxas.com.br/public/mercado-pago'),
  ('mercado-pago', 'Point Air 2', 'mercado-pago-point-air-2', 'maquininha', 'Maquininha com Wi-Fi e chip incluso.', 53.91, 0.00, array['chip','wifi','nfc'], false, true, false, 'Na hora', null, 'PF e PJ', 'pequeno', false,
    array['Chip incluso','Recebimento na hora'], array['Sem comprovante impresso','Taxas altas'], 'Plano Na Hora.', 'https://www.calculadoradetaxas.com.br/public/mercado-pago'),
  ('mercado-pago', 'Point Pro 3', 'mercado-pago-point-pro-3', 'maquininha', 'Maquininha com Wi-Fi/3G e impressora.', 98.91, 0.00, array['chip','wifi','nfc'], true, true, false, 'Na hora', null, 'PF e PJ', 'medio', true,
    array['Imprime comprovante','Recebimento na hora'], array['Taxas altas no parcelado'], 'Plano Na Hora.', 'https://www.calculadoradetaxas.com.br/public/mercado-pago'),
  ('mercado-pago', 'Point Smart 2', 'mercado-pago-point-smart-2', 'maquininha', 'Maquininha smart com Android, tela touch e impressora.', 179.91, 0.00, array['chip','wifi','nfc'], true, true, false, 'Na hora', null, 'PF e PJ', 'grande', false,
    array['Tela touch','Imprime comprovante'], array['Taxas altas no parcelado'], 'Plano Na Hora.', 'https://www.calculadoradetaxas.com.br/public/mercado-pago'),
  ('mercado-pago', 'Point Tap', 'mercado-pago-point-tap', 'celular', 'Transforma o celular em maquininha por aproximação, pelo app Mercado Pago.', 0.00, 0.00, array['nfc'], false, false, true, 'Na hora, 14 ou 30 dias', 'Android ou iPhone com NFC', 'PF e PJ', 'pequeno', false,
    array['Gratuito','Funciona no iPhone','Parcelado barato'], array['Só aproximação'], 'Plano Na Hora. Pix não informado para o Tap.', 'https://www.calculadoradetaxas.com.br/public/mercado-pago'),

  -- SafraPay
  ('safrapay', 'SafraPay Smart', 'safrapay-smart', 'maquininha', 'Maquininha smart com Wi-Fi, impressora térmica e NFC.', 0.00, 0.00, array['wifi','nfc'], true, false, false, '1 dia útil', null, 'PF e PJ', 'grande', false,
    array['Integração com o Banco Safra'], array['Não aceita Pix','Restrita a alto faturamento'], 'Novos contratos só para faturamento acima de R$ 100 mil/mês. Aluguel sob consulta. Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/safrapay'),
  ('safrapay', 'SafraPay Pro', 'safrapay-pro', 'maquininha', 'Maquininha para alto volume de vendas, com impressora integrada.', 0.00, 0.00, array['wifi','nfc'], true, false, false, '1 dia útil', null, 'PJ', 'grande', false,
    array['Indicada para alto volume'], array['Não aceita Pix','Restrita a alto faturamento'], 'Novos contratos só para faturamento acima de R$ 100 mil/mês. Aluguel sob consulta. Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/safrapay'),

  -- Getnet
  ('getnet', 'Get Lite', 'getnet-get-lite', 'maquininha', 'Maquininha sem aluguel para pessoa física, com Wi-Fi/3G e impressora.', 94.80, 0.00, array['chip','wifi','nfc'], true, false, false, '2 dias úteis', null, 'PF', 'pequeno', false,
    array['Sem aluguel','Imprime comprovante'], array['Só pessoa física'], 'Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/getnet'),
  ('getnet', 'Get Clássica', 'getnet-get-classica', 'maquininha', 'Maquininha com aluguel para empresas, com Wi-Fi/3G e impressora.', 0.00, 79.90, array['chip','wifi','nfc'], true, false, false, '2 dias úteis', null, 'PJ', 'medio', false,
    array['Aluguel isento acima de R$ 20 mil/mês','Imprime comprovante'], array['Aluguel mensal'], 'Aluguel isento para faturamento acima de R$ 20 mil/mês. Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/getnet'),
  ('getnet', 'Get Smart', 'getnet-get-smart', 'maquininha', 'Maquininha smart com tela touch para empresas.', 0.00, 129.90, array['chip','wifi','nfc'], true, false, false, '2 dias úteis', null, 'PJ', 'grande', false,
    array['Tela touch','Aluguel isento acima de R$ 40 mil/mês'], array['Aluguel alto'], 'Aluguel isento para faturamento acima de R$ 40 mil/mês. Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/getnet'),
  ('getnet', 'Get Tap', 'getnet-get-tap', 'celular', 'Transforma o celular Android em maquininha por aproximação.', 0.00, 0.00, array['nfc'], false, false, true, '2 dias úteis', 'Android 12+ com NFC', 'PF e PJ', 'pequeno', false,
    array['Gratuito','Débito baixo'], array['Só Android','Parcelado caro'], 'Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/getnet'),

  -- BIN
  ('bin', 'Bin Smart', 'bin-smart', 'maquininha', 'Maquininha smart com Wi-Fi/3G, recibo impresso e mais de 30 bandeiras.', 0.00, 0.00, array['chip','wifi','nfc'], true, false, false, '1 dia útil (antecipado)', null, 'PJ e MEI', 'medio', false,
    array['Muitas bandeiras','Imprime comprovante'], array['Aluguel mensal','Não atende pessoa física'], 'Aluguel mensal sob consulta no site oficial. Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/bin'),

  -- SumUp
  ('sumup', 'SumUp Top', 'sumup-top', 'maquininha', 'Maquininha compacta conectada ao celular por Bluetooth.', 52.80, 0.00, array['bluetooth','nfc'], false, true, true, 'Na hora', 'Celular com Bluetooth e app SumUp', 'PF e PJ', 'pequeno', true,
    array['Débito baixo','Pix grátis','Recebimento na hora'], array['Depende do celular'], 'Plano Na Hora, até R$ 20 mil/mês.', 'https://www.calculadoradetaxas.com.br/public/sumup'),
  ('sumup', 'SumUp Solo', 'sumup-solo', 'maquininha', 'Maquininha com Wi-Fi e chip incluso, funciona sem celular.', 118.80, 0.00, array['chip','wifi','nfc'], false, true, false, 'Na hora', null, 'PF e PJ', 'medio', false,
    array['Não depende do celular','Pix grátis'], array['Sem comprovante impresso'], 'Plano Na Hora, até R$ 20 mil/mês.', 'https://www.calculadoradetaxas.com.br/public/sumup'),
  ('sumup', 'SumUp Smart', 'sumup-smart', 'maquininha', 'Maquininha smart com Wi-Fi/3G e impressora térmica.', 178.80, 0.00, array['chip','wifi','nfc'], true, true, false, 'Na hora', null, 'PF e PJ', 'grande', false,
    array['Imprime comprovante','Pix grátis'], array['Preço de compra mais alto'], 'Plano Na Hora, até R$ 20 mil/mês.', 'https://www.calculadoradetaxas.com.br/public/sumup'),
  ('sumup', 'SumUp Tap to Pay', 'sumup-tap-to-pay', 'celular', 'Recebe por aproximação direto no celular, pelo app SumUp.', 0.00, 0.00, array['nfc'], false, true, true, 'Na hora', 'Android 11+ ou iOS 17+ com NFC', 'PF e PJ', 'pequeno', false,
    array['Sem custo de aquisição','Funciona no iPhone'], array['Só aproximação'], 'Plano Na Hora, até R$ 20 mil/mês.', 'https://www.calculadoradetaxas.com.br/public/sumup'),

  -- Rede
  ('rede', 'Rede Smart', 'rede-smart', 'maquininha', 'Maquininha smart da Rede (Itaú), com Wi-Fi/3G e impressora.', 0.00, 0.00, array['chip','wifi','nfc'], true, false, false, '2 dias úteis', null, 'PJ', 'grande', false,
    array['Integração com o Itaú','Imprime comprovante'], array['Aluguel mensal','Não aceita Pix na maquininha'], 'Taxas negociadas por contrato; valores do plano público. Aluguel sob consulta. Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/rede'),
  ('rede', 'Rede POS', 'rede-pos', 'maquininha', 'Maquininha tradicional de balcão da Rede, com impressora.', 0.00, 0.00, array['chip','wifi'], true, false, false, '2 dias úteis', null, 'PJ', 'medio', false,
    array['Integração com o Itaú','Robusta'], array['Aluguel mensal','Não aceita Pix na maquininha'], 'Taxas negociadas por contrato; valores do plano público. Aluguel sob consulta. Parcelado divulgado apenas em 12x.', 'https://www.calculadoradetaxas.com.br/public/rede'),

  -- Nubank
  ('nubank', 'NuTap', 'nubank-nutap', 'celular', 'Transforma o celular em maquininha por aproximação para clientes Nubank PJ.', 0.00, 0.00, array['nfc'], false, true, true, 'Mesmo dia', 'Android 8.1+ ou iPhone com NFC e conta PJ no Nubank', 'PJ e MEI', 'pequeno', true,
    array['Gratuito','Débito baixo','Funciona no iPhone'], array['Exige conta PJ Nubank','Só aproximação'], 'Plano Mesmo dia.', 'https://www.calculadoradetaxas.com.br/comparar/nutap-vs-infinitetap')
) as v(marca, modelo, slug, tipo, descricao, preco, aluguel, conexao, imprime, pix, celular, prazo, requisitos, publico, volume, popular, pros, contras, obs, fonte)
join public.marcas m on m.slug = v.marca;

-- ---------- Taxas ----------
-- Função auxiliar temporária: grava a mesma tabela de taxas para vários modelos.
-- parc = taxas de 2x a 12x (posição 1 = 2x); valores nulos são ignorados.
create function pg_temp.gravar_taxas(slugs text[], pix numeric, debito numeric, vista numeric, parc numeric[])
returns void language plpgsql as $$
declare
  mid bigint;
  i int;
begin
  for mid in select id from public.maquininhas where slug = any(slugs) loop
    if pix is not null then
      insert into public.taxas (maquininha_id, tipo, valor) values (mid, 'pix', pix);
    end if;
    if debito is not null then
      insert into public.taxas (maquininha_id, tipo, valor) values (mid, 'debito', debito);
    end if;
    if vista is not null then
      insert into public.taxas (maquininha_id, tipo, valor) values (mid, 'credito_vista', vista);
    end if;
    if parc is not null then
      for i in 1 .. array_length(parc, 1) loop
        if parc[i] is not null then
          insert into public.taxas (maquininha_id, tipo, parcelas, valor) values (mid, 'credito_parcelado', i + 1, parc[i]);
        end if;
      end loop;
    end if;
  end loop;
end $$;

-- PagBank — plano Essencial, na hora
select pg_temp.gravar_taxas(
  array['pagbank-minizinha-nfc-2','pagbank-minizinha-chip-3','pagbank-moderninha-plus-2','pagbank-moderninha-profit','pagbank-moderninha-pro-2','pagbank-moderninha-smart-2'],
  0.99, 2.39, 4.99, array[9.91,11.29,12.64,13.97,15.27,16.55,17.81,19.04,20.24,21.43,22.59]);

-- Cielo
select pg_temp.gravar_taxas(array['cielo-zip'], null, 1.90, 4.30, null);
select pg_temp.gravar_taxas(array['cielo-flash'], 0.99, 1.96, 4.42, array[null,null,null,null,null,null,null,null,null,null,19.78]::numeric[]);
select pg_temp.gravar_taxas(array['cielo-lio-on'], null, 2.03, 4.56, array[null,null,null,null,null,null,null,null,null,null,20.69]::numeric[]);
select pg_temp.gravar_taxas(array['cielo-tap'], null, 1.07, 3.48, array[null,null,null,null,null,null,null,null,null,null,16.07]::numeric[]);

-- Stone — valores de referência (taxa negociada)
select pg_temp.gravar_taxas(array['stone-pos'], 0, 0.79, 2.69, array[null,null,null,null,null,null,null,null,null,null,9.50]::numeric[]);

-- Ton — 1 dia útil, até R$ 3 mil
select pg_temp.gravar_taxas(array['ton-t1','ton-t2','ton-t3','ton-t3-smart'],
  0, 1.69, 3.86, array[9.86,11.24,12.59,13.92,15.22,16.50,17.76,18.99,20.19,20.39,20.39]);
select pg_temp.gravar_taxas(array['ton-tapton'],
  0, 0.57, 3.05, array[5.75,6.55,8.29,8.55,8.65,9.95,10.09,10.79,11.49,12.19,12.29]);

-- InfinitePay — plano Inicial, 1 dia útil
select pg_temp.gravar_taxas(array['infinitepay-smart','infinitepay-infinitetap'],
  0, 1.37, 3.15, array[5.39,6.12,6.85,7.57,8.28,8.99,9.69,10.38,11.06,11.74,12.40]);

-- Mercado Pago — na hora
select pg_temp.gravar_taxas(array['mercado-pago-point-mini-nfc','mercado-pago-point-air-2','mercado-pago-point-pro-3','mercado-pago-point-smart-2'],
  0.49, 1.99, 4.98, array[9.90,11.28,12.64,13.97,15.27,16.55,17.81,19.04,20.24,21.43,22.59]);
select pg_temp.gravar_taxas(array['mercado-pago-point-tap'],
  null, 0.89, 3.09, array[5.79,6.09,7.99,8.09,8.19,9.49,9.68,10.37,11.05,12.27,12.38]);

-- SafraPay — PJ, 1 dia útil
select pg_temp.gravar_taxas(array['safrapay-smart','safrapay-pro'], null, 1.89, 4.49, array[null,null,null,null,null,null,null,null,null,null,18.02]::numeric[]);

-- Getnet
select pg_temp.gravar_taxas(array['getnet-get-lite','getnet-get-classica','getnet-get-smart'], null, 1.39, 3.49, array[null,null,null,null,null,null,null,null,null,null,12.88]::numeric[]);
select pg_temp.gravar_taxas(array['getnet-get-tap'], null, 0.99, 2.98, array[null,null,null,null,null,null,null,null,null,null,15.88]::numeric[]);

-- BIN
select pg_temp.gravar_taxas(array['bin-smart'], null, 1.89, 3.99, array[null,null,null,null,null,null,null,null,null,null,12.79]::numeric[]);

-- SumUp — na hora, até R$ 20 mil
select pg_temp.gravar_taxas(array['sumup-top','sumup-solo','sumup-smart','sumup-tap-to-pay'],
  0, 0.99, 3.49, array[6.49,7.49,7.99,8.49,9.49,9.99,10.49,10.99,11.49,12.49,13.99]);

-- Rede — plano público
select pg_temp.gravar_taxas(array['rede-smart','rede-pos'], null, 1.99, 4.97, array[null,null,null,null,null,null,null,null,null,null,26.86]::numeric[]);

-- Nubank — mesmo dia
select pg_temp.gravar_taxas(array['nubank-nutap'],
  0, 0.89, 3.09, array[5.79,6.09,7.99,8.09,8.19,9.49,9.68,10.37,11.05,12.27,12.38]);

-- ---------- Especificações ----------
insert into public.especificacoes (maquininha_id, tipo, valor)
select m.id, e.tipo, e.valor
from public.maquininhas m
cross join lateral (values
  ('Conexão', array_to_string(m.conexao, ', ')),
  ('Comprovante', case when m.imprime_comprovante then 'Impresso' else 'Digital (SMS/e-mail)' end),
  ('Funciona sem celular', case when m.precisa_celular then 'Não' else 'Sim' end),
  ('Público', coalesce(m.publico, '—'))
) as e(tipo, valor);

-- ---------- Recursos ----------
insert into public.recursos (nome, descricao) values
('Impressora', 'Imprime o comprovante da venda'),
('Chip de internet', 'Conecta pela rede móvel sem depender de Wi-Fi'),
('Wi-Fi', 'Conecta pela rede Wi-Fi'),
('Bluetooth', 'Conecta ao celular por Bluetooth'),
('Aproximação (NFC)', 'Aceita pagamentos por aproximação'),
('Pix', 'Aceita Pix na maquininha ou no app'),
('Sem celular', 'Funciona sozinha, sem precisar do celular'),
('Sem aluguel', 'Compra única, sem mensalidade');

insert into public.maquininha_recursos (maquininha_id, recurso_id)
select m.id, r.id
from public.maquininhas m
join public.recursos r on
     (r.nome = 'Impressora' and m.imprime_comprovante)
  or (r.nome = 'Chip de internet' and 'chip' = any(m.conexao))
  or (r.nome = 'Wi-Fi' and 'wifi' = any(m.conexao))
  or (r.nome = 'Bluetooth' and 'bluetooth' = any(m.conexao))
  or (r.nome = 'Aproximação (NFC)' and 'nfc' = any(m.conexao))
  or (r.nome = 'Pix' and m.aceita_pix)
  or (r.nome = 'Sem celular' and not m.precisa_celular)
  or (r.nome = 'Sem aluguel' and m.aluguel_mensal = 0 and m.slug not in ('stone-pos','safrapay-smart','safrapay-pro','bin-smart','rede-smart','rede-pos'));

-- ---------- Tipos de negócio ----------
insert into public.tipos_negocio (nome, slug, descricao) values
('Autônomo / ambulante', 'autonomo', 'Vendedor de rua, feirante, prestador que vende em vários lugares'),
('Loja / comércio', 'loja', 'Loja física, mercado, papelaria, boutique'),
('Alimentação', 'alimentacao', 'Restaurante, lanchonete, padaria, food truck'),
('Delivery', 'delivery', 'Entregas e vendas na casa do cliente'),
('Beleza e serviços', 'servicos', 'Salão, barbearia, manicure, oficina, consertos'),
('Saúde', 'saude', 'Clínicas, consultórios, farmácias'),
('Eventos e festas', 'eventos', 'Feiras, shows, quermesses, eventos'),
('Venda online', 'online', 'Quem também vende pela internet e redes sociais');

insert into public.maquininha_tipo_negocio (maquininha_id, tipo_negocio_id)
select m.id, t.id
from public.maquininhas m
join public.tipos_negocio t on
     (t.slug = 'autonomo'    and (m.tipo = 'celular' or m.volume_mensal = 'pequeno'))
  or (t.slug = 'eventos'     and not m.precisa_celular and 'chip' = any(m.conexao))
  or (t.slug = 'delivery'    and 'chip' = any(m.conexao) and m.volume_mensal in ('pequeno','medio'))
  or (t.slug = 'servicos'    and m.volume_mensal in ('pequeno','medio'))
  or (t.slug = 'loja'        and m.imprime_comprovante)
  or (t.slug = 'alimentacao' and m.imprime_comprovante)
  or (t.slug = 'saude'       and m.volume_mensal in ('medio','grande') and m.tipo = 'maquininha')
  or (t.slug = 'online'      and m.marca_id in (select id from public.marcas where slug in ('mercado-pago','infinitepay','pagbank','ton','sumup')));

-- Religa os gatilhos de log
alter table public.marcas enable trigger log_marcas;
alter table public.maquininhas enable trigger log_maquininhas;
alter table public.taxas enable trigger log_taxas;
