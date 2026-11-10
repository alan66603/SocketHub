# --- Serverless backend: AWS Lambda + Function URL ---
# Code updates are deployed by GitHub Actions (aws lambda update-function-code);
# Terraform owns the function's configuration only.

variable "mongo_uri" {
  type      = string
  sensitive = true
}

variable "google_maps_api_key" {
  type      = string
  sensitive = true
}

variable "gemini_api_key" {
  type      = string
  sensitive = true
}

variable "allowed_origins" {
  type    = string
  default = ""
}

resource "aws_iam_role" "lambda_role" {
  name = "sockethub-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/sockethub-api"
  retention_in_days = 14
}

resource "aws_lambda_function" "api" {
  function_name = "sockethub-api"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs22.x"
  handler       = "lambda.handler"
  architectures = ["arm64"]
  memory_size   = 512
  timeout       = 29 # CloudFront's default origin read timeout is 30s

  # Initial package; build it first with backend/scripts/package-lambda.sh
  filename = "${path.module}/../lambda.zip"

  environment {
    variables = {
      MONGO_URI           = var.mongo_uri
      GOOGLE_MAPS_API_KEY = var.google_maps_api_key
      GEMINI_API_KEY      = var.gemini_api_key
      ALLOWED_ORIGINS     = var.allowed_origins
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [aws_cloudwatch_log_group.lambda_logs]
}

resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
}

# Public Function URLs need both permissions (AWS change, Oct 2025).
resource "aws_lambda_permission" "public_url" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "public_invoke" {
  statement_id             = "FunctionURLAllowInvokeAction"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.api.function_name
  principal                = "*"
  invoked_via_function_url = true
}

output "lambda_function_url" {
  value = aws_lambda_function_url.api.function_url
}
