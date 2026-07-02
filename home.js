import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const participantName = localStorage.getItem('bolaoParticipantName');
document.querySelector('#welcome-title').innerHTML = `OlÃ¡, ${participantName || 'craque'}! <span>ðŸ‘‹</span>`;
document.querySelector('#profile').textContent = participantName?.slice(0, 1) || '?';

function scoreText(homeGoals, awayGoals) {
  return `${homeGoals} Ã— ${awayGoals}`;
}

function shortPlayer(player) {
  return player ? player.split('â€¢').pop().trim() : 'â€”';
}

async function getParticipantsMap() {
  const snap = await getDocs(collection(db, 'participants'));
  const map = new Map();
  snap.forEach((item) => map.set(item.id, { id: item.id, ...item.data(), points: 0, cravadas: 0 }));
  return map;
}

async function loadLeaders() {
  const generalBox = document.querySelector('#general-leader');
  const monthlyBox = document.querySelector('#monthly-leader');

  try {
    const participants = await getParticipantsMap();
    const predictions = await getDocs(collection(db, 'predictions'));
    predictions.forEach((item) => {
      const prediction = item.data();
      const participant = participants.get(prediction.participant);
      if (!participant || !prediction.correction?.corrected) return;
      participant.points += prediction.correction.totalPoints || 0;
      if (prediction.correction.cravada) participant.cravadas += 1;
    });

    const ranking = [...participants.values()].sort((a, b) => b.points - a.points || b.cravadas - a.cravadas);
    const leader = ranking[0];

    if (!leader || leader.points === 0) {
      generalBox.innerHTML = '<p>Aguardando gabaritos</p><h2>â€”</h2><strong>0</strong><small>pts Â· ðŸŽ¯ 0 cravadas</small>';
    } else {
      generalBox.innerHTML = `<p>Na lideranÃ§a do campeonato</p><h2>ðŸ¥‡ ${leader.name}</h2><strong>${leader.points}</strong><small>pts Â· ðŸŽ¯ ${leader.cravadas} cravadas</small>`;
    }

    monthlyBox.innerHTML = '<p>Mensal serÃ¡ ativado com as deadlines</p><h2>â€”</h2><strong>0</strong><small>pts Â· ðŸŽ¯ 0 cravadas</small>';
  } catch (error) {
    console.error(error);
    generalBox.innerHTML = '<p>Erro ao carregar lÃ­der</p>';
    monthlyBox.innerHTML = '<p>Erro ao carregar mensal</p>';
  }
}

let countdownTimer = null;

function startCountdown(round) {
  const deadlineRound = document.querySelector('#deadline-round');
  const deadlineDate = document.querySelector('#deadline-date');
  const days = document.querySelector('#days');
  const hours = document.querySelector('#hours');
  const minutes = document.querySelector('#minutes');
  const seconds = document.querySelector('#seconds');

  if (!round?.deadline) {
    deadlineRound.textContent = 'Sem fechamento definido';
    deadlineDate.textContent = 'Defina no Admin';
    days.textContent = hours.textContent = minutes.textContent = seconds.textContent = '--';
    return;
  }

  const closingDate = new Date(round.deadline);
  deadlineRound.textContent = `Rodada ${String(round.number).padStart(2, '0')}`;
  deadlineDate.textContent = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(closingDate);

  const tick = () => {
    const totalSeconds = Math.max(0, Math.floor((closingDate - new Date()) / 1000));
    days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(2, '0');
    hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
    minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    seconds.textContent = String(totalSeconds % 60).padStart(2, '0');
  };

  if (countdownTimer) clearInterval(countdownTimer);
  tick();
  countdownTimer = setInterval(tick, 1000);
}

async function loadDeadline() {
  const snap = await getDocs(collection(db, 'rounds'));
  const rounds = [];
  snap.forEach((item) => rounds.push({ id: item.id, ...item.data() }));
  const now = new Date();
  const next = rounds
    .filter((round) => round.deadline && new Date(round.deadline) > now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
  startCountdown(next);
}

async function loadLatestResults() {
  const box = document.querySelector('#latest-results');
  const subtitle = document.querySelector('#results-subtitle');
  const snap = await getDocs(collection(db, 'games'));
  const games = [];

  snap.forEach((item) => {
    const game = item.data();
    if (game.result && game.result.homeGoals !== undefined && game.result.awayGoals !== undefined) {
      games.push({ id: item.id, ...game });
    }
  });

  games.sort((a, b) => (b.round || 0) - (a.round || 0) || (b.order || 0) - (a.order || 0));
  const latestRound = games[0]?.round;
  const latest = games.filter((game) => game.round === latestRound).sort((a, b) => (a.order || 0) - (b.order || 0));

  if (!latest.length) {
    subtitle.textContent = 'Nenhum gabarito lançado ainda';
    box.innerHTML = '<p class="subtitle">Quando você lançar gabaritos no Admin, eles aparecem aqui.</p>';
    return;
  }

  subtitle.textContent = `Rodada ${String(latestRound).padStart(2, '0')} · ${latest.length} resultados`;
  const columns = [latest.slice(0, 5), latest.slice(5, 10)];
  box.innerHTML = columns.map((column) => `
    <div class="result-list">
      <div class="result-header"><span>PARTIDA</span><span>⚽ GOL</span></div>
      ${column.map((game) => `
        <div class="result">
          <span class="team-side home-side">${teamIcon(game.home)}${game.home}</span>
          <b>${scoreText(game.result.homeGoals, game.result.awayGoals)}</b>
          <span class="team-side away-side">${game.away}${teamIcon(game.away)}</span>
          <em>${shortPlayer(game.result.firstGoalPlayer)}</em>
        </div>
      `).join('')}
    </div>
  `).join('');
}
loadLeaders();
loadDeadline();
loadLatestResults();

