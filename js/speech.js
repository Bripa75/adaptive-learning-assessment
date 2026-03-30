// js/speech.js — Web Speech API (read aloud, free, no third party)
let utterance = null;
let speaking  = false;

export function speak(text, onEnd) {
  if (!window.speechSynthesis) return;
  stop();
  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate  = 0.9;
  utterance.pitch = 1;
  utterance.lang  = 'en-US';
  utterance.onend = () => { speaking = false; onEnd?.(); };
  speaking = true;
  speechSynthesis.speak(utterance);
}

export function stop() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  speaking  = false;
  utterance = null;
}

export function isSpeaking() { return speaking; }

// Toggle a listen button
export function toggleListen(btn, text, onStart, onStop) {
  if (isSpeaking()) {
    stop();
    btn.classList.remove('on');
    btn.innerHTML = listenIcon() + 'Listen';
    onStop?.();
  } else {
    btn.classList.add('on');
    btn.innerHTML = stopIcon() + 'Stop';
    onStart?.();
    speak(text, () => {
      btn.classList.remove('on');
      btn.innerHTML = listenIcon() + 'Listen';
      onStop?.();
    });
  }
}

const listenIcon = () => `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const stopIcon   = () => `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
