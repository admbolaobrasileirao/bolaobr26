const games = [
  ['Palmeiras', 'Flamengo', ['Pedro', 'Arrascaeta', 'Bruno Henrique'], ['Vitor Roque', 'Raphael Veiga', 'Flaco López']],
  ['Bahia', 'Corinthians', ['Cauly', 'Everton Ribeiro', 'Lucho Rodríguez'], ['Yuri Alberto', 'Memphis', 'Romero']],
  ['Grêmio', 'Botafogo', ['Braithwaite', 'Cristaldo', 'Pavón'], ['Igor Jesus', 'Savarino', 'Artur']],
  ['Vasco', 'Sport', ['Vegetti', 'Coutinho', 'Rayan'], ['Pablo', 'Lucas Lima', 'Gustavo Maia']],
  ['São Paulo', 'Atlético-MG', ['Luciano', 'Calleri', 'Lucas Moura'], ['Hulk', 'Paulinho', 'Gustavo Scarpa']],
  ['Fluminense', 'Internacional', ['Cano', 'Arias', 'Keno'], ['Borré', 'Alan Patrick', 'Wesley']],
  ['Santos', 'Cruzeiro', ['Neymar', 'Guilherme', 'Tiquinho'], ['Kaio Jorge', 'Matheus Pereira', 'Dudu']],
  ['Fortaleza', 'Bragantino', ['Lucero', 'Moisés', 'Pochettino'], ['Eduardo Sasha', 'Lucas Barbosa', 'Jhon Jhon']],
  ['Vitória', 'Juventude', ['Osvaldo', 'Janderson', 'Matheuzinho'], ['Gilberto', 'Nenê', 'Ênio']],
  ['Ceará', 'Mirassol', ['Aylon', 'Lourenço', 'Pedro Raul'], ['Reinaldo', 'Chico', 'Iury Castilho']]
];
const numberOptions = Array.from({ length: 10 }, (_, i) => `<option value="${i}">${i}</option>`).join('');
const gameList = document.querySelector('#games');
gameList.innerHTML = games.map(([home, away, homePlayers, awayPlayers], index) => `<article class="game" data-game="${index}"><div class="score-prediction"><span class="team home">${home}${teamIcon(home)}</span><select aria-label="Gols do ${home}">${numberOptions}</select><span class="versus">×</span><select aria-label="Gols do ${away}">${numberOptions}</select><span class="team">${teamIcon(away)}${away}</span></div><div class="first-goal"><select class="goal-team" aria-label="Time do primeiro gol"><option value="">⚽ Time do 1º gol</option><option value="home">${home}</option><option value="away">${away}</option></select><select class="goal-player" aria-label="Jogador do primeiro gol" disabled><option>Jogador do 1º gol</option></select></div></article>`).join('');
document.querySelectorAll('.game').forEach((game, index) => { const team = game.querySelector('.goal-team'); const player = game.querySelector('.goal-player'); team.addEventListener('change', () => { const players = team.value === 'home' ? games[index][2] : games[index][3]; player.disabled = !team.value; player.innerHTML = team.value ? `<option value="">Jogador do 1º gol</option>${players.map(name => `<option>${name}</option>`).join('')}` : '<option>Jogador do 1º gol</option>'; }); });
const rounds = document.querySelector('#round'); rounds.innerHTML = Array.from({ length: 38 }, (_, i) => `<option ${i === 2 ? 'selected' : ''}>Rodada ${String(i + 1).padStart(2, '0')}</option>`).join('');
const deadline = new Date('2026-06-24T15:59:00-03:00'); function updateCountdown(){ const seconds=Math.max(0,Math.floor((deadline-new Date())/1000)); document.querySelector('#days').textContent=String(Math.floor(seconds/86400)).padStart(2,'0'); document.querySelector('#hours').textContent=String(Math.floor(seconds%86400/3600)).padStart(2,'0'); document.querySelector('#minutes').textContent=String(Math.floor(seconds%3600/60)).padStart(2,'0'); } updateCountdown(); setInterval(updateCountdown,1000);
