# Documentation

Working notes for the rewrite of the Code Compiler project.

| Doc | What's in it |
| --- | --- |
| [01-audit.md](01-audit.md) | Review of the original Node/JS codebase — what was broken and why |
| [02-architecture.md](02-architecture.md) | Target architecture, stack choices, and the reasoning behind each |
| [03-roadmap.md](03-roadmap.md) | Phased delivery plan with checklists |
| [04-deployment.md](04-deployment.md) | Hosting constraints and the deploy topology |

## The one-line summary

The original was a code-execution service with **no sandbox** — untrusted
submissions ran directly inside the API container as root. The rewrite treats
isolation as the product, not a detail.

## Guiding principle

Framework upgrades are the least valuable part of this rewrite. The sandbox is
the interesting engineering problem and should absorb the majority of the
effort. If the work stops early, a correct runner with no UI is worth more than
a polished UI over an unsafe runner.
