// One confirmation can complete at most once. Cancellation invalidates every timer.
function createAlmostPaySequence({ onPhase, onConfirmed, authorize = null, schedule = setTimeout, cancel = clearTimeout }) {
  let phase = 'idle';
  let timer = null;
  let disposed = false;
  const transition = (next) => { phase = next; onPhase(next); };
  const process = () => {
    if (disposed) return;
    transition('processing');
    timer = schedule(() => {
      if (disposed) return;
      transition('success');
      timer = schedule(() => {
        if (disposed) return;
        phase = 'complete';
        onConfirmed();
      }, 450);
    }, 600);
  };
  return {
    press() {
      if (disposed || ['authenticating', 'processing', 'success', 'complete'].includes(phase)) return;
      if (authorize) {
        transition('authenticating');
        Promise.resolve().then(authorize).then((accepted) => {
          if (disposed) return;
          if (accepted === true) process();
          else transition('idle');
        }).catch(() => { if (!disposed) transition('idle'); });
        return;
      }
      if (phase === 'idle') { transition('ready'); return; }
      process();
    },
    dispose() { disposed = true; if (timer != null) cancel(timer); },
  };
}
module.exports = { createAlmostPaySequence };
