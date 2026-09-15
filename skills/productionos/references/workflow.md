# ProductionOS workflow

Use this compact sequence:

```text
status -> inspect -> context -> explain -> change -> verify -> evidence -> gate
```

Run `inspect` again after a meaningful architecture or dependency change. Use `status --json` as the recovery surface after context compression. Read `requirements.json` and `reports/findings.json` selectively; do not paste every policy into an agent context.
