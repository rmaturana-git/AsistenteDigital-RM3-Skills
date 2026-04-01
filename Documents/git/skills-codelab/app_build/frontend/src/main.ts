import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// Para el entorno de desarrollo local y pre-visualización visual, empleamos el bootloader 
// normal de Angular. Posteriormente para producción lo compactaremos con createCustomElement.
bootstrapApplication(App, appConfig).catch(err => console.error('Error de Arranque Angular:', err));
