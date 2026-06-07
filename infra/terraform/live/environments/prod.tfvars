# Production-shaped: Multi-AZ RDS, 3 Kafka brokers, NAT per AZ, deletion protection.
environment            = "prod"
region                 = "eu-west-1"
eks_api_allowed_cidrs  = ["203.0.113.0/24"] # replace with your office / VPN range
general_instance_types = ["m6i.large"]
general_min_size       = 3
general_max_size       = 8
use_spot               = false
ai_instance_type       = "g5.xlarge"
ai_ami_type            = "AL2023_x86_64_NVIDIA"
rds_instance_class     = "db.m7g.large"
msk_broker_count       = 3
msk_instance_type      = "kafka.m7g.large"
