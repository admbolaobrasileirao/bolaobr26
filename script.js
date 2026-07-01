const tabs = document.querySelectorAll('.tab');
const participantPanel = document.querySelector('#participant-panel');
const adminPanel = document.querySelector('#admin-panel');

tabs.forEach((tab) => tab.addEventListener('click', () => {
  const participant = tab.id === 'participant-tab';
  tabs.forEach((item) => { item.classList.toggle('is-active', item === tab); item.setAttribute('aria-selected', item === tab); });
  participantPanel.classList.toggle('is-hidden', !participant);
  adminPanel.classList.toggle('is-hidden', participant);
}));

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
      [...digits].forEach((digit, digitIndex) => { if (inputs[digitIndex]) inputs[digitIndex].value = digit; });
      inputs[Math.min(digits.length, 4) - 1].focus();
    });
  });
});
