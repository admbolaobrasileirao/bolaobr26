// Em produção, o Admin definirá esta data ao configurar o fechamento da rodada.
const closingDate = new Date('2026-06-24T15:59:00-03:00');
const deadlineDate = document.querySelector('#deadline-date');
deadlineDate.textContent = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(closingDate).replace(',', ',');

function updateCountdown() {
  const totalSeconds = Math.max(0, Math.floor((closingDate - new Date()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  document.querySelector('#days').textContent = String(days).padStart(2, '0');
  document.querySelector('#hours').textContent = String(hours).padStart(2, '0');
  document.querySelector('#minutes').textContent = String(minutes).padStart(2, '0');
  document.querySelector('#seconds').textContent = String(seconds).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 1000);
