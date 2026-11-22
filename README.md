# tiny-stack-vm

A tiny stack VM for make.fun's tiny stack ISA — a faithful interpreter, correct on every hard rule in ISA.md: wrapping 32-bit MUL, `INT_MIN / -1` and `INT_MIN % -1`, unsigned DIV/MOD/LT, shift counts masked to 5 bits, PUSH8 sign extension, EXIT's low byte, all ten traps with their own exit codes, and the step and output limits.

[![bounty](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/ulwan66/tiny-stack-vm/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/ulwan66/tiny-stack-vm/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

## Run

`node main.ts` reads every program in a set under `/input/<id>/` (`program.bin` + `input.bin`) and writes `/output/<id>/stdout.bin` (the bytes the program wrote) and `/output/<id>/exit.txt` (its exit code).

## How it works

One dispatch loop over the bytecode, following the reference VM's order of checks: step limit, pc range, unknown opcode, cut-off immediate, step count, stack underflow, stack overflow — then the instruction's own traps and effect. Values live in `Int32Array`s (256-value data stack, 64-deep call stack, 256 words of memory), so every arithmetic result wraps exactly like the reference.

## License

MIT — see LICENSE.
