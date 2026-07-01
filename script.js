import { db } from './firebase-config.js';
import { PARTICIPANTS } from './participants.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const tabs = document.querySelectorAll('.tab');
const participantPanel = document.querySelector('#participant-panel');
const adminPanel = document.querySelector('#admin-panel');
const participantSelect = document.querySelector('#participant');
const participantNote = document.querySelector('#participant-note');

participantSelect.innerHTML += PARTICIPANTS
  .map((participant) => `<option value="${participant.id}">${participant.name}</option>`)
  .join('');

tabs.forEach((tab) => tab.addEventListener('click', () => {
  const participant = tab.id === 'participant-tab';
  tabs.forEach((item) => {
    item.classList.toggle('is-active', item === tab);
    item.setAttribute('aria-selected', item === tab);
  });
  participantPanel.classList.toggle('is-hidden', !participant);
  adminPanel.classList.toggle('is-hidden', participant);
}));

function getPin(groupId) {
  return [...document.querySelectorAll(`#${groupId} .pin-input`)].map((input) => input.value).join('');
}

function clearPins() {
  document.querySelectorAll('.pin-input').forEach((input) => { input.value = ''; });
}

document.querySelectorAll('.pin-boxes').forEach((group) => {
  const inputs = [...group.querySelectorAll('.pin-input')];
  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && inputs[index + 1]) inputs[index + 1].focus();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && inputs[index - 1]) inputs[index - 1].focus();
    });
    input.addEventListener('paste', (event) => {
      const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
      if (!digits) return;
      event.preventDefault();
      [...digits].forEach((digit, digitIndex) => {
        if (inputs[digitIndex]) inputs[digitIndex].value = digit;
      });
      inputs[Math.min(digits.length, 4) - 1].focus();
    });
  });
});

participantSelect.addEventListener('change', async () => {
  clearPins();
  participantNote.textContent = 'Verificando acesso...';

  try {
    const snap = await getDoc(doc(db, 'participants', participantSelect.value));
    const participant = snap.data();
    participantNote.textContent = participant?.pin
      ? 'PIN já criado. Digite seu PIN para entrar.'
      : 'Primeiro acesso: crie seu PIN e confirme abaixo.';
  } catch {
    participantNote.textContent = 'Digite seu PIN para entrar.';
  }
});

participantPanel.addEventListener('submit', async (event) => {
  event.preventDefault();

  const participantId = participantSelect.value;
  const participant = PARTICIPANTS.find((item) => item.id === participantId);
  const pin = getPin('pin');
  const confirmPin = getPin('pin-confirm');

  if (!participantId) return alert('Selecione seu nome.');
  if (pin.length !== 4) return alert('Digite um PIN de 4 dígitos.');

  const ref = doc(db, 'participants', participantId);
  const snap = await getDoc(ref);
  const current = snap.data() || {};

  if (current.pin) {
    if (current.pin !== pin) return alert('PIN incorreto.');
  } else {
    if (confirmPin.length !== 4) return alert('Confirme seu PIN no primeiro acesso.');
    if (pin !== confirmPin) return alert('Os PINs não conferem.');

    await setDoc(ref, {
      id: participantId,
      name: participant.name,
      order: PARTICIPANTS.findIndex((item) => item.id === participantId) + 1,
      active: true,
      pin,
    }, { merge: true });
  }

  localStorage.setItem('bolaoParticipantId', participantId);
  localStorage.setItem('bolaoParticipantName', participant.name);
  window.location.href = 'home.html';
});
