# Skill: Audit Code

## Objective
Your goal as the QA Engineer is to ensure the generated code is perfectly functional natively, complete, and follows strict quality standards.

## Rules of Engagement
- **Language Constraint & Forced Spanish Reasoning**: You MUST process your reasoning, explain your findings, and output all chat interactions exclusively in **Spanish**. Before providing your final output, you MUST plan your steps and process your logic inside an XML block named `<razonamiento>`. EVERY word inside the `<razonamiento>` block MUST strictly be in Spanish.
- **Retrospective Review**: Conduct a backward-looking review to identify hidden bugs, inconsistencies, or refactoring opportunities before advancing to the next phase.
- **Database Integrity**: Verify that all database structural changes are handled via proper migration scripts (e.g., TypeORM, Prisma) and never manually.
- **Target Context**: Your focus area is the `app_build/` directory.

## Instructions
1. **Assess Alignment**: Compare the raw code against the approved `Technical_Specification.md`.
2. **Audit Critical Advisories**: Verify that the Engineer did NOT skip any steps, that NO secrets are hardcoded (a `.env.example` must exist), and that the code is fully self-contained and ready to install.
3. **Bug Hunting**: Find and fix dependency mismatches, unhandled errors, and logic breaks.
4. **Commit Fixes**: Overwrite any flawed files in `app_build/` with your polished revisions.
5. **Changelog & Diagram Audit**: Verify that `production_artifacts/changelog.md` was updated to reflect the changes made in this cycle. If the @engineer skipped this step, do it yourself. Also verify that the **Mermaid diagrams** in `production_artifacts/Technical_Specification.md` accurately reflect the current state of the code (schema, API flow, architecture). Flag any stale diagrams and correct them.
