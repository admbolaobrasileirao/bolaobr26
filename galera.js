const games = [
  ['Palmeiras × Flamengo','2×1','Pedro'],['Bahia × Corinthians','1×1','Cauly'],['Grêmio × Botafogo','0×2','Igor Jesus'],['Vasco × Sport','3×0','Vegetti'],['São Paulo × Atlético-MG','1×0','Luciano'],['Fluminense × Internacional','2×2','Cano'],['Santos × Cruzeiro','1×2','Kaio Jorge'],['Fortaleza × Bragantino','0×0','—'],['Vitória × Juventude','2×1','Osvaldo'],['Ceará × Mirassol','1×3','Reinaldo']
];
const players = ['Amadeu','Brenke','Bruno','Catarino','Cauê','Coven','Diego','Heitor','Larissa','Leo Meira','Marcos','Milton','Nicolas','Rafael','Teco','Vitória','Yasmin'];
const scoreGuesses = ['2×1','1×1','0×2','3×0','1×0','2×2','1×2','0×0','2×1','1×3'];
const goals = ['Pedro','Cauly','Igor Jesus','Vegetti','Luciano','Cano','Kaio Jorge','—','Osvaldo','Reinaldo'];
const state = ['correct','match','miss'];
const rounds = document.querySelector('#round'); rounds.innerHTML = Array.from({length:38},(_,i)=>`<option ${i===2?'selected':''}>Rodada ${String(i+1).padStart(2,'0')}</option>`).join('');
const table = document.querySelector('#prediction-table');
const groups = games.map(game => `<th colspan="2" class="game-heading">${game[0]}</th>`).join('');
const subheaders = games.map(() => '<th>PLACAR</th><th>⚽ 1º GOL</th>').join('');
const official = games.map(game => `<td>${game[1]}</td><td class="goal">${game[2]}</td>`).join('');
const rows = players.map((player, row) => { const cells = games.map((game, col) => { const scoreState=state[(row+col+1)%3]; const score = scoreGuesses[(col+row*3)%scoreGuesses.length]; const goalCorrect=(row*2+col)%4===0; const goal = goalCorrect ? game[2] : goals[(col+row*2+1)%goals.length]; return `<td class="prediction"><span class="score-badge ${scoreState}">${score}</span></td><td class="prediction goal">${goal}${goalCorrect ? '<span class="ball" aria-label="Primeiro gol correto">⚽</span>' : ''}</td>`; }).join(''); return `<tr><th scope="row" class="name-cell">${player}</th>${cells}</tr>`; }).join('');
table.innerHTML = `<thead><tr><th rowspan="2" class="sticky-name">PARTICIPANTE</th>${groups}</tr><tr>${subheaders}</tr></thead><tbody><tr class="official-row"><th scope="row" class="name-cell">OFICIAL</th>${official}</tr>${rows}</tbody>`;
