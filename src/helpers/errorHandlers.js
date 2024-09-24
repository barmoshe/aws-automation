export class AwsCliError extends Error {
  constructor(message, stderr) {
    super(message);
    this.name = "AwsCliError";
    this.stderr = stderr;
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}
