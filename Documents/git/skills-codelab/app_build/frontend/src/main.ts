import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// Punto de entrada para producción como Web Component embebible.
// Se usa createApplication (no bootstrapApplication) para obtener un ApplicationRef
// sin montar nada en el DOM aún. Luego se registra el Custom Element globalmente.
createApplication(appConfig)
  .then(appRef => {
    const ChatbotElement = createCustomElement(App, { injector: appRef.injector });
    customElements.define('chatbot-widget', ChatbotElement);
  })
  .catch(err => console.error('[RM3] Error al registrar el Web Component:', err));
