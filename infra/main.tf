terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "drone-visualization"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# API Gateway account-level CloudWatch logs role
resource "aws_iam_role" "apigw_cloudwatch" {
  name = "${var.project_name}-apigw-cw-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = { Service = "apigateway.amazonaws.com" }
        Action   = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apigw_cw_attach" {
  role       = aws_iam_role.apigw_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.apigw_cloudwatch.arn
  depends_on          = [aws_iam_role_policy_attachment.apigw_cw_attach]
}

# Lambda execution role
resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# X-Ray permissions for tracing
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# Lambda function package (TypeScript build)
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/dist"
  output_path = "${path.module}/.terraform/lambda.zip"
  
  depends_on = [null_resource.lambda_build]
}

# Build TypeScript Lambda
resource "null_resource" "lambda_build" {
  triggers = {
    source_hash = filemd5("${path.module}/lambda/src/index.ts")
  }

  provisioner "local-exec" {
    command     = "npm install && npm run build"
    working_dir = "${path.module}/lambda"
  }
}

resource "aws_lambda_function" "rf_data" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-rf-data"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV     = var.environment
      CORS_ORIGINS = var.cors_allow_origins
    }
  }

  tracing_config {
    mode = "Active"
  }

  reserved_concurrent_executions = 10

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.rf_data.function_name}"
  retention_in_days = 30

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api"
  description = "RF Data API for drone visualization"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "rf_data" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "rf-data"
}

# CORS OPTIONS method
resource "aws_api_gateway_method" "rf_data_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.rf_data.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "rf_data_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.rf_data.id
  http_method = aws_api_gateway_method.rf_data_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "rf_data_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.rf_data.id
  http_method = aws_api_gateway_method.rf_data_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "rf_data_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.rf_data.id
  http_method = aws_api_gateway_method.rf_data_options.http_method
  status_code = aws_api_gateway_method_response.rf_data_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    # For preflight, respond with wildcard to avoid invalid multi-origin header
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# GET method
resource "aws_api_gateway_method" "rf_data_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.rf_data.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "rf_data_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.rf_data.id
  http_method             = aws_api_gateway_method.rf_data_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.rf_data.invoke_arn
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rf_data.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.rf_data.id,
      aws_api_gateway_method.rf_data_get.id,
      aws_api_gateway_integration.rf_data_get.id,
      aws_api_gateway_method.rf_data_options.id,
      aws_api_gateway_integration.rf_data_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.rf_data_get,
    aws_api_gateway_integration.rf_data_options
  ]
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  depends_on = [aws_cloudwatch_log_group.api_gateway_logs]
}

resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.project_name}"
  retention_in_days = 30

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# WAF WebACL
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf"
    sampled_requests_enabled   = true
  }
}

# Associate WAF with API Gateway
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_api_gateway_stage.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
