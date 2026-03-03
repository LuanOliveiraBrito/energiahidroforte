// Estados e Cidades do Brasil (formato simplificado)
// Fonte: IBGE

const estadosCidades = {
  AC: {
    nome: "Acre",
    cidades: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira", "Tarauacá", "Feijó", "Brasileia", "Epitaciolândia", "Xapuri", "Plácido de Castro", "Senador Guiomard"]
  },
  AL: {
    nome: "Alagoas",
    cidades: ["Maceió", "Arapiraca", "Rio Largo", "Palmeira dos Índios", "União dos Palmares", "Penedo", "São Miguel dos Campos", "Marechal Deodoro", "Delmiro Gouveia", "Coruripe"]
  },
  AP: {
    nome: "Amapá",
    cidades: ["Macapá", "Santana", "Laranjal do Jari", "Oiapoque", "Mazagão", "Porto Grande", "Tartarugalzinho", "Pedra Branca do Amapari", "Vitória do Jari", "Calçoene"]
  },
  AM: {
    nome: "Amazonas",
    cidades: ["Manaus", "Parintins", "Itacoatiara", "Manacapuru", "Coari", "Tefé", "Tabatinga", "Maués", "Iranduba", "Humaitá"]
  },
  BA: {
    nome: "Bahia",
    cidades: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Itabuna", "Juazeiro", "Lauro de Freitas", "Ilhéus", "Jequié", "Teixeira de Freitas", "Barreiras", "Alagoinhas", "Porto Seguro", "Simões Filho", "Paulo Afonso"]
  },
  CE: {
    nome: "Ceará",
    cidades: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú", "Sobral", "Crato", "Itapipoca", "Maranguape", "Iguatu", "Quixadá", "Pacatuba", "Aquiraz", "Canindé", "Russas", "Tianguá"]
  },
  DF: {
    nome: "Distrito Federal",
    cidades: ["Brasília"]
  },
  ES: {
    nome: "Espírito Santo",
    cidades: ["Vitória", "Vila Velha", "Serra", "Cariacica", "Cachoeiro de Itapemirim", "Linhares", "São Mateus", "Colatina", "Guarapari", "Aracruz"]
  },
  GO: {
    nome: "Goiás",
    cidades: ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde", "Luziânia", "Águas Lindas de Goiás", "Valparaíso de Goiás", "Trindade", "Formosa", "Novo Gama", "Itumbiara", "Senador Canedo", "Catalão", "Jataí", "Planaltina"]
  },
  MA: {
    nome: "Maranhão",
    cidades: ["São Luís", "Imperatriz", "São José de Ribamar", "Timon", "Caxias", "Codó", "Paço do Lumiar", "Açailândia", "Bacabal", "Santa Inês", "Bom Jesus Das Selvas"]
  },
  MT: {
    nome: "Mato Grosso",
    cidades: ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop", "Tangará da Serra", "Cáceres", "Sorriso", "Lucas do Rio Verde", "Primavera do Leste", "Alta Floresta"]
  },
  MS: {
    nome: "Mato Grosso do Sul",
    cidades: ["Campo Grande", "Dourados", "Três Lagoas", "Corumbá", "Ponta Porã", "Naviraí", "Nova Andradina", "Aquidauana", "Sidrolândia", "Paranaíba"]
  },
  MG: {
    nome: "Minas Gerais",
    cidades: ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros", "Ribeirão das Neves", "Uberaba", "Governador Valadares", "Ipatinga", "Sete Lagoas", "Divinópolis", "Santa Luzia", "Ibirité", "Poços de Caldas"]
  },
  PA: {
    nome: "Pará",
    cidades: ["Belém", "Ananindeua", "Santarém", "Marabá", "Parauapebas", "Castanhal", "Abaetetuba", "Cametá", "Marituba", "Bragança", "Abel Figueiredo", "Itupiranga", "Novo Repartimento", "Sao Domingos Do Araguaia"]
  },
  PB: {
    nome: "Paraíba",
    cidades: ["João Pessoa", "Campina Grande", "Santa Rita", "Patos", "Bayeux", "Sousa", "Cabedelo", "Cajazeiras", "Guarabira", "Sapé"]
  },
  PR: {
    nome: "Paraná",
    cidades: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "São José dos Pinhais", "Foz do Iguaçu", "Colombo", "Guarapuava", "Paranaguá", "Araucária", "Toledo", "Apucarana", "Pinhais", "Campo Largo"]
  },
  PE: {
    nome: "Pernambuco",
    cidades: ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina", "Paulista", "Cabo de Santo Agostinho", "Camaragibe", "Garanhuns", "Vitória de Santo Antão"]
  },
  PI: {
    nome: "Piauí",
    cidades: ["Teresina", "Parnaíba", "Picos", "Piripiri", "Floriano", "Campo Maior", "Barras", "União", "Altos", "Pedro II"]
  },
  RJ: {
    nome: "Rio de Janeiro",
    cidades: ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói", "Belford Roxo", "São João de Meriti", "Campos dos Goytacazes", "Petrópolis", "Volta Redonda", "Magé", "Macaé", "Itaboraí", "Mesquita", "Nova Friburgo"]
  },
  RN: {
    nome: "Rio Grande do Norte",
    cidades: ["Natal", "Mossoró", "Parnamirim", "São Gonçalo do Amarante", "Macaíba", "Ceará-Mirim", "Caicó", "Açu", "Currais Novos", "São José de Mipibu"]
  },
  RS: {
    nome: "Rio Grande do Sul",
    cidades: ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria", "Gravataí", "Viamão", "Novo Hamburgo", "São Leopoldo", "Rio Grande", "Alvorada", "Passo Fundo", "Sapucaia do Sul", "Uruguaiana", "Santa Cruz do Sul"]
  },
  RO: {
    nome: "Rondônia",
    cidades: ["Porto Velho", "Ji-Paraná", "Ariquemes", "Vilhena", "Cacoal", "Rolim de Moura", "Jaru", "Guajará-Mirim", "Ouro Preto do Oeste", "Buritis"]
  },
  RR: {
    nome: "Roraima",
    cidades: ["Boa Vista", "Rorainópolis", "Caracaraí", "Alto Alegre", "Pacaraima", "Amajari", "Cantá", "Bonfim", "Uiramutã", "Caroebe"]
  },
  SC: {
    nome: "Santa Catarina",
    cidades: ["Florianópolis", "Joinville", "Blumenau", "São José", "Chapecó", "Itajaí", "Criciúma", "Jaraguá do Sul", "Palhoça", "Lages", "Balneário Camboriú", "Brusque", "Tubarão", "São Bento do Sul", "Navegantes"]
  },
  SP: {
    nome: "São Paulo",
    cidades: ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "São José dos Campos", "Osasco", "Ribeirão Preto", "Sorocaba", "Mauá", "São José do Rio Preto", "Mogi das Cruzes", "Santos", "Diadema", "Jundiaí", "Piracicaba", "Carapicuíba", "Bauru", "Itaquaquecetuba", "São Vicente"]
  },
  SE: {
    nome: "Sergipe",
    cidades: ["Aracaju", "Nossa Senhora do Socorro", "Lagarto", "Itabaiana", "São Cristóvão", "Estância", "Tobias Barreto", "Itabaianinha", "Simão Dias", "Capela"]
  },
  TO: {
    nome: "Tocantins",
    cidades: ["Palmas", "Araguaína", "Gurupi", "Porto Nacional", "Paraíso do Tocantins", "Colinas do Tocantins", "Guaraí", "Tocantinópolis", "Dianópolis", "Miracema do Tocantins", "Abreulandia", "Angico", "Araguacema", "Bom Jesus Tocantins", "Brejinho De Nazare", "Cariri", "Chapada Da Natividade", "Chapada De Areia", "Divinopolis", "Duere", "Goianorte", "Itaguatins", "Itapiratins", "Jau", "Lizarda", "Mateiro", "Miranorte", "Monte Do Carmo", "Novo Alegre", "Pequizeiro", "Pindorama", "Pium", "Ponte Alta Do Tocantins", "Ponte Alta Bom Jesus", "Porto Alegre", "Praia Norte", "Presidente Kennedy", "Rio Da Conceicao", "Santa Maria", "Santa Rita", "Santa Rosa", "Sao Valerio Da Natividade", "Silvanopolis", "Sitio Novo", "Tabocao", "Talisma"]
  }
};

export default estadosCidades;
