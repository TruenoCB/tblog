# Halo 2 Blog System Project

This is a personalized Halo 2 blog system, customized for secondary development and multi-language support (English priority). 

## Project Structure

* `backend/` - The core source code of Halo 2. You can develop your custom backend features here.
* `frontend/` - Reserved for custom frontend applications or a detached management console.
* `theme/` - Contains theme files. The `halo-theme-chirpy` theme is currently placed here. You can modify its components and UI.
* `plugins/` - Reserved for custom plugin development. Place new Halo plugins here to expand business logic.
* `config/` - Contains configuration files like `application-dev.yaml` to run the application easily.
* `deploy/` - Contains deployment scripts such as `docker-compose.yml` for production or containerized environments.

## How to Run

### Prerequisite
To compile and run natively, you need **Java 17+** (or Java 21). If your machine only has Java 8, you can use the provided Docker Development method.

### Backend (Native)
1. Navigate to the `backend` directory.
2. Run the project using Gradle: `./gradlew bootRun --args="--spring.config.location=../config/application-dev.yaml"`

### Backend (Docker Development for Java 8 users)
If you don't want to install Java 21 locally:
1. Navigate to the `deploy` directory.
2. Run `docker-compose -f docker-compose.dev.yml up`
This will map your local `backend` directory into a Java 21 container and run `./gradlew bootRun`.

### Theme
1. Navigate to `theme/halo-theme-chirpy`.
2. Install dependencies: `npm install` (or `pnpm install`)
3. Build the theme: `npm run build` or `npm run zip` to package it for Halo.

### Docker Deployment
1. Navigate to the `deploy` directory.
2. Run `docker-compose up -d` to start the required services (e.g., PostgreSQL).
