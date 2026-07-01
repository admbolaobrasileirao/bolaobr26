import { auth, db, adminEmail } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

let SQUADS = {};
let currentGames = [];

try {
  ({ SQUADS } = await import('./squads.js'));
} catch (error) {
  console.error(error);
}

const resultList = document.querySelector('#result-list');
const resultRound = document.querySelector('#result-round');
const resultCount = document.querySelector('#result-count');
const deadlineList = document.querySelector('#deadline-list');
const reminderRound = document.querySelector('#reminder-round');
const reminderList = document.querySelector('#reminder-list');
const reminderSummary = document.querySelector('#reminder-summary');
const participantsList = document.querySelector('#participants-list');
const extraHome = document.querySelector('#extra-home');
const extraAway = document.querySelector('#extra-away');
const extraDeadline = document.querySelector('#extra-deadline');
const extraLabel = document.querySelector('#extra-label');
const extraFeedback = document.querySelector('#extra-feedback');
const extraList = document.querySelector('#extra-list');
const squadTeam = document.querySelector('#squad-team');
const squadPlayers = document.querySelector('#squad-players');
const squadFeedback = document.querySelector('#squad-feedback');

function fillRoundSelect(select, selected = 19) {
  select.innerHTML = Array.from(
    { length: 38 },
    (_, index) => `<option value="${index + 1}" ${index + 1 === selected ? 'selected' : ''}>Rodada ${String(index + 1).padStart(2, '0')}</option>`,
  ).join('');
}

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === tab));
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.toggle('active', panel.id === tab.dataset.panel));
}));

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

  return {
    scorePoints,
    goalPoints: goalHit ? 5 : 0,
    totalPoints: scorePoints + (goalHit ? 5 : 0),
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
  return { homeGoals: +scoreSelects[0].value, awayGoals: +scoreSelects[1].value, firstGoalTeam: team || null, firstGoalPlayer: player || null };
}

async function getGames(round) {
  const snap = await getDocs(query(collection(db, 'games'), where('round', '==', round)));
  const games = [];
  snap.forEach((item) => games.push({ id: item.id, ...item.data() }));
  return games.sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function getParticipants() {
  const snap = await getDocs(collection(db, 'participants'));
  const participants = [];
  snap.forEach((item) => participants.push({ id: item.id, ...item.data() }));
  return participants.sort((a, b) => (a.order || 999) - (b.order || 999));
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

  return { corrected: predictions.length, totalPoints, cravadas, goalHits };
}

async function saveRound() {
  const button = document.querySelector('#save-round');
  const summary = document.querySelector('#round-feedback');
  const rows = [...document.querySelectorAll('.game')];
  const filledRows = rows
    .map((row) => ({ row, game: currentGames.find((game) => game.id === row.dataset.gameId), result: readResult(row) }))
    .filter((item) => item.result);

  if (!filledRows.length) return alert('Preencha pelo menos um placar antes de salvar.');

  button.disabled = true;
  button.textContent = 'SALVANDO RODADA...';
  summary.textContent = '';

  let correctedGames = 0;
  let correctedPredictions = 0;

  try {
    for (const item of filledRows) {
      const correctionSummary = await correctGame(item.game, item.result);
      await updateDoc(doc(db, 'games', item.game.id), { result: item.result, correctionSummary, status: 'finished' });
      item.row.querySelector('.feedback').textContent = `${correctionSummary.corrected} palpites corrigidos`;
      correctedGames += 1;
      correctedPredictions += correctionSummary.corrected;
      summary.textContent = `Salvando... ${correctedGames}/${filledRows.length} jogos`;
    }
    summary.textContent = `${correctedGames} jogos salvos · ${correctedPredictions} palpites corrigidos`;
  } catch (error) {
    console.error(error);
    alert(`Não foi possível salvar/corrigir: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'SALVAR RODADA';
    loadReminders(+reminderRound.value);
  }
}

async function loadResults(round) {
  currentGames = [];
  resultList.textContent = 'Carregando jogos...';

  try {
    currentGames = await getGames(round);
    resultCount.textContent = `${currentGames.length} jogos`;
    resultList.innerHTML = '';

    currentGames.forEach((game) => {
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
      resultList.append(row);
    });

    const actions = document.createElement('div');
    actions.className = 'round-actions';
    actions.innerHTML = '<button id="save-round" class="save-round">SALVAR RODADA</button><span id="round-feedback"></span>';
    resultList.append(actions);
    document.querySelector('#save-round').onclick = saveRound;
  } catch (error) {
    console.error(error);
    resultList.textContent = `Erro ao carregar jogos: ${error.message}`;
  }
}

async function loadDeadlines() {
  deadlineList.textContent = 'Carregando fechamentos...';
  const snap = await getDocs(collection(db, 'rounds'));
  const rounds = new Map();
  snap.forEach((item) => rounds.set(item.id, item.data()));

  deadlineList.innerHTML = Array.from({ length: 38 }, (_, index) => {
    const number = index + 1;
    const round = rounds.get(`r${number}`) || {};
    const value = round.deadline ? round.deadline.slice(0, 16) : '';
    return `
      <div class="deadline-row" data-round="${number}">
        <strong>Rodada ${String(number).padStart(2, '0')}</strong>
        <input type="datetime-local" value="${value}">
        <small>${round.month || ''}</small>
      </div>
    `;
  }).join('');
}

async function saveDeadlines() {
  const button = document.querySelector('#save-deadlines');
  const feedback = document.querySelector('#deadline-feedback');
  const rows = [...document.querySelectorAll('.deadline-row')];
  button.disabled = true;
  feedback.textContent = 'Salvando...';

  try {
    await Promise.all(rows.map((row) => {
      const number = +row.dataset.round;
      const value = row.querySelector('input').value;
      return setDoc(doc(db, 'rounds', `r${number}`), { number, deadline: value || null }, { merge: true });
    }));
    feedback.textContent = 'Fechamentos salvos.';
  } catch (error) {
    console.error(error);
    feedback.textContent = `Erro: ${error.message}`;
  } finally {
    button.disabled = false;
  }
}

async function loadReminders(round) {
  reminderList.innerHTML = '<tr><td colspan="2">Carregando...</td></tr>';
  const [participants, games, predictionsSnap] = await Promise.all([
    getParticipants(),
    getGames(round),
    getDocs(query(collection(db, 'predictions'), where('round', '==', round))),
  ]);

  const counts = new Map(participants.map((participant) => [participant.id, 0]));
  predictionsSnap.forEach((item) => {
    const prediction = item.data();
    if (counts.has(prediction.participant)) counts.set(prediction.participant, counts.get(prediction.participant) + 1);
  });

  let complete = 0;
  reminderList.innerHTML = participants.map((participant) => {
    const count = counts.get(participant.id) || 0;
    const missing = Math.max(0, games.length - count);
    let label = 'Completo';
    let cls = 'status-ok';
    if (count === 0) { label = `Faltam ${games.length}`; cls = 'status-empty'; }
    else if (missing > 0) { label = `Faltam ${missing}`; cls = 'status-warn'; }
    else complete += 1;
    return `<tr><td>${participant.name}</td><td><span class="status-pill ${cls}">${label}</span></td></tr>`;
  }).join('');

  reminderSummary.textContent = `${complete}/${participants.length} completos`;
}

async function loadParticipants() {
  participantsList.textContent = 'Carregando participantes...';
  const participants = await getParticipants();
  participantsList.innerHTML = participants.map((participant) => `
    <div class="person-row" data-id="${participant.id}">
      <strong>${participant.name}</strong>
      <span>${participant.pin ? 'PIN criado' : 'Sem PIN'}</span>
      <button type="button">Resetar PIN</button>
    </div>
  `).join('');

  participantsList.querySelectorAll('button').forEach((button) => {
    button.onclick = async () => {
      const row = button.closest('.person-row');
      if (!confirm('Resetar o PIN deste participante?')) return;
      await updateDoc(doc(db, 'participants', row.dataset.id), { pin: null });
      loadParticipants();
    };
  });
}

async function loadExtras() {
  extraList.textContent = 'Carregando jogos extras...';
  try {
    const snap = await getDocs(query(collection(db, 'games'), where('extra', '==', true)));
    const extras = [];
    snap.forEach((item) => extras.push({ id: item.id, ...item.data() }));
    extras.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));

    if (!extras.length) {
      extraList.innerHTML = '<p>Nenhum jogo extra cadastrado ainda.</p>';
      return;
    }

    extraList.innerHTML = extras.map((game) => `
      <div class="extra-row" data-id="${game.id}">
        <strong>${game.home} × ${game.away}</strong>
        <span>${game.label || 'Jogo extra'} · ${game.deadline || 'sem deadline'}</span>
        <button class="danger" type="button">Remover</button>
      </div>
    `).join('');

    extraList.querySelectorAll('button').forEach((button) => {
      button.onclick = async () => {
        const row = button.closest('.extra-row');
        if (!confirm('Remover este jogo extra?')) return;
        await deleteDoc(doc(db, 'games', row.dataset.id));
        loadExtras();
      };
    });
  } catch (error) {
    console.error(error);
    extraList.textContent = `Erro ao carregar jogos extras: ${error.message}`;
  }
}

async function addExtraGame() {
  const home = extraHome.value.trim();
  const away = extraAway.value.trim();
  const deadline = extraDeadline.value;
  const label = extraLabel.value.trim();

  if (!home || !away) return alert('Informe mandante e visitante.');

  const ref = doc(collection(db, 'games'));
  extraFeedback.textContent = 'Criando jogo extra...';

  try {
    await setDoc(ref, {
      round: 99,
      order: Date.now(),
      home,
      away,
      deadline: deadline || null,
      label: label || 'Jogo extra',
      status: 'scheduled',
      extra: true,
      createdAt: new Date().toISOString(),
    });

    extraHome.value = '';
    extraAway.value = '';
    extraDeadline.value = '';
    extraLabel.value = '';
    extraFeedback.textContent = 'Jogo extra criado.';
    loadExtras();
  } catch (error) {
    console.error(error);
    extraFeedback.textContent = `Erro: ${error.message}`;
  }
}

async function getSavedSquad(team) {
  const snap = await getDocs(query(collection(db, 'squads'), where('team', '==', team)));
  let saved = null;
  snap.forEach((item) => { saved = item.data(); });
  return saved?.players || SQUADS[team] || [];
}

async function loadSquadEditor(team = squadTeam.value) {
  if (!team) return;
  squadFeedback.textContent = 'Carregando elenco...';
  try {
    const players = await getSavedSquad(team);
    squadPlayers.value = players.join('\n');
    squadFeedback.textContent = `${players.length} atletas carregados.`;
  } catch (error) {
    console.error(error);
    squadFeedback.textContent = `Erro: ${error.message}`;
  }
}

async function saveSquad() {
  const team = squadTeam.value;
  const players = squadPlayers.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!team) return alert('Selecione um time.');

  squadFeedback.textContent = 'Salvando elenco...';
  try {
    await setDoc(doc(db, 'squads', team.replace(/[^\w-]+/g, '_')), { team, players }, { merge: true });
    SQUADS[team] = players;
    squadFeedback.textContent = `${players.length} atletas salvos.`;
  } catch (error) {
    console.error(error);
    squadFeedback.textContent = `Erro: ${error.message}`;
  }
}

function setupSquads() {
  const teams = Object.keys(SQUADS).sort((a, b) => a.localeCompare(b));
  squadTeam.innerHTML = teams.map((team) => `<option>${team}</option>`).join('');
  squadTeam.onchange = () => loadSquadEditor();
  document.querySelector('#save-squad').onclick = saveSquad;
  loadSquadEditor(teams[0]);
}

async function bootAdmin() {
  fillRoundSelect(resultRound, 19);
  fillRoundSelect(reminderRound, 19);
  resultRound.onchange = () => loadResults(+resultRound.value);
  reminderRound.onchange = () => loadReminders(+reminderRound.value);
  document.querySelector('#save-deadlines').onclick = saveDeadlines;
  document.querySelector('#add-extra').onclick = addExtraGame;
  setupSquads();

  await Promise.all([
    loadResults(+resultRound.value),
    loadDeadlines(),
    loadReminders(+reminderRound.value),
    loadParticipants(),
    loadExtras(),
  ]);
}

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== adminEmail) {
    resultList.textContent = 'Entre como Admin pelo acesso principal antes de abrir esta página.';
    return;
  }
  bootAdmin();
});
