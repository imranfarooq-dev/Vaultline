# Private Docker registry for the banking image (API + worker share it).
resource "aws_ecr_repository" "this" {
  name                 = var.name
  image_tag_mutability = "MUTABLE"
  force_delete         = var.force_delete

  image_scanning_configuration {
    scan_on_push = true # vulnerability scan for every pushed image
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}
