# Managed PostgreSQL 16. RDS supports the pgvector extension ("vector"),
# so the same migration that runs locally enables vector search here.
resource "random_password" "master" {
  length  = 32
  special = true
  # RDS forbids / @ " and spaces in master passwords.
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}
