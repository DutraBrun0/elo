// Carregado pelo Jest antes de cada arquivo de teste: aponta para o banco de teste.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET ??= 'segredo-de-teste-com-mais-de-32-caracteres!!';
process.env.JWT_EXPIRES_IN ??= '1h';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
