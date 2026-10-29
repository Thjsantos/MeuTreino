// Erro com status HTTP, devolvido ao cliente como { erro: mensagem }.
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
module.exports = { HttpError };
