let counter = 0;

export function generateMac(): string {
  counter++;
  const hex = counter.toString(16).padStart(6, '0');
  return `AA:BB:CC:${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}`.toUpperCase();
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
