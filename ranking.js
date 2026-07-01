import { db } from './firebase-config.js';
import { PARTICIPANTS } from './participants.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const generalTable = document.querySelector('#general-table');
const monthlyTable = document.querySelector('#monthly-table');
const g4 = document.querySelector('#g4');
const monthSelect = document.querySelector('#month');
const monthTitle = document.querySelector('#month-title');

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function emptyRows(message) {
  return `<tr><td colspan="4">${message}</td></tr>`;
}

function sortRanking(data) {
  return [...data].sort((a, b) => b.points - a.points || b.cravadas - a.cravadas || a.order - b.order);
}

function rows(data) {
  if (!data.length) return emptyRows('Nenhum palpite corrigido ainda.');
  return data.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td class="participant">${item.name}</td>
      <td>${item.points}</td>
      <td>🎯 ${item.cravadas}</td>
    </tr>
  `).join('');
}

function renderG4(data) {
  if (!data.length) {
    g4.innerHTML = '<article class="g4-card"><h3>Ranking vazio</h3><small>Salve gabaritos no Admin para gerar a classificação.</small></article>';
    return;
  }

  g4.innerHTML = data.slice(0, 4).map((item, index) => `
    <article class="g4-card rank-${index + 1}">
      <span class="position">${['🥇 1º', '🥈 2º', '🥉 3º', '4º'][index]}</span>
      <h3>${item.name}</h3>
      <strong>${item.points}</strong>
      <small>pts · 🎯 ${item.cravadas} cravadas</small>
    </article>
  `).join('');
}

function officialParticipants() {
  return new Map(PARTICIPANTS.map((participant, index) => [participant.id, {
    ...participant,
    order: index + 1,
    points: 0,
    cravadas: 0,
  }]));
}

async function getPredictions() {
  const snap = await getDocs(collection(db, 'predictions'));
  const predictions = [];
  snap.forEach((item) => predictions.push(item.data()));
  return predictions;
}

function buildGeneralRanking(participants, predictions) {
  predictions.forEach((prediction) => {
    const participant = participants.get(prediction.participant);
    if (!participant || !prediction.correction?.corrected) return;
    participant.points += prediction.correction.totalPoints || 0;
    if (prediction.correction.cravada) participant.cravadas += 1;
  });
  return sortRanking([...participants.values()]);
}

async function loadRanking() {
  generalTable.innerHTML = emptyRows('Carregando ranking...');
  monthlyTable.innerHTML = emptyRows('Carregando ranking...');

  try {
    const participants = officialParticipants();
    const predictions = await getPredictions();
    const general = buildGeneralRanking(participants, predictions);

    generalTable.innerHTML = rows(general);
    renderG4(general);
    monthlyTable.innerHTML = emptyRows('Ranking mensal será ativado quando cadastrarmos os meses/deadlines das rodadas.');
  } catch (error) {
    console.error(error);
    generalTable.innerHTML = emptyRows(`Erro ao carregar ranking: ${error.message}`);
    monthlyTable.innerHTML = emptyRows(`Erro ao carregar ranking: ${error.message}`);
    renderG4([]);
  }
}

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((item) => {
    item.classList.toggle('is-active', item === tab);
    item.setAttribute('aria-selected', item === tab);
  });
  document.querySelector('#general').classList.toggle('is-hidden', tab.dataset.target !== 'general');
  document.querySelector('#monthly').classList.toggle('is-hidden', tab.dataset.target !== 'monthly');
}));

monthSelect.innerHTML = months.map((month) => `<option>${month}</option>`).join('');
monthSelect.value = 'Julho';
monthSelect.addEventListener('change', (event) => {
  monthTitle.textContent = `Classificação de ${event.target.value.toLowerCase()}`;
});

loadRanking();
