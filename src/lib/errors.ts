export class DataTooBigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataTooBigError';
  }
}
