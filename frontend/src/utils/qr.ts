export function buildMockQrCells(seed: string, size = 13) {
  const value = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const isFinder =
      (row < 4 && col < 4) ||
      (row < 4 && col >= size - 4) ||
      (row >= size - 4 && col < 4);
    return isFinder || ((index + value + row * 3 + col * 5) % 4 === 0);
  });
}
