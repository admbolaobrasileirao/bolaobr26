import { db } from './firebase-config.js';
import { SQUADS as DEFAULT_SQUADS } from './squads.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

let cachedSquads = null;

export async function getSquads() {
  if (cachedSquads) return cachedSquads;

  const squads = { ...DEFAULT_SQUADS };

  try {
    const snap = await getDocs(collection(db, 'squads'));
    snap.forEach((item) => {
      const squad = item.data();
      if (squad.team && Array.isArray(squad.players)) {
        squads[squad.team] = squad.players;
      }
    });
  } catch (error) {
    console.warn('Não foi possível carregar elencos editados. Usando base local.', error);
  }

  cachedSquads = squads;
  return squads;
}
