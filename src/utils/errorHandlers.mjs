import { AwsCliError, ValidationError } from './awsHelpers.mjs';

export function handleError(error) {
  if (error instanceof AwsCliError) {
    console.error(`\n${error.name}: ${error.message}`);
    if (error.stderr) {
      console.error(`Details: ${error.stderr}`);
    }
    suggestResolution(error.stderr);
  } else if (error instanceof ValidationError) {
    console.error(`\n${error.name}: ${error.message}`);
  } else {
    console.error(`\nAn unexpected error occurred: ${error.message}`);
  }
}

function suggestResolution(stderr) {
  if (!stderr) return;

  if (
    stderr.includes("AuthFailure") ||
    stderr.includes("UnauthorizedOperation")
  ) {
    console.error("\nSuggestion: Check your AWS credentials and permissions.");
  } else if (stderr.includes("InvalidParameterValue")) {
    console.error("\nSuggestion: Verify the parameters and try again.");
  } else if (stderr.includes("RequestLimitExceeded")) {
    console.error(
      "\nSuggestion: You have exceeded AWS API request limits. Try again later."
    );
  } else if (stderr.includes("OptInRequired")) {
    console.error(
      "\nSuggestion: The AWS service may not be available in your region or account. Ensure you have opted in to the service."
    );
  } else {
    console.error(
      "\nSuggestion: Review the error details and consult AWS documentation or support."
    );
  }
}
