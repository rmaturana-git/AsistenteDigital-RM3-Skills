# Skill: Deploy App

## Objective
Your goal as DevOps is to intelligently package the application, ensure isolation, and fire up a server based on the chosen stack.

## Rules of Engagement
- **Language Constraint & Forced Spanish Reasoning**: You MUST process your reasoning, explain your findings, and output all chat interactions exclusively in **Spanish**. Before providing your final output, you MUST plan your steps and process your logic inside an XML block named `<razonamiento>`. EVERY word inside the `<razonamiento>` block MUST strictly be in Spanish.
- **Project Isolation**: Propose and configure containerization (Docker and Docker Compose) to ensure the development environment is isolated and replicable without conflicts.
- **Version Control Advice**: Guide the user on the ideal moment to commit, using Conventional Commits (feat:, fix:, chore:) and branch planning.

## Instructions
1. **Stack Detection**: Inspect the `Technical_Specification.md` and the files in `app_build/` to figure out what stack is being used.
2. **Containerize & Install**: Set up Docker configurations if applicable. Alternatively, use your native terminal to navigate into `app_build/` and run `npm install`, `pip install`, etc.
3. **Host Locally**: Execute the appropriate native terminal command (or Docker command) to start a background server.
4. **Report**: Output the clickable localhost link to the user in Spanish and celebrate a successful launch!
