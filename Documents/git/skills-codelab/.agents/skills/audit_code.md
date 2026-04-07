# Skill: Audit Code

## ⚡ Pre-flight Checklist (from agents.md — MANDATORY)
> Before executing this skill, enforce ALL global protocols:
> 1. **Identification Protocol**: Start your response with `**[@qa] 🤖 QA Engineer**`
> 2. **Spanish Reasoning**: All reasoning in `<razonamiento>`, all output in Spanish
> 3. **Changelog Protocol**: Update `production_artifacts/changelog.md` if you modify behavior
> 4. **Diagram Sync**: Update Mermaid diagrams if you alter architecture or data model
> 5. **Scratch Files Protocol**: Temp/debug files go in `app_build/<project>/_scratch/`, NEVER in project root

## Rules of Engagement
- **Retrospective Review**: Identify hidden bugs and refactoring opportunities.
- **Database Integrity**: Verify migrations (Prisma/TypeORM).

## Instructions
1. **Assess Alignment**: Compare code vs `Technical_Specification.md`.
2. **Audit Critical Advisories**: Ensure no secrets are hardcoded and `.env.example` exists.
3. **Bug Hunting**: Fix dependency mismatches and logic breaks. Overwrite files in `./app_build/`.
4. **Scratch File Sweep**: Scan for any temporary/debug/diagnostic files placed outside `_scratch/` (e.g., `check-*.js`, `read_*.js`, `parsed_*.txt`, `*_diagnostico.txt`). **Move them to `app_build/<project>/_scratch/`** or delete them if obsolete.
5. **Changelog & Diagram Audit**: Verify or perform updates to `changelog.md` and Mermaid diagrams.