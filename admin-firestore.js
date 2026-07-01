import { auth, db, adminEmail } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

let SQUADS = {};
let squadsLoadError = null;

try {
  ({ SQUADS } = await import('./data/squads.js'));
} catch (error) {
  squadsLoadError = error;
}

const panel = document.querySelector('#results');
const list = document.querySelector('#result-list');

const scores = (value) => `
  <select>
    ${Array.from({ length: 10 }, (_, n) => `<option ${n === value ? 'selected' : ''}>${n}</option>`).join('')}
  </select>
`;

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

async function load(round) {
  list.textContent = 'Carregando jogos...';

  try {
    const snap = await getDocs(query(collection(db, 'games'), where('round', '==', round)));
    const games = [];
    snap.forEach((item) => games.push({ id: item.id, ...item.data() }));
    games.sort((a, b) => (a.order || 0) - (b.order || 0));

    list.innerHTML = '';

    if (!games.length) {
      list.textContent = `Nenhum jogo encontrado para a Rodada ${String(round).padStart(2, '0')}.`;
      return;
    }

    games.forEach((game) => {
      const result = game.result || {};
      const row = document.createElement('div');
      row.className = 'game';
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
        <button class="save">SALVAR</button>
      `;

      syncPlayerSelect(row, result.firstGoalPlayer || '');

      row.querySelector('.team').onchange = () => syncPlayerSelect(row);

      row.querySelector('.save').onclick = async () => {
        const selects = row.querySelectorAll('select');
        const button = row.querySelector('.save');

        button.textContent = 'SALVANDO...';

        try {
          await updateDoc(doc(db, 'games', game.id), {
            result: {
              homeGoals: +selects[0].value,
              awayGoals: +selects[1].value,
              firstGoalTeam: selects[2].value || null,
              firstGoalPlayer: selects[3].value || null,
            },
          });
          button.textContent = 'SALVO ✓';
        } catch (error) {
          console.error(error);
          button.textContent = 'ERRO';
          alert(`Não foi possível salvar: ${error.message}`);
        }
      };

      list.append(row);
    });
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
    list.textContent = 'Arquivo de elencos não encontrado. Confira se data/squads.js foi enviado para o GitHub dentro da pasta data.';
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
