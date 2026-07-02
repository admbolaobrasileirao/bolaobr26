const STANDINGS = [
  { name: 'Palmeiras', points: 41, games: 18, wins: 12, draws: 5, losses: 1, goalsFor: 30, goalDifference: 17, recent: 'EEVVV' },
  { name: 'Flamengo', points: 34, games: 17, wins: 10, draws: 4, losses: 3, goalsFor: 31, goalDifference: 15, recent: 'EVDVV' },
  { name: 'Fluminense', points: 31, games: 18, wins: 9, draws: 4, losses: 5, goalsFor: 28, goalDifference: 5, recent: 'DEDVE' },
  { name: 'Athletico', points: 30, games: 18, wins: 9, draws: 3, losses: 6, goalsFor: 24, goalDifference: 6, recent: 'DEDVV' },
  { name: 'Bragantino', points: 29, games: 18, wins: 9, draws: 2, losses: 7, goalsFor: 25, goalDifference: 6, recent: 'VDVVV' },
  { name: 'Bahia', points: 26, games: 17, wins: 7, draws: 5, losses: 5, goalsFor: 25, goalDifference: 2, recent: 'DEDVV' },
  { name: 'Coritiba', points: 26, games: 18, wins: 7, draws: 5, losses: 6, goalsFor: 24, goalDifference: 0, recent: 'DEVDD' },
  { name: 'São Paulo', points: 25, games: 18, wins: 7, draws: 4, losses: 7, goalsFor: 23, goalDifference: 3, recent: 'EDDED' },
  { name: 'Atlético-MG', points: 24, games: 18, wins: 7, draws: 3, losses: 8, goalsFor: 22, goalDifference: -1, recent: 'VDDDV' },
  { name: 'Corinthians', points: 24, games: 18, wins: 6, draws: 6, losses: 6, goalsFor: 18, goalDifference: -1, recent: 'DVDVV' },
  { name: 'Cruzeiro', points: 24, games: 18, wins: 6, draws: 6, losses: 6, goalsFor: 24, goalDifference: -4, recent: 'DEVVE' },
  { name: 'Botafogo', points: 22, games: 17, wins: 6, draws: 4, losses: 7, goalsFor: 31, goalDifference: 0, recent: 'DEVED' },
  { name: 'Vitória', points: 22, games: 17, wins: 6, draws: 4, losses: 7, goalsFor: 21, goalDifference: -4, recent: 'VEDVD' },
  { name: 'Internacional', points: 21, games: 18, wins: 5, draws: 6, losses: 7, goalsFor: 21, goalDifference: -1, recent: 'VEDD' },
  { name: 'Santos', points: 21, games: 18, wins: 5, draws: 6, losses: 7, goalsFor: 26, goalDifference: -3, recent: 'EVDDV' },
  { name: 'Grêmio', points: 21, games: 18, wins: 5, draws: 6, losses: 7, goalsFor: 20, goalDifference: -3, recent: 'EDED' },
  { name: 'Vasco', points: 20, games: 18, wins: 5, draws: 5, losses: 8, goalsFor: 22, goalDifference: -7, recent: 'EVDDD' },
  { name: 'Remo', points: 18, games: 18, wins: 4, draws: 6, losses: 8, goalsFor: 21, goalDifference: -8, recent: 'VEDVV' },
  { name: 'Mirassol', points: 16, games: 17, wins: 4, draws: 4, losses: 9, goalsFor: 18, goalDifference: -6, recent: 'VEDVD' },
  { name: 'Chapecoense', points: 9, games: 17, wins: 1, draws: 6, losses: 10, goalsFor: 17, goalDifference: -16, recent: 'DEDDD' },
];

const tbody = document.querySelector('#standings');
const tableStatus = document.querySelector('#table-status');

function recentDots(sequence) {
  return sequence.split('').map((result) => {
    const cssClass = result === 'V' ? 'win' : result === 'E' ? 'draw' : 'loss';
    const title = result === 'V' ? 'Vitória' : result === 'E' ? 'Empate' : 'Derrota';
    return `<i class="${cssClass}" title="${title}"></i>`;
  }).join('');
}

function render(data) {
  tbody.innerHTML = data.map((team, index) => `
    <tr>
      <td>
        <span class="position">${index + 1}</span>
        <span class="team">${teamIcon(team.name)}${team.name}</span>
      </td>
      <td>${team.points}</td>
      <td>${team.games}</td>
      <td>${team.wins}</td>
      <td>${team.draws}</td>
      <td>${team.losses}</td>
      <td>${team.goalsFor}</td>
      <td>${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
      <td><span class="form">${recentDots(team.recent)}</span></td>
    </tr>
  `).join('');
}

render(STANDINGS);
if (tableStatus) tableStatus.textContent = 'Tabela atualizada até a Rodada 18';
