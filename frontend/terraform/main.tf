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