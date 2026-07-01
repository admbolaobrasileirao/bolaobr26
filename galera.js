import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const roundSelect = document.querySelector('#round');
const table = document.querySelector('#prediction-table');
const roundMeta = document.querySelector('#round-meta');
const matrixEyebrow = document.querySelector('#matrix-eyebrow');
const matrixTitle = document.querySelector('#matrix-title');
const roundStatus = document.querySelector('#round-status');

const rounds = Array.from({ length: 38 }, (_, index) => index + 1);

roundSelect.innerHTML = rounds
  .map((round) => `<option value="${round}" ${round === 19 ? 'selected' : ''}>Rodada ${String(round).padStart(2, '0')}</option>`)
  .join('');

function scoreText(homeGoals, awayGoals) {
  if (homeGoals === undefined || awayGoals === undefined || homeGoals === null || awayGoals === null) return '—';
  return `${homeGoals}×${awayGoals}`;
}

function shortPlayer(player) {
  if (!player) return '—';
  return player.split('•').pop().trim();
}

function statusClass(correction) {
  if (!correction?.corrected) return 'pending';
  if (correction.status === 'cravada') return 'correct';
  if (correction.status === 'acerto') return 'match';
  return 'miss';
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

function renderClosedRound(round, participants, games, predictions) {
  const groups = games.map((game) => `
    <th colspan="2" class="game-heading">
      <span>${teamIcon(game.home)}${game.home}</span>
      <strong>×</strong>
      <span>${teamIcon(game.away)}${game.away}</span>
    </th>
  `).join('');

  const subheaders = games.map(() => '<th>PLACAR</th><th>⚽ 1º GOL</th>').join('');

  const official = games.map((game) => {
    const result = game.result || {};
    return `
      <td>${scoreText(result.homeGoals, result.awayGoals)}</td>
      <td class="goal">${shortPlayer(result.firstGoalPlayer)}</td>
    `;
  }).join('');

  const rows = participants.map((participant) => {
    const cells = games.map((game) => {
      const prediction = predictions.get(`${participant.id}|${game.id}`);

      if (!prediction) {
        return '<td class="prediction muted">—</td><td class="prediction goal muted">—</td>';
      }

      const correction = prediction.correction || {};
      const scoreClass = statusClass(correction);
      const ball = correction.goalHit ? '<span class="ball" aria-label="Primeiro gol correto">⚽</span>' : '';

      return `
        <td class="prediction"><span class="score-badge ${scoreClass}">${scoreText(prediction.homeGoals, prediction.awayGoals)}</span></td>
        <td class="prediction goal">${shortPlayer(prediction.firstGoal)}${ball}</td>
      `;
    }).join('');

    return `<tr><th scope="row" class="name-cell">${participant.name}</th>${cells}</tr>`;
  }).join('');

  table.innerHTML = `
    <thead>
      <tr><th rowspan="2" class="sticky-name">PARTICIPANTE</th>${groups}</tr>
      <tr>${subheaders}</tr>
    </thead>
    <tbody>
      <tr class="official-row"><th scope="row" class="name-cell">OFICIAL</th>${official}</tr>
      ${rows}
    </tbody>
  `;

  matrixEyebrow.textContent = `PALPITES DA RODADA ${round}`;
  matrixTitle.textContent = 'Gabarito e palpites da galera';
  roundMeta.textContent = `${games.length} jogos · ${participants.length} participantes`;
  roundStatus.textContent = '🔒 RODADA FECHADA';
}

function renderBlocked(round, participants, games) {
  table.innerHTML = `
    <tbody>
      <tr>
        <td class="blocked-message">
          Palpites da Rodada ${String(round).padStart(2, '0')} ainda não liberados.
          Eles aparecem aqui depois que pelo menos um gabarito da rodada for salvo no Admin.
        </td>
      </tr>
    </tbody>
  `;
  matrixEyebrow.textContent = `RODADA ${round}`;
  matrixTitle.textContent = 'Aguardando fechamento/gabarito';
  roundMeta.textContent = `${games.length} jogos · ${participants.length} participantes`;
  roundStatus.textContent = '🔐 AGUARDANDO FECHAMENTO';
}

async function loadRound(round) {
  table.innerHTML = '<tbody><tr><td class="blocked-message">Carregando palpites...</td></tr></tbody>';

  try {
    const [participants, games, predictions] = await Promise.all([
      getParticipants(),
      getGames(round),
      getPredictions(round),
    ]);

    const hasAnyResult = games.some((game) => game.result && game.result.homeGoals !== undefined && game.result.awayGoals !== undefined);

    if (!hasAnyResult) {
      renderBlocked(round, participants, games);
      return;
    }

    renderClosedRound(round, participants, games, predictions);
  } catch (error) {
    console.error(error);
    table.innerHTML = `<tbody><tr><td class="blocked-message">Erro ao carregar Galera: ${error.message}</td></tr></tbody>`;
  }
}

roundSelect.addEventListener('change', (event) => loadRound(+event.target.value));
loadRound(+roundSelect.value);
