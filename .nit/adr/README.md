# Architecture Decision Records

One directory holds both halves of the decision record:

- `NNNN-title.md` — the numbered records themselves, in MADR format.
- `index.json` — every ADR *candidate* the pipeline's steps raised, with the task that raised it and,
  once someone writes the record, the path it became. Built by `nit adr-index`, validated against
  `adr-index.schema.json`.

## Why one directory (TASK-039, AC-3)

`nit:init` used to create a second directory, `.nit/decisions/`, alongside this one. Nothing ever
wrote to it — no skill, no command, no schema referenced it — so it was an empty invitation to split
the same concept across two places, which is the ambiguity ADR-0006 removed for skills. The index is
about the records; it lives with them.

## Promotion is a human decision

`nit adr-index` reports what was raised and records what was promoted. It never writes a numbered
record. A step skill may not write into this directory either — a specialist proposes, a person
decides, and the index only remembers that they did.

```
nit adr-index                     # rebuild from the phase tree
nit adr-index --outstanding       # what still needs a decision
nit adr-index --promote TASK-039/shared-cache --to .nit/adr/0008-shared-cache.md
```
