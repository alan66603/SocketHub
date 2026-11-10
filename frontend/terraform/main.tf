provider "aws" {
  region = "ap-southeast-2"
}

resource "random_id" "cdn_id" {
  byte_length = 4
}

# build S3 bucket
resource "aws_s3_bucket" "web_bucket" {
  bucket = "sockethub-frontend-${random_id.cdn_id.hex}"
}

# Build CloudFront Origin Access Control (OAC)
# Make sure this S3 will not be visited publicly, only via CloudFront
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "cdn_oac_policy" {
  bucket = aws_s3_bucket.web_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "s3:GetObject"
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.web_bucket.arn}/*"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            # Security check
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}
# Backend API runs on Lambda (created in backend/terraform/lambda.tf)
data "aws_lambda_function_url" "backend_api" {
  function_name = "sockethub-api"
}

locals {
  # "https://xxxx.lambda-url.ap-southeast-2.on.aws/" -> "xxxx.lambda-url.ap-southeast-2.on.aws"
  backend_api_domain = trimsuffix(trimprefix(data.aws_lambda_function_url.backend_api.function_url, "https://"), "/")
}

# Build CloudFront Distribution (CDN)
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name              = aws_s3_bucket.web_bucket.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  enabled             = true
  default_root_object = "index.html"

  # Let Single Page Application (React) manage the routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # --- Lambda backend source (Function URL) ---
  origin {
    domain_name = local.backend_api_domain
    origin_id   = "Lambda-Backend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # --- Add routing policy：if it's /api/* then direct to Lambda ---
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "Lambda-Backend"

    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Output CloudFront URL for future deployment
output "cloudfront_url" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.web_bucket.id
}