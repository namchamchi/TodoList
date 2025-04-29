pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        DOCKER_IMAGE = 'todo-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY = 'your-docker-registry'
    }

    tools {
        nodejs 'NodeJS 20.1.0' // version trong Jenkins
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
                sh 'sudo docker build -t todo-app:${BUILD_NUMBER} .'
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    docker.withRegistry('https://${DOCKER_REGISTRY}', 'docker-credentials') {
                        docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                script {
                    // Deploy to staging environment
                    sh "kubectl apply -f k8s/staging-deployment.yaml"
                    sh "kubectl apply -f k8s/staging-service.yaml"
                }
            }
        }

        stage('Verify Staging') {
            steps {
                script {
                    // Wait for deployment to be ready
                    sh "kubectl rollout status deployment/todo-app-staging"
                    
                    // Run integration tests against staging
                    sh "npm run test:integration"
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                script {
                    // Deploy to production environment
                    sh "kubectl apply -f k8s/production-deployment.yaml"
                    sh "kubectl apply -f k8s/production-service.yaml"
                }
            }
        }

        stage('Verify Production') {
            steps {
                script {
                    // Wait for deployment to be ready
                    sh "kubectl rollout status deployment/todo-app-production"
                    
                    // Run smoke tests against production
                    sh "npm run test:smoke"
                }
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
            sh '''
                # Xóa các container tạm thời
                docker ps -a | grep test-container && docker rm -f test-container || true
                
                # Xóa các image không sử dụng
                docker system prune -f
            '''
        }
        success {
            echo '✅ Build completed successfully!'
            archiveArtifacts artifacts: '*.tar', fingerprint: true
            // Tag the Docker image as latest
            script {
                docker.withRegistry('https://${DOCKER_REGISTRY}', 'docker-credentials') {
                    docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").push('latest')
                }
            }
        }
        failure {
            echo '❌ Build failed.'
            // Rollback to previous version
            script {
                sh "kubectl rollout undo deployment/todo-app-production"
            }
        }
    }
}
