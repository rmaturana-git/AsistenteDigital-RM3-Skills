import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export class PdfParser {
  /**
   * Extrae texto crudo desde un archivo físico PDF cargado por Multer.
   */
  static async extractText(filePath: string): Promise<string> {
    const loader = new PDFLoader(filePath, { splitPages: false });
    const docs = await loader.load();
    return docs.map(d => d.pageContent).join('\n');
  }
}
