import * as mammoth from 'mammoth';

export class DocxParser {
  /**
   * Extrae texto plano a partir de un archivo DOCX respetando los saltos de párrafo original.
   */
  static async extractText(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    if (result.messages && result.messages.length > 0) {
      console.warn('Advertencias extrañas al parsear DOCX:', result.messages);
    }
    return result.value;
  }
}
