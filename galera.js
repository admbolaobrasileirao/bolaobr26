import { db } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const roundSelect = document.querySelector('#round');
const table = document.querySelector('#prediction-table');
const roundMeta = document.querySelector('#round-meta');
const matrixEyebrow = document.querySelector('#matrix-eyebrow');
const matrixTitle = document.querySelector('#matrix-title');
const roundStatus = document.querySelector('#round-status');

const rounds = Array.from({ length: 38 }, (_, index) => index + 1);
roundSelect.innerHTML = rounds.map((round) => `<option value="${round}">Rodada ${String(round).padStart(2, '0')}</option>`).join('');

function scoreText(homeGoals, awayGoals) {
  if (homeGoals === undefined || awayGoals === undefined || homeGoals === null || awayGoals === null) return '-';
  return `${homeGoals}x${awayGoals}`;
}

function shortPlayer(player) {
  if (!player) return '-';
  return player.split(/[•]/).pop().trim();
}

function statusClass(correction) {
  if (!correction?.corrected) return 'pending';
  if (correction.status === 'cravada') return 'correct';
  if (correction.status === 'acerto') return 'match';
  return 'miss';
}

function roundPoints(participant, games, predictions) {
  return games.reduce((total, game) => {
    const prediction = predictions.get(`${participant.id}|${game.id}`);
    return total + (prediction?.correction?.totalPoints || 0);
  }, 0);
}

async function getParticipants() {
  const snap = await getDocs(collection(db, 'participants'));
  const participants = [];
  snap.forEach((item) => participants.push({ id: item.id, ...item.data() }));
  return participants.sort((a, b) => (a.order || 999) - (b.order || 999));
}

async function getGames(round) {
  const snap = await getDocs(query(collection(db, 'games'), where('round', '==', round)));
  const games = [];
  snap.forEach((item) => games.push({ id: item.id, ...item.data() }));
  return games.sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function getPredictions(round) {
  const snap = await getDocs(query(collection(db, 'predictions'), where('round', '==', round)));
  const map = new Map();
  snap.forEach((item) => {
    const prediction = item.data();
    map.set(`${prediction.participant}|${prediction.game}`, prediction);
  });
  return map;
}

async function getRound(round) {
  const snap = await getDoc(doc(db, 'rounds', `r${round}`));
  return snap.data() || {};
}

function isDeadlineClosed(roundData) {
  return !!roundData.deadline && new Date(roundData.deadline) <= new Date();
}

async function getFirstVisibleRound() {
  const [gamesSnap, roundsSnap] = await Promise.all([getDocs(collection(db, 'games')), getDocs(collection(db, 'rounds'))]);
  const visibleRounds = new Set();
  const deadlineByRound = new Map();

  roundsSnap.forEach((item) => {
    const round = item.data();
    if (round.number && isDeadlineClosed(round)) visibleRounds.add(round.number);
    if (round.number) deadlineByRound.set(round.number, round.deadline);
  });

  gamesSnap.forEach((item) => {
    const game = item.data();
    const hasResult = game.result && game.result.homeGoals !== undefined && game.result.awayGoals !== undefined;
    if (hasResult) visibleRounds.add(game.round);
    if (deadlineByRound.get(game.round) && new Date(deadlineByRound.get(game.round)) <= new Date()) visibleRounds.add(game.round);
  });

  return [...visibleRounds].filter((round) => round >= 1 && round <= 38).sort((a, b) => a - b)[0] || 1;
}

function renderClosedRound(round, participants, games, predictions, roundData) {
  const groups = games.map((game) => `
    <th colspan="2" class="game-heading">
      <span>${teamIcon(game.home)}${game.home}</span>
      <strong>x</strong>
      <span>${teamIcon(game.away)}${game.away}</span>
    </th>
  `).join('');

  const subheaders = games.map(() => '<th>PLACAR</th><th>1º GOL</th>').join('');
  const official = games.map((game) => {
    const result = game.result || {};
    const officialClass = result.homeGoals === undefined || result.awayGoals === undefined ? 'pending-official' : '';
    return `<td class="${officialClass}">${scoreText(result.homeGoals, result.awayGoals)}</td><td class="goal ${officialClass}">${shortPlayer(result.firstGoalPlayer)}</td>`;
  }).join('');

  const rows = participants.map((participant) => {
    const points = roundPoints(participant, games, predictions);
    const cells = games.map((game) => {
      const prediction = predictions.get(`${participant.id}|${game.id}`);
      if (!prediction) return '<td class="prediction muted">-</td><td class="prediction goal muted">-</td>';
      const correction = prediction.correction || {};
      const ball = correction.goalHit ? '<span class="ball" aria-label="Primeiro gol correto">⚽</span>' : '';
      return `<td class="prediction"><span class="score-badge ${statusClass(correction)}">${scoreText(prediction.homeGoals, prediction.awayGoals)}</span></td><td class="prediction goal">${shortPlayer(prediction.firstGoal)}${ball}</td>`;
    }).join('');
    return `<tr><th scope="row" class="name-cell">${participant.name}</th><td class="points-cell">${points}</td>${cells}</tr>`;
  }).join('');

  table.innerHTML = `<thead><tr><th rowspan="2" class="sticky-name">PARTICIPANTE</th><th rowspan="2" class="sticky-points">PTS</th>${groups}</tr><tr>${subheaders}</tr></thead><tbody><tr class="official-row"><th scope="row" class="name-cell">OFICIAL</th><td class="points-cell">-</td>${official}</tr>${rows}</tbody>`;

  const finishedGames = games.filter((game) => game.result && game.result.homeGoals !== undefined && game.result.awayGoals !== undefined).length;
  matrixEyebrow.textContent = `PALPITES DA RODADA ${round}`;
  matrixTitle.textContent = 'Gabarito e palpites da galera';
  roundMeta.textContent = `${finishedGames}/${games.length} jogos com gabarito - ${participants.length} participantes`;
  roundStatus.textContent = isDeadlineClosed(roundData) ? 'RODADA FECHADA' : 'GABARITO LANÇADO';
}

function renderBlocked(round, participants, games) {
  table.innerHTML = `<tbody><tr><td class="blocked-message">Palpites da Rodada ${String(round).padStart(2, '0')} ainda não liberados. Eles aparecem aqui após o fechamento da rodada ou após o gabarito ser salvo.</td></tr></tbody>`;
  matrixEyebrow.textContent = `RODADA ${round}`;
  matrixTitle.textContent = 'Aguardando fechamento/gabarito';
  roundMeta.textContent = `${games.length} jogos - ${participants.length} participantes`;
  roundStatus.textContent = 'AGUARDANDO FECHAMENTO';
}

async function loadRound(round) {
  table.innerHTML = '<tbody><tr><td class="blocked-message">Carregando palpites...</td></tr></tbody>';
  try {
    const [participants, games, predictions, roundData] = await Promise.all([getParticipants(), getGames(round), getPredictions(round), getRound(round)]);
    const hasAnyResult = games.some((game) => game.result && game.result.homeGoals !== undefined && game.result.awayGoals !== undefined);
    const hasAnyCorrection = [...predictions.values()].some((prediction) => prediction.correction?.corrected);
    const deadlineClosed = isDeadlineClosed(roundData);

    if (!deadlineClosed && !hasAnyResult && !hasAnyCorrection) return renderBlocked(round, participants, games);
    renderClosedRound(round, participants, games, predictions, roundData);
  } catch (error) {
    console.error(error);
    table.innerHTML = `<tbody><tr><td class="blocked-message">Erro ao carregar Galera: ${error.message}</td></tr></tbody>`;
  }
}

async function boot() {
  table.innerHTML = '<tbody><tr><td class="blocked-message">Procurando rodada visível...</td></tr></tbody>';
  const firstRound = await getFirstVisibleRound();
  roundSelect.value = String(firstRound);
  await loadRound(firstRound);
}

roundSelect.addEventListener('change', (event) => loadRound(+event.target.value));
boot();