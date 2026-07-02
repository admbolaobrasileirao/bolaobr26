import { db } from './firebase-config.js';
import { getSquads } from './squads-service.js';
import {
  collection,
  doc,
  getDoc,
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
const deadlineCount = document.querySelector('#deadline-count');
const deadlineLabel = document.querySelector('#deadline-label');

let currentGames = [];
let currentPredictions = new Map();
let currentDeadline = null;
let currentLocked = false;
let squads = {};
let deadlineTimer = null;

if (!participantId) {
  alert('Entre pela tela inicial para acessar seus palpites.');
  window.location.href = 'index.html';
}

profile.textContent = participantName?.slice(0, 1) || '?';

roundSelect.innerHTML = [
  ...Array.from({ length: 38 }, (_, index) => `<option value="${index + 1}">Rodada ${String(index + 1).padStart(2, '0')}</option>`),
  '<option value="extras">Extras / Atrasados</option>',
].join('');
roundSelect.value = '19';

const numberOptions = (value) => `
  <option value="">-</option>
  ${Array.from({ length: 10 }, (_, number) => `<option value="${number}" ${number === value ? 'selected' : ''}>${number}</option>`).join('')}
`;

const playerOptions = (team, selectedPlayer) => {
  const squad = squads[team] || [];
  return `
    <option value="">${team ? 'Jogador do 1º gol' : 'Escolha o time primeiro'}</option>
    ${squad.map((player) => `<option ${player === selectedPlayer ? 'selected' : ''}>${player}</option>`).join('')}
  `;
};

async function getRoundDeadline(round) {
  if (round === 'extras') return null;
  const snap = await getDoc(doc(db, 'rounds', `r${round}`));
  return snap.data()?.deadline || null;
}

function isGameLocked(game) {
  const deadline = game.deadline || currentDeadline;
  return !!deadline && new Date(deadline) <= new Date();
}

function updateDeadlineDisplay(round) {
  if (deadlineTimer) clearInterval(deadlineTimer);

  const deadline = round === 'extras' ? null : currentDeadline;

  if (!deadline) {
    deadlineCount.textContent = '--';
    deadlineLabel.textContent = round === 'extras' ? 'Cada extra tem deadline própria' : 'Deadline não definida';
    roundStatus.textContent = '🔓 RODADA ABERTA';
    return;
  }

  const closingDate = new Date(deadline);
  deadlineLabel.textContent = `Rodada ${String(round).padStart(2, '0')} · ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(closingDate)}`;

  const tick = () => {
    const totalSeconds = Math.max(0, Math.floor((closingDate - new Date()) / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    deadlineCount.textContent = totalSeconds > 0 ? `${days}d ${hours}h ${minutes}m` : 'FECHADA';
    currentLocked = totalSeconds <= 0;
    roundStatus.textContent = currentLocked ? '🔒 RODADA FECHADA' : '🔓 RODADA ABERTA';
    saveButton.disabled = currentLocked;
  };

  tick();
  deadlineTimer = setInterval(tick, 30000);
}

async function getGames(round) {
  const q = round === 'extras'
    ? query(collection(db, 'games'), where('extra', '==', true))
    : query(collection(db, 'games'), where('round', '==', +round));
  const snap = await getDocs(q);
  const games = [];
  snap.forEach((item) => games.push({ id: item.id, ...item.data() }));
  return games.sort((a, b) => (a.order || 0) - (b.order || 0) || (a.kickoff || '').localeCompare(b.kickoff || '') || (a.deadline || '').localeCompare(b.deadline || ''));
}

async function getPredictions(round) {
  const roundValue = round === 'extras' ? 99 : +round;
  const snap = await getDocs(query(collection(db, 'predictions'), where('round', '==', roundValue), where('participant', '==', participantId)));
  const predictions = new Map();
  snap.forEach((item) => predictions.set(item.data().game, { id: item.id, ...item.data() }));
  return predictions;
}

function syncPlayerSelect(row, selectedPlayer = '') {
  const teamSelect = row.querySelector('.goal-team');
  const playerSelect = row.querySelector('.goal-player');
  const team = teamSelect.value;
  playerSelect.disabled = !team || row.dataset.locked === 'true';
  playerSelect.innerHTML = playerOptions(team, selectedPlayer);
}

function formatKickoff(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function renderGames(round) {
  const label = round === 'extras' ? 'EXTRAS / ATRASADOS' : `RODADA ${round}`;
  roundEyebrow.textContent = label;
  roundCount.textContent = `${currentGames.length} jogos`;
  saveStatus.textContent = `${participantName}, escolha o placar e o primeiro gol de cada partida.`;
  updateDeadlineDisplay(round);

  if (!currentGames.length) {
    gameList.innerHTML = '<p class="form-note">Nenhum jogo encontrado.</p>';
    return;
  }

  gameList.innerHTML = currentGames.map((game) => {
    const prediction = currentPredictions.get(game.id) || {};
    const selectedTeam = prediction.firstGoalTeam || '';
    const locked = isGameLocked(game);
    const kickoff = formatKickoff(game.kickoff);
    const lockText = locked ? '<small class="field-label">🔒 Fechado</small>' : '';

    return `
      <article class="game" data-game-id="${game.id}" data-locked="${locked}">
        ${kickoff ? `<small class="game-kickoff">🗓️ ${kickoff}</small>` : ''}
        <div class="score-prediction">
          <span class="team home">${game.home}${teamIcon(game.home)}</span>
          <select class="home-goals" ${locked ? 'disabled' : ''} aria-label="Gols do ${game.home}">${numberOptions(prediction.homeGoals)}</select>
          <span class="versus">×</span>
          <select class="away-goals" ${locked ? 'disabled' : ''} aria-label="Gols do ${game.away}">${numberOptions(prediction.awayGoals)}</select>
          <span class="team">${teamIcon(game.away)}${game.away}</span>
        </div>
        <div class="first-goal">
          <select class="goal-team" ${locked ? 'disabled' : ''} aria-label="Time do primeiro gol">
            <option value="">⚽ Time do 1º gol</option>
            <option value="${game.home}" ${selectedTeam === game.home ? 'selected' : ''}>${game.home}</option>
            <option value="${game.away}" ${selectedTeam === game.away ? 'selected' : ''}>${game.away}</option>
          </select>
          <select class="goal-player" aria-label="Jogador do primeiro gol"></select>
          ${lockText}
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
    [squads, currentDeadline, currentGames, currentPredictions] = await Promise.all([
      getSquads(),
      getRoundDeadline(round),
      getGames(round),
      getPredictions(round),
    ]);
    renderGames(round);
  } catch (error) {
    console.error(error);
    gameList.innerHTML = `<p class="form-note">Erro ao carregar jogos: ${error.message}</p>`;
  } finally {
    if (!currentLocked) saveButton.disabled = false;
  }
}

function readPrediction(row) {
  if (row.dataset.locked === 'true') return null;
  const homeGoals = row.querySelector('.home-goals').value;
  const awayGoals = row.querySelector('.away-goals').value;
  const firstGoalTeam = row.querySelector('.goal-team').value;
  const firstGoal = row.querySelector('.goal-player').value;
  if (homeGoals === '' || awayGoals === '') return null;
  return { homeGoals: +homeGoals, awayGoals: +awayGoals, firstGoalTeam: firstGoalTeam || null, firstGoal: firstGoal || null };
}

async function savePredictions() {
  const round = roundSelect.value;
  const roundValue = round === 'extras' ? 99 : +round;
  const rows = [...document.querySelectorAll('.game')];
  const filled = rows
    .map((row) => ({ row, game: currentGames.find((item) => item.id === row.dataset.gameId), prediction: readPrediction(row) }))
    .filter((item) => item.prediction);

  if (!filled.length) return alert('Preencha pelo menos um placar aberto antes de salvar.');

  saveButton.disabled = true;
  saveButton.textContent = 'SALVANDO...';

  try {
    await Promise.all(filled.map((item) => {
      const existing = currentPredictions.get(item.game.id);
      const predictionId = existing?.id || `${item.game.id}-${participantId}`;
      return setDoc(doc(db, 'predictions', predictionId), {
      round: roundValue,
      participant: participantId,
      game: item.game.id,
      ...item.prediction,
      savedAt: new Date().toISOString(),
      }, { merge: true });
    }));

    saveStatus.textContent = `${filled.length} palpites salvos com sucesso.`;
    saveButton.textContent = 'SALVO ✓';
  } catch (error) {
    console.error(error);
    alert(`Não foi possível salvar: ${error.message}`);
    saveButton.textContent = 'ERRO AO SALVAR';
  } finally {
    setTimeout(() => {
      saveButton.disabled = currentLocked;
      saveButton.textContent = 'SALVAR PALPITES';
    }, 1600);
  }
}

roundSelect.addEventListener('change', () => loadRound(roundSelect.value));
saveButton.addEventListener('click', savePredictions);
loadRound(roundSelect.value);
