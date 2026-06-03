# CRM in a folder, powered by Claude Code

A small, fork-friendly CRM that lives in a git repo. Three tab-separated tables (companies, contacts, calls), a local web app to view and edit them, and two markdown files where you write your own business rules.

## What you get

- **3 TSVs** with a generic schema you can extend.
- **A Vite + React app** to view, filter, sort, edit your pipeline.
- **2 brain files** (`docs/icp.md`, `docs/crm-rules.md`) that Claude Code reads.
- **No data of your own** to leak (you start from empty templates).

## Quick start

```bash
cd crm-app
npm install
npm run dev
```

Open http://localhost:5174.

## Make it yours

1. Open the folder in Claude Code.
2. Rewrite `docs/icp.md` to describe your scoring model.
3. Rewrite `docs/crm-rules.md` to describe your schema and rules.
4. Add columns as you need them — ask Claude to extend the schema.

See the full setup guide for details.

## License

MIT
