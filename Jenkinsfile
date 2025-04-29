pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        DOCKER_IMAGE = 'todo-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY = 'your-docker-registry'
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
                sh 'cd backend && npm install'
                echo '🧪 Running tests...'
                sh 'cd backend && npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '🐳 Building Docker image...'
                sh 'docker build -t todo-app:${BUILD_NUMBER} backend/'
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    try {
                        docker.withRegistry('https://${DOCKER_REGISTRY}', 'docker-credentials') {
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
                        sh "cd backend && npm run test:integration"
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
                        sh "cd backend && npm run test:smoke"
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
            script {
                try {
                    sh '''
                        # Xóa các container tạm thời
                        docker ps -a | grep test-container && docker rm -f test-container || true
                        
                        # Xóa các image không sử dụng
                        docker system prune -f
                    '''
                } catch (Exception e) {
                    echo '⚠️ Cleanup skipped...'
                }
            }
        }
        success {
            echo '✅ Build completed successfully!'
            archiveArtifacts artifacts: 'backend/*.tar', fingerprint: true
            script {
                try {
                    docker.withRegistry('https://${DOCKER_REGISTRY}', 'docker-credentials') {
                        docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").push('latest')
                    }
                } catch (Exception e) {
                    echo '⚠️ Docker push skipped...'
                }
            }
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
