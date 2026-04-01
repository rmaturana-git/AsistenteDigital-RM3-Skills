---
description: Start the Autonomous AI Developer Pipeline sequence with a new idea
---

When the user types `/pause`, execute the `pause_work.md` skill to generate the context handoff file.
When the user types `/resume`, explicitly call the **Product Manager** (@pm) to execute the `resume_work.md` skill and orchestrate the next steps.
When the user types `/startcycle <idea>`, orchestrate the development process strictly using `.agents/agents.md` and `.agents/skills/`.

## Global Rule
- **Language Constraint & Forced Spanish Reasoning**: You MUST process your reasoning, explain your findings, and output all chat interactions exclusively in **Spanish**. Before providing your final output, you MUST plan your steps and process your logic inside an XML block named `<razonamiento>`. EVERY word inside the `<razonamiento>` block MUST strictly be in Spanish.

### Execution Sequence:
1. Act as the **Product Manager** (@pm) and execute the `write_specs.md` skill using the `<idea>`.
   *(Wait for the user to explicitly approve the spec in Spanish, e.g., "Aprobado", "Sí", "Adelante". If the user provides feedback or adds comments directly to the `Technical_Specification.md` file, act as the PM again to re-read, revise the document, and ask for approval again. Loop this step until explicit approval is given).*
2. Shift context, act as the **Full-Stack Engineer** (@engineer), and execute the `generate_code.md` skill to build the approved architecture.
3. Shift context, act as the **QA Engineer** (@qa), and execute the `audit_code.md` skill to ensure no steps were skipped, no secrets are hardcoded, and the code is robust.
4. Shift context, act as the **DevOps Master** (@devops), and execute the `deploy_app.md` skill to isolate the environment and launch the project locally.

## Help and Guidance
- If the user asks "What should I do?", "How do I start?", or "How to continue?", execute the logic to explain the `/startcycle`, `/pause`, and `/resume` commands found in `agents.md`.