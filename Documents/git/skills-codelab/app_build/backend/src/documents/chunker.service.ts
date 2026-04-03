import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChunkerService {
  private readonly logger = new Logger(ChunkerService.name);
  
  // Parámetros basados en el MVP (Miden Caracteres, NO tokens). 
  // 1 token = ~4 caracteres promedio en Español.
  // 800 Tokens solicitados = 3200 Caracteres
  private readonly CHUNK_SIZE = 3200;
  private readonly CHUNK_OVERLAP = 800;

  /**
   * Implementación de Text Splitting Recursivo nativo en TypeScript.
   * Corta primero por dobles saltos de línea (párrafos), luego por punto seguido, 
   * luego por espacios, intentando no exceder el CHUNK_SIZE.
   */
  splitText(text: string): string[] {
    this.logger.debug(`Iniciando Text Splitting (Size: ${this.CHUNK_SIZE}, Overlap: ${this.CHUNK_OVERLAP})`);
    
    // Si es muy pequeño, retorna inmediatamente
    if (text.length <= this.CHUNK_SIZE) {
       return [text];
    }

    const separators = ['\n\n', '\n', '. ', ' '];
    return this.splitRecursively(text, separators);
  }

  private splitRecursively(text: string, separators: string[]): string[] {
    const finalChunks: string[] = [];
    let currentSeparator = '';
    
    // Buscar el primer separador que realmente divida el texto
    for (const sep of separators) {
      if (text.includes(sep)) {
        currentSeparator = sep;
        break;
      }
    }

    // Partir el texto usando el separador encontrado
    const splits = text.split(currentSeparator);
    let currentChunk = '';

    for (let i = 0; i < splits.length; i++) {
      const piece = splits[i];
      const newLen = currentChunk.length + piece.length + currentSeparator.length;
      
      if (newLen > this.CHUNK_SIZE) {
        if (currentChunk.trim()) {
           finalChunks.push(currentChunk.trim());
        }
        
        // Calcular overlap (tomar el final del chunk anterior)
        const overlapLen = Math.floor(this.CHUNK_OVERLAP);
        if (currentChunk.length > overlapLen) {
           currentChunk = currentChunk.substring(currentChunk.length - overlapLen) + currentSeparator + piece;
        } else {
           currentChunk = piece;
        }
      } else {
        currentChunk += (currentChunk ? currentSeparator : '') + piece;
      }
    }

    if (currentChunk.trim()) {
      finalChunks.push(currentChunk.trim());
    }

    return finalChunks;
  }
}
