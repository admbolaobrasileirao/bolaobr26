import { auth, db, adminEmail } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

let SQUADS = {};
let squadsLoadError = null;
let currentGames = [];

try {
  ({ SQUADS } = await import('./squads.js'));
} catch (error) {
  squadsLoadError = error;
}

const panel = document.querySelector('#results');
const list = document.querySelector('#result-list');

const scores = (value) => `
  <select class="score">
    <option value="">-</option>
    ${Array.from({ length: 10 }, (_, n) => `<option value="${n}" ${n === value ? 'selected' : ''}>${n}</option>`).join('')}
  </select>
`;

const cleanPlayer = (value = '') => value.split('•').pop().trim().toLowerCase();

const outcome = (homeGoals, awayGoals) => {
  if (homeGoals > awayGoals) return 'home';
  if (homeGoals < awayGoals) return 'away';
  return 'draw';
};

function scorePrediction(prediction, result) {
  const exactScore = prediction.homeGoals === result.homeGoals && prediction.awayGoals === result.awayGoals;
  const officialOutcome = outcome(result.homeGoals, result.awayGoals);
  const predictedOutcome = outcome(prediction.homeGoals, prediction.awayGoals);
  const correctOutcome = officialOutcome === predictedOutcome;
  const zeroZeroCravado = exactScore && result.homeGoals === 0 && result.awayGoals === 0;

  let scorePoints = 0;
  let status = 'zerou';
  let cravada = false;

  if (zeroZeroCravado) {
    scorePoints = 30;
    status = 'cravada';
    cravada = true;
  } else if (exactScore) {
    scorePoints = 25;
    status = 'cravada';
    cravada = true;
  } else if (correctOutcome) {
    scorePoints = 10;
    status = 'acerto';
  }

  const goalHit = !!result.firstGoalPlayer
    && !!prediction.firstGoal
    && cleanPlayer(prediction.firstGoal) === cleanPlayer(result.firstGoalPlayer);
  const goalPoints = goalHit ? 5 : 0;

  return {
    scorePoints,
    goalPoints,
    totalPoints: scorePoints + goalPoints,
    cravada,
    status,
    goalHit,
    corrected: true,
  };
}

const playerOptions = (team, selectedPlayer) => {
  const squad = SQUADS[team] || [];
  return `
    <option value="">${team ? '⚽ Atleta do 1º gol' : 'Escolha o time primeiro'}</option>
    ${squad.map((player) => `<option ${player === selectedPlayer ? 'selected' : ''}>${player}</option>`).join('')}
  `;
};

function syncPlayerSelect(row, selectedPlayer = '') {
  const teamSelect = row.querySelector('.team');
  const playerSelect = row.querySelector('.player');
  const team = teamSelect.value;

  playerSelect.disabled = !team;
  playerSelect.innerHTML = playerOptions(team, selectedPlayer);
}

function readResult(row) {
  const scoreSelects = row.querySelectorAll('.score');
  const team = row.querySelector('.team').value;
  const player = row.querySelector('.player').value;

  if (scoreSelects[0].value === '' || scoreSelects[1].value === '') return null;

  return {
    homeGoals: +scoreSelects[0].value,
    awayGoals: +scoreSelects[1].value,
    firstGoalTeam: team || null,
    firstGoalPlayer: player || null,
  };
}

async function correctGame(game, result) {
  const snap = await getDocs(query(collection(db, 'predictions'), where('game', '==', game.id)));
  const predictions = [];
  snap.forEach((item) => predictions.push({ id: item.id, ...item.data() }));

  if (!predictions.length) return { corrected: 0 };

  let totalPoints = 0;
  let cravadas = 0;
  let goalHits = 0;

  for (let index = 0; index < predictions.length; index += 400) {
    const batch = writeBatch(db);
    const chunk = predictions.slice(index, index + 400);

    chunk.forEach((prediction) => {
      const correction = scorePrediction(prediction, result);
      totalPoints += correction.totalPoints;
      if (correction.cravada) cravadas += 1;
      if (correction.goalHit) goalHits += 1;

      batch.update(doc(db, 'predictions', prediction.id), { correction });
    });

    await batch.commit();
  }

  return {
    corrected: predictions.length,
    totalPoints,
    cravadas,
    goalHits,
  };
}

async function saveRound() {
  const button = document.querySelector('#save-round');
  const summary = document.querySelector('#round-feedback');
  const rows = [...document.querySelectorAll('.game')];
  const filledRows = rows
    .map((row) => ({ row, game: currentGames.find((game) => game.id === row.dataset.gameId), result: readResult(row) }))
    .filter((item) => item.result);

  if (!filledRows.length) {
    alert('Preencha pelo menos um placar antes de salvar.');
    return;
  }

  button.disabled = true;
  button.textContent = 'SALVANDO RODADA...';
  summary.textContent = '';

  let correctedGames = 0;
  let correctedPredictions = 0;

  try {
    for (const item of filledRows) {
      const correctionSummary = await correctGame(item.game, item.result);

      await updateDoc(doc(db, 'games', item.game.id), {
        result: item.result,
        correctionSummary,
        status: 'finished',
      });

      item.row.querySelector('.feedback').textContent = `${correctionSummary.corrected} palpites corrigidos`;
      correctedGames += 1;
      correctedPredictions += correctionSummary.corrected;
      summary.textContent = `Salvando... ${correctedGames}/${filledRows.length} jogos`;
    }

    button.textContent = 'SALVO ✓';
    summary.textContent = `${correctedGames} jogos salvos · ${correctedPredictions} palpites corrigidos`;
  } catch (error) {
    console.error(error);
    button.textContent = 'ERRO AO SALVAR';
    summary.textContent = `Erro: ${error.message}`;
    alert(`Não foi possível salvar/corrigir: ${error.message}`);
  } finally {
    setTimeout(() => {
      button.disabled = false;
      if (button.textContent !== 'SALVAR RODADA') button.textContent = 'SALVAR RODADA';
    }, 1800);
  }
}

async function load(round) {
  currentGames = [];
  list.textContent = 'Carregando jogos...';

  try {
    const snap = await getDocs(query(collection(db, 'games'), where('round', '==', round)));
    const games = [];
    snap.forEach((item) => games.push({ id: item.id, ...item.data() }));
    games.sort((a, b) => (a.order || 0) - (b.order || 0));
    currentGames = games;

    list.innerHTML = '';

    if (!games.length) {
      list.textContent = `Nenhum jogo encontrado para a Rodada ${String(round).padStart(2, '0')}.`;
      return;
    }

    games.forEach((game) => {
      const result = game.result || {};
      const row = document.createElement('div');
      row.className = 'game';
      row.dataset.gameId = game.id;
      row.innerHTML = `
        <b>${game.home}</b>
        ${scores(result.homeGoals)}
        <b>×</b>
        ${scores(result.awayGoals)}
        <b>${game.away}</b>
        <select class="team">
          <option value="">⚽ Time do 1º gol</option>
          <option ${result.firstGoalTeam === game.home ? 'selected' : ''}>${game.home}</option>
          <option ${result.firstGoalTeam === game.away ? 'selected' : ''}>${game.away}</option>
        </select>
        <select class="player"></select>
        <small class="feedback">${game.correctionSummary ? `${game.correctionSummary.corrected} palpites corrigidos` : ''}</small>
      `;

      syncPlayerSelect(row, result.firstGoalPlayer || '');
      row.querySelector('.team').onchange = () => syncPlayerSelect(row);
      list.append(row);
    });

    const actions = document.createElement('div');
    actions.className = 'round-actions';
    actions.innerHTML = `
      <button id="save-round" class="save-round">SALVAR RODADA</button>
      <span id="round-feedback"></span>
    `;
    list.append(actions);
    document.querySelector('#save-round').onclick = saveRound;
  } catch (error) {
    console.error(error);
    list.textContent = `Erro ao carregar jogos: ${error.message}`;
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== adminEmail) {
    list.textContent = 'Entre como Admin pelo acesso principal antes de abrir esta página.';
    return;
  }

  if (squadsLoadError) {
    console.error(squadsLoadError);
    list.textContent = 'Arquivo de elencos não encontrado. Confira se squads.js foi enviado para a raiz do GitHub.';
    return;
  }

  const picker = document.createElement('select');
  picker.innerHTML = Array.from(
    { length: 38 },
    (_, index) => `<option value="${index + 1}">Rodada ${String(index + 1).padStart(2, '0')}</option>`,
  ).join('');
  picker.value = 19;

  panel.querySelector('h2').after(picker);
  picker.onchange = () => load(+picker.value);
  load(19);
});
