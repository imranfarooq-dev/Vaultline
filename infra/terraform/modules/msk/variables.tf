variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "allowed_security_group_ids" {
  type = list(string)
}

variable "kafka_version" {
  type    = string
  default = "3.6.0"
}

variable "broker_count" {
  type    = number
  default = 2

  validation {
    condition     = var.broker_count >= 2 && var.broker_count <= 3
    error_message = "Use 2 brokers (dev) or 3 brokers (prod), one per subnet."
  }
}
