import * as xlsx from 'xlsx';

export class XlsxParser {
  /**
   * Extrae cada fila de una planilla Excel en su propio "Chunk" pre-fabricado.
   * Retorna un Array de strings, porque para las planillas Excel NO se aplica
   * el texto Recursivo. 1 Fila = 1 Chunk atómico.
   */
  static async extractRowsAsChunks(filePath: string): Promise<string[]> {
    const rowsAsChunks: string[] = [];
    const workbook = xlsx.readFile(filePath);

    // Iteramos sobre cada hoja de la planilla
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsa = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Header 1 lee array of arrays

      if (jsa.length === 0) continue;

      // Asumimos que la primera fila no vacía tiene los encabezados
      const headers = jsa[0] as string[];
      
      for (let i = 1; i < jsa.length; i++) {
        const row = jsa[i] as any[];
        // Si hay pura data vacía, saltamos
        if (!row || row.length === 0) continue;
        
        const rowProps = [];
        for (let j = 0; j < headers.length; j++) {
           if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
             rowProps.push(`${headers[j]}: ${row[j]}`);
           }
        }

        if (rowProps.length > 0) {
           rowsAsChunks.push(`[Hoja: ${sheetName}] Datos Registro: ${rowProps.join(', ')}`);
        }
      }
    }

    return rowsAsChunks;
  }
}
