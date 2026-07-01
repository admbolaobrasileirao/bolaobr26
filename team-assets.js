const TEAM_ASSETS = {
  'Atlético-MG': 'Atlético Mineiro.png',
  Athletico: 'Athletico Paranaense.png',
  Bahia: 'Bahia.png',
  Botafogo: 'Botafogo.png',
  Bragantino: 'Red Bull Bragantino.png',
  Chapecoense: 'Chapecoense.png',
  Corinthians: 'Corinthians.png',
  Coritiba: 'Coritiba.png',
  Cruzeiro: 'Cruzeiro.png',
  Flamengo: 'Flamengo.png',
  Fluminense: 'Fluminense.png',
  'Grêmio': 'Grêmio.png',
  Internacional: 'Internacional.png',
  Mirassol: 'Mirassol-SP.png',
  Palmeiras: 'Palmeiras.png',
  Remo: 'Remo (2).png',
  Santos: 'Santos.png',
  'São Paulo': 'São Paulo.png',
  Vasco: 'Vasco da Gama.png',
  'Vitória': 'Vitória.png',
};

function teamIcon(name) {
  const file = TEAM_ASSETS[name];
  return file
    ? `<img class="team-icon" style="width:25px;height:25px;object-fit:contain;vertical-align:middle;margin:0 7px" src="assets/teams/${encodeURIComponent(file)}" alt="">`
    : '';
}
