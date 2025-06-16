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

        stage('SonarQube Analysis') {
            steps {
                echo '🔍 Running SonarQube analysis...'
                withSonarQubeEnv('SonarQube') {
                    sh 'npm install -g sonarqube-scanner'
                    sh """
                        sonar-scanner \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.sources=. \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js \
                            -Dsonar.tests=. \
                            -Dsonar.test.inclusions=**/*.test.js \
                            -Dsonar.javascript.jstest.reportsPaths=coverage/junit.xml
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
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
                            
                            # Xóa builder cũ nếu tồn tại
                            docker buildx rm mybuilder || true
                            
                            # Tạo builder mới với cache
                            docker buildx create --name mybuilder --use --driver docker-container --driver-opt network=host
                            
                            # Khởi tạo QEMU và kiểm tra builder
                            docker buildx inspect --bootstrap

                            # Build và push multi-arch image với cache
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

        stage('Deploy to Staging') {
            steps {
                echo 'Deploying to staging...'
                sh '''
                    # Pull latest image
                    docker pull ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:${DOCKER_TAG}

                    # Stop and remove existing containers
                    docker stop ${APP_NAME} || true
                    docker rm ${APP_NAME} || true

                    # Create network if not exists
                    docker network create ${DOCKER_NETWORK} || true

                    # Start new container
                    docker run -d \
                        --name ${APP_NAME} \
                        -p ${STAGING_PORT}:${APP_PORT} \
                        --network ${DOCKER_NETWORK} \
                        --restart unless-stopped \
                        ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:${DOCKER_TAG}

                    # Wait for application to be ready
                    sleep 10

                    # Verify deployment
                    curl -f http://${STAGING_HOST}:${STAGING_PORT}${HEALTH_CHECK_ENDPOINT} || exit 1
                '''
            }
        }

        stage('Verify Staging') {
            steps {
                echo '🔍 Verifying staging deployment...'
                sh '''
                    # Check container status
                    docker ps | grep ${APP_NAME}

                    # Check application health
                    curl -f http://${STAGING_HOST}:${STAGING_PORT}${HEALTH_CHECK_ENDPOINT} || exit 1
                '''
            }
        }

        stage('Deploy to Production') {
            steps {
                echo 'Deploying to production EC2...'
                script {
                    try {
                        // Lưu thông tin image hiện tại trước khi deploy
                        def currentImage = sh(
                            script: "docker inspect --format='{{.Config.Image}}' ${APP_NAME} || echo 'none'",
                            returnStdout: true
                        ).trim()
                        echo "🔁 Current running image: ${currentImage}"
                        writeFile file: env.ROLLBACK_FILE, text: currentImage

                        sshagent(['ec2-ssh']) {
                            sh """
                                ssh -o StrictHostKeyChecking=no ec2-user@${EC2_PROD_IP} '
                                    set -e
                                    echo "Pulling latest Docker image..."
                                    docker pull ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:${DOCKER_TAG}

                                    echo "Stopping old container if exists..."
                                    docker stop ${APP_NAME} || true
                                    docker rm ${APP_NAME} || true

                                    echo "🚀 Starting new container..."
                                    docker run -d \
                                        --name ${APP_NAME} \
                                        -p ${PROD_PORT}:${APP_PORT} \
                                        --restart unless-stopped \
                                        ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:${DOCKER_TAG}

                                    echo "Deployment on EC2 done!"
                                '
                            """
                        }
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.message}"
                        // Thực hiện rollback ngay lập tức
                        def rollbackTag = readFile(env.ROLLBACK_FILE).trim()
                        if (rollbackTag != 'none') {
                            echo "🔄 Rolling back to previous version: ${rollbackTag}"
                            
                            // Rollback staging environment
                            echo '🔄 Rolling back staging environment...'
                            sh """
                                docker stop ${APP_NAME} || true
                                docker rm ${APP_NAME} || true
                                docker pull ${rollbackTag} || true
                                docker run -d \
                                    --name ${APP_NAME} \
                                    -p ${STAGING_PORT}:${APP_PORT} \
                                    --network ${DOCKER_NETWORK} \
                                    --restart unless-stopped \
                                    ${rollbackTag} || true
                            """
                            
                            // Rollback production environment
                            echo '🔄 Rolling back production environment...'
                            sshagent(['ec2-ssh']) {
                                sh """
                                    ssh -o StrictHostKeyChecking=no ec2-user@${EC2_PROD_IP} '
                                        set -e
                                        echo "🔄 Rolling back to previous version: ${rollbackTag}"
                                        docker stop ${APP_NAME} || true
                                        docker rm ${APP_NAME} || true
                                        docker pull ${rollbackTag} || true
                                        docker run -d \
                                            --name ${APP_NAME} \
                                            -p ${PROD_PORT}:${APP_PORT} \
                                            --restart unless-stopped \
                                            ${rollbackTag} || true
                                        
                                        echo "Rollback completed!"
                                    '
                                """
                            }
                        } else {
                            echo "⚠️ No previous version available for rollback"
                        }
                        // Ném lại exception để đánh dấu stage thất bại
                        throw e
                    }
                }
            }
        }

        stage('Verify Production') {
            steps {
                echo '🔍 Verifying production deployment...'
                script {
                    sh "curl -f http://${EC2_PROD_IP}${HEALTH_CHECK_ENDPOINT} || exit 1"
                }
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
            script {
                def deploymentStatus = ''
                
                try {
                    deploymentStatus = sh(
                        script: "docker ps | grep ${APP_NAME}", 
                        returnStdout: true
                    ).trim()
                } catch (Exception e) {
                    deploymentStatus = 'No deployment status available'
                }

                def emailBody = """
                    <p>Pipeline ${currentBuild.result}: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'</p>
                    <p>Check console output at <a href='${env.BUILD_URL}'>${env.JOB_NAME} [${env.BUILD_NUMBER}]</a></p>
                    <p>Build URL: ${env.BUILD_URL}</p>
                    <p>Build Number: ${env.BUILD_NUMBER}</p>
                    <p>Build Status: ${currentBuild.currentResult}</p>
                    <p>Changes:</p>
                    <ul>
                        ${currentBuild.changeSets.collect { changeSet ->
                            changeSet.items.collect { item ->
                                "<li>${item.commitId} - ${item.msg} (${item.author.fullName})</li>"
                            }.join('')
                        }.join('')}
                    </ul>
                    <p>Test Results:</p>
                    <pre>${currentBuild.description ?: 'No test results available'}</pre>
                    <p>Deployment Status:</p>
                    <pre>${deploymentStatus}</pre>
                """

                mail(
                    to: env.EMAIL_RECIPIENTS,
                    cc: env.EMAIL_CC,
                    subject: "Pipeline ${currentBuild.result}: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'",
                    body: emailBody,
                    mimeType: 'text/html'
                )
            }
        }
        success {
            echo '✅ Build and deployment completed successfully!'
        }
        failure {
            echo '❌ Build or deployment failed.'
        }
        aborted {
            echo '⚠️ Build was aborted!'
        }
    }
}