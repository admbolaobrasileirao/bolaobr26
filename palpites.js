import { db } from './firebase-config.js';
import { SQUADS } from './squads.js';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const participantId = localStorage.getItem('bolaoParticipantId');
const participantName = localStorage.getItem('bolaoParticipantName');
const roundSelect = document.querySelector('#round');
const gameList = document.querySelector('#games');
const roundCount = document.querySelector('#round-count');
const roundEyebrow = document.querySelector('#round-eyebrow');
const saveStatus = document.querySelector('#save-status');
const saveButton = document.querySelector('#save-predictions');
const profile = document.querySelector('#profile');
const roundStatus = document.querySelector('#round-status');

let currentGames = [];
let currentPredictions = new Map();

if (!participantId) {
  alert('Entre pela tela inicial para acessar seus palpites.');
  window.location.href = 'index.html';
}

profile.textContent = participantName?.slice(0, 1) || '?';

roundSelect.innerHTML = Array.from(
  { length: 38 },
  (_, index) => `<option value="${index + 1}">Rodada ${String(index + 1).padStart(2, '0')}</option>`,
).join('');
roundSelect.value = '19';

const numberOptions = (value) => `
  <option value="">-</option>
  ${Array.from({ length: 10 }, (_, number) => `<option value="${number}" ${number === value ? 'selected' : ''}>${number}</option>`).join('')}
`;

const playerOptions = (team, selectedPlayer) => {
  const squad = SQUADS[team] || [];
  return `
    <option value="">${team ? 'Jogador do 1º gol' : 'Escolha o time primeiro'}</option>
    ${squad.map((player) => `<option ${player === selectedPlayer ? 'selected' : ''}>${player}</option>`).join('')}
  `;
};

async function getGames(round) {
  const snap = await getDocs(query(collection(db, 'games'), where('round', '==', round)));
  const games = [];
  snap.forEach((item) => games.push({ id: item.id, ...item.data() }));
  return games.sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function getPredictions(round) {
  const snap = await getDocs(query(collection(db, 'predictions'), where('round', '==', round), where('participant', '==', participantId)));
  const predictions = new Map();
  snap.forEach((item) => predictions.set(item.data().game, { id: item.id, ...item.data() }));
  return predictions;
}

function syncPlayerSelect(row, selectedPlayer = '') {
  const teamSelect = row.querySelector('.goal-team');
  const playerSelect = row.querySelector('.goal-player');
  const team = teamSelect.value;

  playerSelect.disabled = !team;
  playerSelect.innerHTML = playerOptions(team, selectedPlayer);
}

function renderGames(round) {
  roundEyebrow.textContent = `RODADA ${round}`;
  roundCount.textContent = `${currentGames.length} jogos`;
  roundStatus.textContent = '🔓 RODADA ABERTA';
  saveStatus.textContent = `${participantName}, escolha o placar e o primeiro gol de cada partida.`;

  gameList.innerHTML = currentGames.map((game) => {
    const prediction = currentPredictions.get(game.id) || {};
    const selectedTeam = prediction.firstGoalTeam || '';

    return `
      <article class="game" data-game-id="${game.id}">
        <div class="score-prediction">
          <span class="team home">${game.home}${teamIcon(game.home)}</span>
          <select class="home-goals" aria-label="Gols do ${game.home}">${numberOptions(prediction.homeGoals)}</select>
          <span class="versus">×</span>
          <select class="away-goals" aria-label="Gols do ${game.away}">${numberOptions(prediction.awayGoals)}</select>
          <span class="team">${teamIcon(game.away)}${game.away}</span>
        </div>
        <div class="first-goal">
          <select class="goal-team" aria-label="Time do primeiro gol">
            <option value="">⚽ Time do 1º gol</option>
            <option value="${game.home}" ${selectedTeam === game.home ? 'selected' : ''}>${game.home}</option>
            <option value="${game.away}" ${selectedTeam === game.away ? 'selected' : ''}>${game.away}</option>
          </select>
          <select class="goal-player" aria-label="Jogador do primeiro gol"></select>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.game').forEach((row) => {
    const prediction = currentPredictions.get(row.dataset.gameId) || {};
    syncPlayerSelect(row, prediction.firstGoal || '');
    row.querySelector('.goal-team').addEventListener('change', () => syncPlayerSelect(row));
  });
}

async function loadRound(round) {
  gameList.innerHTML = '<p class="form-note">Carregando jogos...</p>';
  saveButton.disabled = true;

  try {
    [currentGames, currentPredictions] = await Promise.all([
      getGames(round),
      getPredictions(round),
    ]);
    renderGames(round);
  } catch (error) {
    console.error(error);
    gameList.innerHTML = `<p class="form-note">Erro ao carregar jogos: ${error.message}</p>`;
  } finally {
    saveButton.disabled = false;
  }
}

function readPrediction(row) {
  const homeGoals = row.querySelector('.home-goals').value;
  const awayGoals = row.querySelector('.away-goals').value;
  const firstGoalTeam = row.querySelector('.goal-team').value;
  const firstGoal = row.querySelector('.goal-player').value;

  if (homeGoals === '' || awayGoals === '') return null;

  return {
    homeGoals: +homeGoals,
    awayGoals: +awayGoals,
    firstGoalTeam: firstGoalTeam || null,
    firstGoal: firstGoal || null,
  };
}

async function savePredictions() {
  const round = +roundSelect.value;
  const rows = [...document.querySelectorAll('.game')];
  const filled = rows
    .map((row) => ({ row, game: currentGames.find((item) => item.id === row.dataset.gameId), prediction: readPrediction(row) }))
    .filter((item) => item.prediction);

  if (!filled.length) {
    alert('Preencha pelo menos um placar antes de salvar.');
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'SALVANDO...';

  try {
    await Promise.all(filled.map((item) => setDoc(doc(db, 'predictions', `${item.game.id}-${participantId}`), {
      round,
      participant: participantId,
      game: item.game.id,
      ...item.prediction,
      savedAt: new Date().toISOString(),
    }, { merge: true })));

    saveStatus.textContent = `${filled.length} palpites salvos com sucesso.`;
    saveButton.textContent = 'SALVO ✓';
  } catch (error) {
    console.error(error);
    alert(`Não foi possível salvar: ${error.message}`);
    saveButton.textContent = 'ERRO AO SALVAR';
  } finally {
    setTimeout(() => {
      saveButton.disabled = false;
      saveButton.textContent = 'SALVAR PALPITES';
    }, 1600);
  }
}

roundSelect.addEventListener('change', () => loadRound(+roundSelect.value));
saveButton.addEventListener('click', savePredictions);
loadRound(+roundSelect.value);
