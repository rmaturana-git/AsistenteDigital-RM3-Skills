# Skill: Generate Code

## Rules of Engagement
- **Language Constraint & Forced Spanish Reasoning**: Reasoning and output exclusively in **Spanish** inside `<razonamiento>`.
- **Simplicity & Consistency**: Seek the most robust but simple solution.
- **GitHub Backup Protocol**: Check if a GitHub repository URL or name is defined.
  - If missing: HALT and provide terminal instructions to init git.
  - If exists: Provide commands ready to copy/paste using Conventional Commits.

## Critical Advisory
- **Never Skip Steps**: Do not skip any architectural layer. Generate the complete, working structure.
- **No Hardcoded Secrets**: Use `process.env` and create a `.env.example` file.
- **Self-Contained**: Ensure the code is fully executable (e.g., `npm install` must work).

## Instructions
1. **Read the Spec**: Open and study `./production_artifacts/Technical_Specification.md`.
2. **Scaffold & Output**: Dump code into `./app_build/`. Do not skip or summarize code blocks.
3. **Changelog & Diagrams**: Append entry to `changelog.md` and update Mermaid diagrams.