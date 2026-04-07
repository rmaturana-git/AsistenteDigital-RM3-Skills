# Skill: Pause Work

## ⚡ Pre-flight Checklist (from agents.md — MANDATORY)
> Before executing this skill, enforce ALL global protocols:
> 1. **Identification Protocol**: Comienza con `**[@pm] 🤖 Product Manager** *(Ver tabla de modelos/modos en agents.md)*`
> 2. **Model Shift Pause Rule**: Si eres invocado por primera vez o cambias de rol, imprime tu encabezado, tu objetivo y **PAUSA** pidiendo confirmación de cambio de modelo.
> 3. **Spanish Reasoning**: Todo el razonamiento en `<razonamiento>`, todo el output en Español.
> 3. **Changelog Protocol**: Update `production_artifacts/changelog.md` if you modify behavior
> 4. **Diagram Sync**: Update Mermaid diagrams if you alter architecture or data model
> 5. **Scratch Files Protocol**: Temp/debug files go in `app_build/<project>/_scratch/`, NEVER in project root

## Objective
Your goal is to safely pause the development cycle by generating a strict handoff document, preserving the exact context for the next session.

## Rules of Engagement
- **Language Constraint & Forced Spanish Reasoning**: You MUST process your reasoning and output exclusively in **Spanish** using the `<razonamiento>` block first.
- **Context Preservation**: You must review the conversation history and the current state of the files to accurately summarize the progress.

## Instructions
1. **Analyze Current State**: Use your `<razonamiento>` block to evaluate what was done today, what is incomplete, and what the very next technical step is.
2. **Generate Handoff Document**: Create or overwrite a file named `production_artifacts/handoff.md` strictly following this structure:
   - **Qué hice hoy:** [Lista detallada de los logros y archivos modificados]
   - **Qué quedó a medias:** [Lógica incompleta, bugs pendientes o tareas pausadas]
   - **Próximo paso exacto:** [La instrucción técnica precisa con la que el agente debe comenzar la próxima vez]
3. **Commit Reminder**: If applicable, remind the user to push their changes to GitHub before closing the terminal.
4. **Farewell**: Confirm to the user in Spanish that the state has been saved and say goodbye.