FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21 AS backend-builder
WORKDIR /workspace/backend

COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline

COPY backend/src ./src
COPY --from=frontend-builder /workspace/frontend/dist ./src/main/resources/static
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

COPY --from=backend-builder /workspace/backend/target/news-portal-0.0.1-SNAPSHOT.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
