/**
 * Valida partes da requisição com schemas Zod e substitui os valores pelos dados
 * já convertidos (ex.: strings de query viram números). Erros caem no errorHandler.
 * @param {{ body?: import('zod').ZodType, params?: import('zod').ZodType, query?: import('zod').ZodType }} schemas
 * @returns {import('express').RequestHandler}
 */
export function validate(schemas) {
  return (req, _res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    // No Express 5 req.query é somente leitura; guardamos o resultado em req.validatedQuery.
    if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
    next();
  };
}
