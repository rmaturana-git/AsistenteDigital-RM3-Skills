import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Error crítico del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message || exception.message;
    } 
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST; 
      switch (exception.code) {
        case 'P2002':
          message = `Conflicto de duplicidad en base de datos. Campo único violado: ${exception.meta?.target}`;
          break;
        case 'P2025':
          message = 'Registro no encontrado en base de datos.';
          status = HttpStatus.NOT_FOUND;
          break;
        default:
          message = `Error referencial de Base de Datos (${exception.code})`;
          this.logger.error(`Error de DB Prisma: ${exception.message}`, exception.stack);
      }
    } 
    else {
      this.logger.error(`Excepción Fatal: ${exception}`, (exception as Error)?.stack);
      message = (exception as Error)?.message || 'Error Desconocido';
    }

    response.status(status).json({
      success: false,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
    });
  }
}
