const ALPHABET = "ABCDEFGHIKLMNOPQRSTUVWXYZ";

export function alphabetToNum(alpha: string): number {
  if (alpha.length === 0) {
    return 0;
  }
  const lastChar = alpha[alpha.length - 1];
  const lastVal = ALPHABET.indexOf(lastChar) + 1;
  return (
    lastVal + alphabetToNum(alpha.slice(0, alpha.length - 1)) * ALPHABET.length
  );
}

export function numToAlphabet(num: number): string {
  if (num <= ALPHABET.length) {
    return ALPHABET[num - 1];
  }
  return (
    numToAlphabet(Math.floor((num - 1) / ALPHABET.length)) +
    ALPHABET[(num - 1) % ALPHABET.length]
  );
}

export function nextLetter(alpha: string): string {
  return numToAlphabet(alphabetToNum(alpha) + 1);
}
