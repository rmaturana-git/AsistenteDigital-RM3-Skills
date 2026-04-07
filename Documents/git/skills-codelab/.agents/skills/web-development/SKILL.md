---
name: Web Development Protocol
description: Strict guidelines for developing and validating Frontend Web Components, isolated UI elements, and bindings. Applies only to browser-based, HTML/JS/Framework development.
---

# Web Development QA and Execution Protocol

## ⚡ Pre-flight Checklist (from agents.md — MANDATORY)
> Before executing this skill, enforce ALL global protocols:
> 1. **Identification Protocol**: Inicia cada respuesta identificando tu rol y validando tu modelo sugerido.
> 2. **Model Shift Pause Rule**: Si iniciaste un nuevo rol, **PAUSA** antes de ejecutar y pide validación del modelo.
> 3. **Changelog Protocol**: Update `production_artifacts/changelog.md` if you introduce or fix a web feature.
> 4. **Diagram Sync**: Update Mermaid diagrams if you alter user interfaces or flow structure.
> 5. **Scratch Files Protocol**: Temporary local testing files MUST go in `app_build/<project>/_scratch/`.


When developing Frontend elements meant for embedding (Custom Elements, Angular Elements, or React Widgets), the **@engineer** and **@qa** MUST adhere strictly to the following procedures to avoid masking DOM or data-binding failures.

## 1. Zero Hardcoded Fallbacks Rule
You MUST ruthlessly audit frontend code to ensure we NEVER use default valid fallback keys (like `test_key_...` or valid mocked UUIDs) that could mask databinding or DOM read failures. 
- If an input binding fails, the UI MUST clearly crash, log an explicit console error, or visually indicate that a parameter is missing.
- **Why**: Fallbacks in local development environments trick the compiler and developer into believing the data bridge from the Host HTML to the Component is working, which is catastrophic when deployed to a real B2B client.

## 2. E2E WebComponent Testing Protocol
1. **Never Trust Live-Reload Exclusively**: You must periodically verify that standard inputs (e.g. `<chatbot-widget api-key="x">`) correctly bind to the host's DOM in a clean HTML context *without* the Live-Reload server interfering (Dev Servers often cache `index.html` static wrappers).
2. **True DOM Verification**: Ensure we test the final bundled WebComponent in a raw `index.html` file to guarantee the bundle doesn't silently ignore dynamic parameters due to missing polyfills (like Zone.js in Angular).

## 3. Pre-flight Checklist for Frontend Tasks
Before declaring any Web Widget task done:
- [ ] Variables depend on Host inputs, not static fallbacks.
- [ ] Error messages for missing attributes are visible and descriptive.
- [ ] Manual refresh (`F5` or hard compile) proves the property reading is robust.
