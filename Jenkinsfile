pipeline {
    agent any

    environment {
        // Application Settings
        NODE_ENV = 'development'
        APP_NAME = 'todo-app'
        APP_PORT = '3000'
        
        // Docker Configuration
        DOCKER_IMAGE = 'todo-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_REGISTRY_USER = 'namchamchi'
        DOCKER_NETWORK = 'todo-network'
        
        // Server Configuration
        STAGING_HOST = '10.0.2.15'
        STAGING_PORT = '3000'
        EC2_PROD_IP = '3.83.152.121'
        PROD_PORT = '80'
        
        // SonarQube Configuration
        SONAR_HOST_URL = 'http://192.168.1.15:9000'
        SONAR_TOKEN = credentials('sonar-token-1')
        SONAR_PROJECT_KEY = 'todo-app'
        
        // Email Configuration
        EMAIL_RECIPIENTS = 'covodoi09@gmail.com'
        EMAIL_CC = 'covodoi01@gmail.com'
        
        // Deployment Configuration
        ROLLBACK_FILE = '.rollback-tag'
        HEALTH_CHECK_ENDPOINT = '/api/todos'
    }

    tools {
        nodejs 'NodeJS 20.1.0'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing dependencies...'
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                echo '🧪 Running tests...'
                sh 'npm test'
            }
        }


        stage('Test & Build Parallel') {
            parallel {

                stage('SonarQube Analysis') {
                    steps {
                        echo '🔍 Running SonarQube analysis...'
                        withSonarQubeEnv('SonarQube') {
                            sh 'sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=. \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                                -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js \
                                -Dsonar.tests=. \
                                -Dsonar.test.inclusions=**/*.test.js \
                                -Dsonar.javascript.jstest.reportsPaths=coverage/junit.xml'
                        }
                    }
                }

                stage('Build Docker Image') {
                    steps {
                        echo '🐳 Building Docker image...'
                        script {
                            withCredentials([usernamePassword(
                                credentialsId: 'jenkins_dockerhub_token',
                                passwordVariable: 'DOCKER_PASSWORD',
                                usernameVariable: 'DOCKER_USERNAME'
                            )]) {
                                sh '''
                                    echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
                                    docker buildx rm mybuilder || true
                                    docker buildx create --name mybuilder --use --driver docker-container --driver-opt network=host
                                    docker buildx inspect --bootstrap
                                    docker buildx build \
                                        --platform linux/amd64,linux/arm64 \
                                        --cache-from type=registry,ref=${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:latest \
                                        --cache-to type=inline \
                                        -t ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:${DOCKER_TAG} \
                                        -t ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:latest \
                                        --push .
                                '''
                            }
                        }
                    }
                }
            }
        }

        // Chỉ Quality Gate — build image đã xong ở bước trên!
        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                echo '🚀 Deploying to staging...'
                // deploy như cũ
            }
        }

        stage('Verify Staging') {
            steps {
                echo '✅ Verifying staging...'
                // verify như cũ
            }
        }

        stage('Deploy to Production') {
            steps {
                echo '🚀 Deploying to production...'
                // deploy như cũ
            }
        }

        stage('Verify Production') {
            steps {
                echo '✅ Verifying production...'
                // verify như cũ
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
            // Cleanup & Email như cũ
        }
    }
}