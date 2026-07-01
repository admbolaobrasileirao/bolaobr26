const TEAM_ASSETS = {
  'Atlético-MG': 'atletico-mg.png',
  Athletico: 'athletico.png',
  Bahia: 'Bahia.png',
  Botafogo: 'Botafogo.png',
  Bragantino: 'bragantino.png',
  Chapecoense: 'Chapecoense.png',
  Corinthians: 'Corinthians.png',
  Coritiba: 'Coritiba.png',
  Cruzeiro: 'Cruzeiro.png',
  Flamengo: 'Flamengo.png',
  Fluminense: 'Fluminense.png',
  'Grêmio': 'gremio.png',
  Internacional: 'Internacional.png',
  Mirassol: 'mirassol.png',
  Palmeiras: 'Palmeiras.png',
  Remo: 'remo.png',
  Santos: 'Santos.png',
  'São Paulo': 'sao-paulo.png',
  Vasco: 'vasco.png',
  'Vitória': 'vitoria.png',
};

function teamIcon(name) {
  const file = TEAM_ASSETS[name];
  return file
    ? `<img class="team-icon" style="width:25px;height:25px;object-fit:contain;vertical-align:middle;margin:0 7px" src="assets/teams/${file}" alt="">`
    : '';
}
