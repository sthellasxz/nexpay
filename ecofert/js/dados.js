/*
 * EcoFert — dados do conteúdo educativo, dos sensores e das premissas de impacto.
 * Mantido separado da interface para facilitar revisões de texto e de números.
 */

// Componentes da lixeira (usados na ilustração, nos chips e no modal de detalhes)
const SENSORES = {
  esp32: {
    nome: 'ESP32',
    componente: 'Microcontrolador com Wi-Fi',
    resumo: 'Cérebro do sistema e conexão Wi-Fi',
    funcao: 'Lê todos os sensores, decide quando acionar cada atuador e envia a telemetria para o painel.',
    codigo: 'WiFi.begin(SSID, SENHA);\nwhile (WiFi.status() != WL_CONNECTED) delay(500);\n\nenviarTelemetria(peso, temperatura, umidade, nivel);',
    quando: 'Fica ativo o tempo todo, mantendo a lixeira on-line e atualizando o painel.'
  },
  celula: {
    nome: 'Célula de carga',
    componente: 'Célula de carga + módulo HX711',
    resumo: 'Mede o peso acumulado do resíduo',
    funcao: 'Converte a força sobre a base em peso (kg). O HX711 amplifica o sinal muito fraco que a célula gera.',
    codigo: 'balanca.begin(PIN_DT, PIN_SCK);\nbalanca.set_scale(FATOR_CALIBRACAO);\nfloat kg = balanca.get_units(5); // média de 5 leituras\npesoAcumulado += kg;',
    quando: 'Depois de cada descarte, para somar o peso acumulado.'
  },
  dht22: {
    nome: 'DHT22',
    componente: 'Sensor de temperatura e umidade',
    resumo: 'Temperatura e umidade internas',
    funcao: 'Monitora a temperatura e a umidade da massa em compostagem. Esses dois valores indicam se a decomposição está no ritmo certo.',
    codigo: 'dht.begin();\nfloat temperatura = dht.readTemperature();\nfloat umidade = dht.readHumidity();',
    quando: 'Em intervalos regulares, durante todo o ciclo de compostagem.'
  },
  servo: {
    nome: 'Servomotor',
    componente: 'Servomotor',
    resumo: 'Abre a tampa e dosa o substrato',
    funcao: 'Gira para abrir e fechar a tampa e também movimenta a porta de dosagem do substrato (Bokashi ou serragem).',
    codigo: 'tampa.attach(PIN_SERVO);\ntampa.write(90); // abre\ndelay(3000);\ntampa.write(0);  // fecha',
    quando: 'Ao detectar aproximação (abertura) e na etapa de tratamento (dosagem).'
  },
  ultra: {
    nome: 'Ultrassônico',
    componente: 'Sensor ultrassônico (HC-SR04)',
    resumo: 'Detecta aproximação e o nível do balde',
    funcao: 'Emite um pulso sonoro e mede o tempo de retorno. Com isso calcula a distância até a sua mão e até o resíduo.',
    codigo: 'long distancia = medirDistanciaCm();\nif (distancia < 15) abrirTampa(); // aproximação sem contato\nnivel = map(distancia, 5, 60, 100, 0);',
    quando: 'Continuamente: abre a tampa sem contato e informa o nível do balde.'
  },
  motor: {
    nome: 'Motor DC',
    componente: 'Motor DC com lâminas',
    resumo: 'Tritura o resíduo',
    funcao: 'Aciona as lâminas internas que trituram o resíduo. Pedaços menores têm mais superfície e decompõem mais rápido.',
    codigo: 'digitalWrite(MOTOR_IN1, HIGH); // liga\ndelay(TEMPO_TRITURACAO);\ndigitalWrite(MOTOR_IN1, LOW);  // desliga',
    quando: 'Logo após o descarte, por alguns segundos a cada ciclo.'
  }
};

// Cinco etapas do ciclo (aba "Processo Interativo")
const ETAPAS = [
  {
    titulo: 'Descarte',
    subtitulo: 'Aproximação sem contato',
    texto: 'Basta se aproximar com o recipiente. O sensor ultrassônico percebe a presença, o servomotor abre a tampa e a fecha depois de alguns segundos. Você não encosta em nada, e a célula de carga registra o peso do descarte.',
    sensores: ['ultra', 'servo', 'celula']
  },
  {
    titulo: 'Trituração',
    subtitulo: 'Lâminas reduzem o volume',
    texto: 'O motor DC aciona as lâminas internas, que cortam o resíduo em pedaços menores. Quanto menor o pedaço, maior a superfície exposta aos microrganismos e mais rápida a decomposição.',
    sensores: ['motor', 'esp32']
  },
  {
    titulo: 'Tratamento',
    subtitulo: 'Equilíbrio de carbono e nitrogênio',
    texto: 'Restos de comida são ricos em nitrogênio (material "verde"). Para equilibrar a mistura, o sistema dosa carbono (material "marrom", como serragem ou Bokashi). Essa proporção evita odores e acelera a compostagem.',
    sensores: ['servo', 'celula']
  },
  {
    titulo: 'Compostagem',
    subtitulo: 'Controle e maturação',
    texto: 'Temperatura e umidade são medidas o tempo todo. Quando a massa está aquecida e úmida na medida certa, os microrganismos trabalham melhor. O ESP32 avisa quando algo sai do esperado.',
    sensores: ['dht22', 'esp32']
  },
  {
    titulo: 'Reaproveitamento',
    subtitulo: 'Adubo pronto para uso',
    texto: 'Após a maturação, o composto fica escuro, solto e com cheiro de terra. Colha, use em vasos e hortas ou devolva ao solo. Assim o ciclo se fecha.',
    sensores: ['celula', 'esp32']
  }
];

// Guia de resíduos. "palavras" são termos que ajudam a busca encontrar o item.
const GUIA = {
  pode: {
    titulo: 'Pode compostar',
    cor: 'verde',
    itens: [
      { nome: 'Casca de banana', palavras: ['banana'], dica: 'Corte em pedaços para decompor mais rápido.' },
      { nome: 'Restos de frutas', palavras: ['fruta', 'maca', 'mamao', 'abacaxi', 'manga', 'uva', 'pera'], dica: 'Polpas e cascas são ótimas fontes de nitrogênio. Misture com material seco.' },
      { nome: 'Cascas de ovo', palavras: ['ovo', 'casca de ovo'], dica: 'Esmague antes de jogar: elas demoram mais para se decompor.' },
      { nome: 'Borra de café', palavras: ['cafe'], dica: 'Rica em nitrogênio. Use com moderação e misture com folhas secas.' },
      { nome: 'Filtro de papel', palavras: ['filtro'], dica: 'Filtro de papel comum, sem tinta, pode ir junto com a borra.' },
      { nome: 'Vegetais crus', palavras: ['legume', 'verdura', 'alface', 'cenoura', 'brocolis', 'tomate'], dica: 'Prefira vegetais crus. Batata cozida ou temperada atrai pragas.' },
      { nome: 'Folhas secas', palavras: ['folha', 'folhas'], dica: 'Material marrom (carbono). Ajuda a equilibrar a mistura e evita odores.' },
      { nome: 'Serragem e palha', palavras: ['serragem', 'palha'], dica: 'Sem tinta, verniz ou madeira tratada. Excelente material marrom.' },
      { nome: 'Aparas de grama', palavras: ['grama', 'capim'], dica: 'Espalhe em camadas finas para não empelotar.' },
      { nome: 'Erva de chá', palavras: ['cha', 'erva'], dica: 'Pó ou folhas soltas. Se houver saquinho, verifique se é sem plástico.' }
    ]
  },
  moderacao: {
    titulo: 'Com moderação',
    cor: 'amarelo',
    itens: [
      { nome: 'Frutas cítricas em excesso', palavras: ['laranja', 'limao', 'tangerina', 'citrica', 'casca de laranja'], dica: 'Uma ou outra casca é ok. Em excesso, a acidez atrasa a compostagem.' },
      { nome: 'Cebola e alho em excesso', palavras: ['cebola', 'alho'], dica: 'Em pequenas quantidades, sem problema. Muita quantidade atrai insetos.' },
      { nome: 'Guardanapo ou papel toalha usado', palavras: ['guardanapo', 'papel toalha', 'papel'], dica: 'Só se estiver sem gordura, molho ou produto de limpeza.' },
      { nome: 'Cascas duras (coco, melancia)', palavras: ['melancia', 'casca dura', 'coco verde'], dica: 'Corte em pedaços pequenos. A decomposição é mais lenta.' },
      { nome: 'Pão e biscoitos', palavras: ['pao', 'biscoito', 'bolo'], dica: 'Pequenas porções. Muito pão atrai roedores e forma mofo.' }
    ]
  },
  nao: {
    titulo: 'Não pode',
    cor: 'vermelho',
    itens: [
      { nome: 'Carnes e peixes', palavras: ['carne', 'frango', 'peixe', 'boi', 'porco', 'ossos', 'osso'], dica: 'Geram odor forte e atraem pragas. Ossos também não entram.' },
      { nome: 'Laticínios', palavras: ['queijo', 'leite', 'iogurte', 'manteiga', 'requeijao'], dica: 'Fermentam rápido e geram odor. Vão no lixo comum.' },
      { nome: 'Óleos e gorduras', palavras: ['oleo', 'gordura', 'azeite', 'frito', 'fritura'], dica: 'Impermeabilizam a massa e impedem o ar de circular.' },
      { nome: 'Plásticos, vidro e metais', palavras: ['plastico', 'vidro', 'metal', 'lata', 'embalagem', 'saquinho'], dica: 'Não se decompõem. Separe para a coleta seletiva.' },
      { nome: 'Pilhas e eletrônicos', palavras: ['pilha', 'bateria', 'eletronico', 'celular'], dica: 'Contêm metais pesados. Leve a um ponto de descarte específico.' },
      { nome: 'Fezes de cães e gatos', palavras: ['coco de cachorro', 'fezes', 'cocô', 'cachorro', 'gato', 'areia de gato'], dica: 'Podem conter patógenos. Descarte no lixo comum.' },
      { nome: 'Madeira pintada ou tratada', palavras: ['tinta', 'verniz', 'madeira pintada', 'madeira tratada'], dica: 'Produtos químicos contaminam o adubo.' }
    ]
  }
};

// Premissas para a calculadora de impacto. São valores ILUSTRATIVOS:
// troque por fatores oficiais (ex.: IPCC ou EPA WARM) antes de divulgar.
const IMPACTO = {
  co2e_por_kg: 0.5,   // kg de CO2e evitados por kg de resíduo orgânico desviado do aterro
  ch4_por_kg: 0.02    // kg de CH4 evitados por kg de resíduo orgânico desviado do aterro
};
