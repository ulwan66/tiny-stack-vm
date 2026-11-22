// tiny-stack-vm: a faithful interpreter of make.fun's tiny stack ISA (ISA.md in the kit).
// 32-bit wrapping ints, 256-value stack, 64-deep calls, 256 words of memory, ten traps
// with their own exit codes, a 1,000,000-step limit and a 65,536-byte output limit.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Opcode -> (pops << 2 | pushes) + 1; 0 means unknown opcode (trap 5).
const T = new Int8Array(256);
for (const o of [16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 29, 30, 32, 33, 34]) T[o] = 10;
T[0] = T[48] = T[51] = T[52] = 1;
T[1] = T[2] = T[82] = 2;
T[3] = T[49] = T[50] = T[80] = T[81] = T[83] = 5;
T[4] = 7; T[5] = 11; T[6] = 12; T[7] = 16;
T[23] = T[27] = T[64] = 6; T[65] = 9;

function run(p: Uint8Array, q: Uint8Array) {
  const n = p.length, D = new Int32Array(256);
  let s = 0;
  const C = new Int32Array(64);
  let c = 0;
  const M = new Int32Array(256), o = new Uint8Array(65536);
  let l = 0, i = 0, pc = 0, t = 0;
  const fin = (e: number) => ({ o: o.subarray(0, l), e });
  for (;;) {
    if (t === 1e6) return fin(10);
    if (pc < 0 || pc >= n) return fin(9);
    const op = p[pc], v = T[op];
    if (!v) return fin(5);
    const im = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op < 52 ? 2 : 0;
    if (pc + im >= n) return fin(9);
    t++;
    const nx = pc + 1 + im, po = (v - 1) >> 2, pu = (v - 1) & 3;
    if (s < po) return fin(2);
    if (s - po + pu > 256) return fin(3);
    pc = nx;
    switch (op) {
      case 0: return fin(0);
      case 1: D[s++] = (p[nx - 1] << 24) >> 24; break;
      case 2: D[s++] = p[nx - 4] | p[nx - 3] << 8 | p[nx - 2] << 16 | p[nx - 1] << 24; break;
      case 3: s--; break;
      case 4: D[s] = D[s - 1]; s++; break;
      case 5: { const x = D[s - 1]; D[s - 1] = D[s - 2]; D[s - 2] = x; break; }
      case 6: D[s] = D[s - 2]; s++; break;
      case 7: { const a = D[s - 3]; D[s - 3] = D[s - 2]; D[s - 2] = D[s - 1]; D[s - 1] = a; break; }
      case 23: D[s - 1] = -D[s - 1] | 0; break;
      case 27: D[s - 1] = ~D[s - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30:
      case 32: case 33: case 34: {
        const b = D[s - 1], a = D[s - 2];
        let r = 0;
        if (op === 16) r = a + b | 0;
        else if (op === 17) r = a - b | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) { if (!b) return fin(4); r = a / b | 0; }
        else if (op === 20) { if (!b) return fin(4); r = a % b | 0; }
        else if (op === 21) { if (!b) return fin(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (op === 22) { if (!b) return fin(4); r = (a >>> 0) % (b >>> 0) | 0; }
        else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << b;
        else if (op === 29) r = a >> b;
        else if (op === 30) r = a >>> b | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        s -= 2; D[s++] = r; break;
      }
      case 48: case 49: case 50: {
        const rel = (p[nx - 2] | p[nx - 1] << 8) << 16 >> 16;
        let tk = op === 48;
        if (op !== 48) { const x = D[--s]; tk = op === 49 ? x === 0 : x !== 0; }
        if (tk) pc = nx + rel;
        break;
      }
      case 51:
        if (c === 64) return fin(7);
        C[c++] = nx; pc = p[nx - 2] | p[nx - 1] << 8; break;
      case 52:
        if (!c) return fin(8);
        pc = C[--c]; break;
      case 64: {
        const a = D[s - 1];
        if (a < 0 || a > 255) return fin(6);
        D[s - 1] = M[a]; break;
      }
      case 65: {
        const a = D[s - 1], x = D[s - 2];
        if (a < 0 || a > 255) return fin(6);
        s -= 2; M[a] = x; break;
      }
      case 80: {
        const g = String(D[s - 1]);
        if (l + g.length > 65536) return fin(11);
        s--;
        for (let k = 0; k < g.length; k++) o[l++] = g.charCodeAt(k);
        break;
      }
      case 81:
        if (l + 1 > 65536) return fin(11);
        o[l++] = D[--s] & 255; break;
      case 82:
        D[s++] = i < q.length ? q[i++] : -1; break;
      case 83:
        return fin(D[--s] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.o);
  writeFileSync(join(O, id, 'exit.txt'), r.e + '\n');
}
