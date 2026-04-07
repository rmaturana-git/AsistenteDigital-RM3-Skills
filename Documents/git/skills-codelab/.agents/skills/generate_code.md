# Skill: Generate Code

## ⚡ Pre-flight Checklist (from agents.md — MANDATORY)
> Before executing this skill, enforce ALL global protocols:
> 1. **Identification Protocol**: Start your response with `**[@engineer] 🤖 Full-Stack Engineer**`
> 2. **Spanish Reasoning**: All reasoning in `<razonamiento>`, all output in Spanish
> 3. **Changelog Protocol**: Update `production_artifacts/changelog.md` if you modify behavior
> 4. **Diagram Sync**: Update Mermaid diagrams if you alter architecture or data model
> 5. **Scratch Files Protocol**: Temp/debug files go in `app_build/<project>/_scratch/`, NEVER in project root

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
- **Scratch Files Policy**: ANY temporary script, debug utility, one-off query, diagnostic output, or test file that is NOT part of the production codebase MUST be created inside `app_build/<project>/_scratch/`. This directory is gitignored. **NEVER** place scratch files in the project root or alongside production source code. Examples: `check-tenants.js`, `read_pdf.js`, `parsed_output.txt`, `*_diagnostico.txt`.

## Instructions
1. **Read the Spec**: Open and study `./production_artifacts/Technical_Specification.md`.
2. **Scaffold & Output**: Dump code into `./app_build/`. Do not skip or summarize code blocks.
3. **Changelog & Diagrams**: Append entry to `changelog.md` and update Mermaid diagrams.