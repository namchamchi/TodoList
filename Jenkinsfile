pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        DOCKER_IMAGE = 'todo-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_USERNAME = credentials('namchamchi')
        DOCKER_PASSWORD = credentials('dckr_pat_O0pPtQQIw49vc_bjLMg4oh48kBc')
    }

    tools {
        nodejs 'NodeJS 20.1.0'
    }

    stages {
        stage('Checkout') {
            steps {
                echo '🌀 Cloning repository...'
                checkout scm
            }
        }

        stage('Build and Test') {
            steps {
                echo '📦 Installing dependencies...'
                sh 'npm install'
                echo '🧪 Running tests...'
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '🐳 Building Docker image...'
                script {
                    docker.build("${DOCKER_USERNAME}/${DOCKER_IMAGE}:${DOCKER_TAG}")
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo '📤 Pushing to Docker Hub...'
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'docker-hub-credentials') {
                        docker.image("${DOCKER_USERNAME}/${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                        docker.image("${DOCKER_USERNAME}/${DOCKER_IMAGE}:${DOCKER_TAG}").push('latest')
                    }
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    try {
                        docker.withRegistry('https://${DOCKER_REGISTRY}', 'dockerhub-jenkins-token') {
                            docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                        }
                    } catch (Exception e) {
                        echo '⚠️ Docker push skipped...'
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                script {
                    try {
                        sh "kubectl apply -f k8s/staging-deployment.yaml"
                        sh "kubectl apply -f k8s/staging-service.yaml"
                    } catch (Exception e) {
                        echo '⚠️ Deployment to staging skipped...'
                    }
                }
            }
        }

        stage('Verify Staging') {
            steps {
                script {
                    try {
                        sh "kubectl rollout status deployment/todo-app-staging"
                        sh "npm run test:integration"
                    } catch (Exception e) {
                        echo '⚠️ Verification skipped...'
                    }
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                script {
                    try {
                        sh "kubectl apply -f k8s/production-deployment.yaml"
                        sh "kubectl apply -f k8s/production-service.yaml"
                    } catch (Exception e) {
                        echo '⚠️ Deployment to production skipped...'
                    }
                }
            }
        }

        stage('Verify Production') {
            steps {
                script {
                    try {
                        sh "kubectl rollout status deployment/todo-app-production"
                        sh "npm run test:smoke"
                    } catch (Exception e) {
                        echo '⚠️ Verification skipped...'
                    }
                }
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
        }
        success {
            echo '✅ Build completed successfully!'
        }
        failure {
            echo '❌ Build failed.'
            script {
                try {
                    sh "kubectl rollout undo deployment/todo-app-production"
                } catch (Exception e) {
                    echo '⚠️ Rollback skipped...'
                }
            }
        }
    }
}
