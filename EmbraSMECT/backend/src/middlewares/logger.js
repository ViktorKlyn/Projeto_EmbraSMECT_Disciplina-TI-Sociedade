// Middleware simples para acompanhar as requisições durante o desenvolvimento.
export function logger(req, res, next) {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
}
