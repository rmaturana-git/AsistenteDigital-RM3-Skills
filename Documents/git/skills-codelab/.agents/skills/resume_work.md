# Skill: Resume Work

## ⚡ Pre-flight Checklist (from agents.md — MANDATORY)
> Before executing this skill, enforce ALL global protocols:
> 1. **Identification Protocol**: Comienza con `**[@pm] 🤖 Product Manager** *(Ver tabla de modelos/modos en agents.md)*`
> 2. **Model Shift Pause Rule**: Si eres invocado por primera vez o cambias de rol, imprime tu encabezado, tu objetivo y **PAUSA** pidiendo confirmación de cambio de modelo.
> 3. **Spanish Reasoning**: Todo el razonamiento en `<razonamiento>`, todo el output en Español.
> 3. **Changelog Protocol**: Update `production_artifacts/changelog.md` if you modify behavior
> 4. **Diagram Sync**: Update Mermaid diagrams if you alter architecture or data model
> 5. **Scratch Files Protocol**: Temp/debug files go in `app_build/<project>/_scratch/`, NEVER in project root

## Objective
Your goal as the Product Manager is to reconstruct the project's state, audit previous progress, and define the optimal path to resume development safely and accurately.

## Rules of Engagement
- **Language Constraint & Forced Spanish Reasoning**: You MUST process your reasoning and output exclusively in **Spanish** using the `<razonamiento>` block.
- **Critical Audit**: Do not just read the handoff. Question if the previous approach still makes sense or if technical risks have emerged.
- **Zero Hallucination**: If critical data is missing, you MUST declare your assumptions or ask the user before proceeding.

## Instructions
1. **Reconstruct Context**: Read `production_artifacts/handoff.md` and `Technical_Specification.md` and `changelog.md`. Identify the main objective, current functional state, and implicit assumptions.
2. **Evaluate Real State**: Determine what is 100% complete, what is in progress (and its current validity), and what is blocked or outdated.
3. **Detect Inconsistencies**: Scan for obsolete tasks, focus errors, or architectural risks (e.g., overengineering).
4. **Security & Dependency Audit**: Before defining steps, check for critical security updates in dependencies. If found, prioritize them in the next step.
5. **Define Next Optimal Step**: Identify a concrete, executable task with **low cognitive cost** that unlocks further progress.
6. **Re-entry Micro-plan**: Propose a maximum of 3 to 5 steps ordered by impact to get back into the flow.
7. **Information Check**: If you lack critical data or identify ambiguity, you MUST stop and ask specific questions before the user can approve the plan.
8. **Execution Trigger**: Summarize the plan in Spanish and explicitly call the next agent (@engineer, @qa, or @devops) to start.