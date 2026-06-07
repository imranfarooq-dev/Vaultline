# Smallest setup that still shows every moving part.
environment            = "dev"
region                 = "eu-west-1"
general_instance_types = ["t3.large"]
general_min_size       = 2
use_spot               = true # cheaper, can be interrupted: fine for dev
ai_instance_type       = "m6i.xlarge"
rds_instance_class     = "db.t4g.micro"
msk_broker_count       = 2
msk_instance_type      = "kafka.t3.small"
