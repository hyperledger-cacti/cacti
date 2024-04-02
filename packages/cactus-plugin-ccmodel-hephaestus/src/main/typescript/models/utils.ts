export function toSeconds(date: number): number {
  return Math.floor(date / 1000);
}

export function millisecondsLatency(date: Date): number {
  return new Date().getTime() - date.getTime();
}
