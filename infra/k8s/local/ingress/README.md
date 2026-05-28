# Ingress

The first local setup uses NodePort:

- Web app: `http://fitty-cp-01:30000`
- API Gateway: `http://fitty-cp-01:30080`
- Kafka UI: `http://fitty-cp-01:30090`

Add NGINX Ingress Controller later if you want hostnames such as `fitty.local` and TLS certificates.
