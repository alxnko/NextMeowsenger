import { generateSecureRandomString } from '../lib/utils.ts';

function benchmark(length, iterations) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    generateSecureRandomString(length);
  }
  const end = performance.now();
  return end - start;
}

const lengths = [10, 100, 1000];
const iterations = 100000;

console.log(`Running benchmark with ${iterations} iterations...`);

for (const length of lengths) {
  // Warmup
  benchmark(length, 10000);

  const time = benchmark(length, iterations);
  console.log(`Length ${length}: ${time.toFixed(4)}ms (avg ${(time / iterations).toFixed(6)}ms per call)`);
}
