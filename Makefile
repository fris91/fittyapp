COMPOSE=docker compose
REGISTRY?=fitty-cp-01:5000
IMAGE_TAG?=local
K8S_DIR=infra/k8s/local
SERVICES=api-gateway auth-service user-service health-data-service recommendation-service meal-service notification-service web-app

.PHONY: up down logs test clean

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

test:
	cd services/auth-service && ./mvnw test
	cd services/health-data-service && ./mvnw test
	cd services/recommendation-service && ./mvnw test
	cd services/notification-service && ./mvnw test

clean:
	$(COMPOSE) down -v --remove-orphans

.PHONY: k8s-up k8s-build-images k8s-push-images k8s-deploy k8s-deploy-keycloak k8s-port-forward-keycloak k8s-restart-apps k8s-status k8s-logs k8s-down

k8s-up:
	kubectl apply -f $(K8S_DIR)/namespaces/
	kubectl apply -f $(K8S_DIR)/storage/

k8s-build-images:
	docker build -t $(REGISTRY)/fitty/api-gateway:$(IMAGE_TAG) services/gateway-service
	docker build -t $(REGISTRY)/fitty/auth-service:$(IMAGE_TAG) services/auth-service
	docker build -t $(REGISTRY)/fitty/user-service:$(IMAGE_TAG) services/user-service
	docker build -t $(REGISTRY)/fitty/health-data-service:$(IMAGE_TAG) services/health-data-service
	docker build -t $(REGISTRY)/fitty/recommendation-service:$(IMAGE_TAG) services/recommendation-service
	docker build -t $(REGISTRY)/fitty/meal-service:$(IMAGE_TAG) services/meal-service
	docker build -t $(REGISTRY)/fitty/notification-service:$(IMAGE_TAG) services/notification-service
	docker build -t $(REGISTRY)/fitty/web-app:$(IMAGE_TAG) frontend-web

k8s-push-images:
	docker push $(REGISTRY)/fitty/api-gateway:$(IMAGE_TAG)
	docker push $(REGISTRY)/fitty/auth-service:$(IMAGE_TAG)
	docker push $(REGISTRY)/fitty/user-service:$(IMAGE_TAG)
	docker push $(REGISTRY)/fitty/health-data-service:$(IMAGE_TAG)
	docker push $(REGISTRY)/fitty/recommendation-service:$(IMAGE_TAG)
	docker push $(REGISTRY)/fitty/meal-service:$(IMAGE_TAG)
	docker push $(REGISTRY)/fitty/notification-service:$(IMAGE_TAG)
	docker push $(REGISTRY)/fitty/web-app:$(IMAGE_TAG)

k8s-deploy:
	kubectl apply -f $(K8S_DIR)/namespaces/
	kubectl apply -f $(K8S_DIR)/storage/
	kubectl apply -f $(K8S_DIR)/configmaps/
	kubectl apply -f $(K8S_DIR)/secrets/
	kubectl apply -f $(K8S_DIR)/keycloak/
	kubectl apply -f $(K8S_DIR)/postgres/
	kubectl apply -f $(K8S_DIR)/mongo/
	kubectl apply -f $(K8S_DIR)/kafka/
	kubectl apply -f $(K8S_DIR)/api-gateway/
	kubectl apply -f $(K8S_DIR)/auth-service/
	kubectl apply -f $(K8S_DIR)/user-service/
	kubectl apply -f $(K8S_DIR)/health-data-service/
	kubectl apply -f $(K8S_DIR)/recommendation-service/
	kubectl apply -f $(K8S_DIR)/nutrition-service/
	kubectl apply -f $(K8S_DIR)/notification-service/
	kubectl apply -f $(K8S_DIR)/web-app/

k8s-deploy-keycloak:
	kubectl apply -f $(K8S_DIR)/namespaces/
	kubectl apply -f $(K8S_DIR)/keycloak/

k8s-port-forward-keycloak:
	kubectl port-forward -n fitty-system svc/keycloak 30081:8080

k8s-restart-apps:
	kubectl rollout restart deployment -n fitty-app api-gateway
	kubectl rollout restart deployment -n fitty-app auth-service
	kubectl rollout restart deployment -n fitty-app user-service
	kubectl rollout restart deployment -n fitty-app health-data-service
	kubectl rollout restart deployment -n fitty-app recommendation-service
	kubectl rollout restart deployment -n fitty-app nutrition-service
	kubectl rollout restart deployment -n fitty-app notification-service
	kubectl rollout restart deployment -n fitty-app web-app

k8s-status:
	kubectl get nodes -o wide
	kubectl get pods -A
	kubectl get svc -A

k8s-logs:
	kubectl logs -n fitty-app deploy/api-gateway --tail=200

k8s-down:
	kubectl delete -f $(K8S_DIR)/web-app/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/notification-service/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/nutrition-service/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/recommendation-service/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/health-data-service/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/user-service/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/auth-service/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/api-gateway/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/kafka/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/mongo/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/postgres/ --ignore-not-found
	kubectl delete -f $(K8S_DIR)/keycloak/ --ignore-not-found
