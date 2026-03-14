/**
 * Fires a confetti burst using CSS-only animation (no external dependency).
 * Creates 80 confetti pieces that animate and auto-clean themselves.
 */
export function fireConfetti() {
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(container);

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const x = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const size = Math.random() * 8 + 4;
    const rotation = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 200;
    
    piece.style.cssText = `
      position:absolute;
      top:-10px;
      left:${x}%;
      width:${size}px;
      height:${size * 0.6}px;
      background:${color};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      opacity:1;
      transform:rotate(${rotation}deg);
      animation:confetti-fall ${1.5 + Math.random()}s ease-out ${delay}s forwards;
    `;
    container.appendChild(piece);
  }

  // Add keyframes if not already present
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg) translateX(var(--drift, 0px)); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Clean up after animation
  setTimeout(() => container.remove(), 3000);
}
