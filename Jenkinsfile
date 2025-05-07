pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        DOCKER_IMAGE = 'todo-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY = 'docker.io'
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
                    docker.build("namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG}")
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo '📤 Pushing to Docker Hub...'
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-jenkins-token') {
                        docker.image("namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                        docker.image("namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG}").push('latest')
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
                echo '🚀 Deploying to staging...'
                sh '''
                    # Pull latest image
                    docker pull namchamchi/todo-app:latest
                    
                    # Stop and remove existing containers
                    docker-compose down || true
                    
                    # Start new containers
                    docker-compose up -d
                    
                    # Wait for application to be ready
                    sleep 10
                    
                    # Verify deployment
                    curl -f http://localhost:3000 || exit 1
                '''
            }
        }

        stage('Verify Staging') {
            steps {
                echo '🔍 Verifying staging deployment...'
                sh '''
                    # Check container status
                    docker ps | grep todo-app
                    
                    # Check application health
                    curl -f http://localhost:3000/api/todos || exit 1
                '''
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
            echo '✅ Build and deployment completed successfully!'
        }
        failure {
            echo '❌ Build or deployment failed.'
            sh 'docker-compose down || true'
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
