import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export class PdfParser {
  /**
   * Extrae texto crudo desde un archivo físico PDF cargado por Multer.
   */
  static async extractText(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    
    // Configuración para evitar información no deseada o extraer metadata si se quisiera
    const options = {
      pagerender: PdfParser.renderPage,
    };

    const data = await pdfParse(dataBuffer, options);
    return data.text;
  }

  // Renderizador personalizado opcional por si el texto viene sucio
  private static renderPage(pageData: any) {
    const renderOptions = { normalizeWhitespace: false, disableCombineTextItems: false };
    return pageData.getTextContent(renderOptions)
      .then(function(textContent: any) {
        let lastY, text = '';
        for (const item of textContent.items) {
          if (lastY == item.transform[5] || !lastY) {
            text += item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        return text;
      });
  }
}
