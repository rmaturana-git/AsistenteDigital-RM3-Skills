# Skill: Audit Code.

## Rules of Engagement
- **Retrospective Review**: Identify hidden bugs and refactoring opportunities.
- **Database Integrity**: Verify migrations (Prisma/TypeORM).

## Instructions
1. **Assess Alignment**: Compare code vs `Technical_Specification.md`.
2. **Audit Critical Advisories**: Ensure no secrets are hardcoded and `.env.example` exists.
3. **Bug Hunting**: Fix dependency mismatches and logic breaks. Overwrite files in `./app_build/`.
4. **Changelog & Diagram Audit**: Verify or perform updates to `changelog.md` and Mermaid diagrams.