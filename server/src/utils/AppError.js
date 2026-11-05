/**
 * Erro de domínio com status HTTP. Qualquer erro que não seja um AppError
 * é tratado como falha inesperada (500) pelo errorHandler.
 */
export class AppError extends Error {
  /**
   * @param {string} message Mensagem segura para exibir ao cliente.
   * @param {number} [statusCode=400]
   * @param {string} [code] Código estável para o front-end tratar (ex.: "EMAIL_TAKEN").
   * @param {unknown} [details]
   */
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static unauthorized(message = 'Não autenticado') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Acesso negado') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Recurso não encontrado') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }
}
