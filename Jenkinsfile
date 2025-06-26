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
        EC2_PROD_IP = '54.157.45.36'
        PROD_PORT = '80'
        
        // SonarQube Configuration
        SONAR_HOST_URL = 'https://suitably-amused-walrus.ngrok-free.app'
        SONAR_TOKEN = credentials('sonar-token-1')
        SONAR_PROJECT_KEY = 'todo-app'
        
        // Email Configuration
        EMAIL_RECIPIENTS = 'covodoi09@gmail.com'
        EMAIL_CC = 'covodoi01@gmail.com'
        
        // Deployment Configuration
        ROLLBACK_FILE = '.rollback-tag'
        HEALTH_CHECK_ENDPOINT = '/api/todos'
        
        // Timeout Configuration
        HEALTH_CHECK_TIMEOUT = '60'
        DEPLOYMENT_TIMEOUT = '300'
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
                        script {
                            sleep 5
                            withResourceThreshold(cpuThreshold: 60, memThreshold: 60, timeout: 300, interval: 10) {
                                // sleep 36
                                withSonarQubeEnv('SonarQube') {
                                    sh '''
                                        sonar-scanner \
                                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                            -Dsonar.sources=. \
                                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                                            -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js \
                                            -Dsonar.tests=. \
                                            -Dsonar.test.inclusions=**/*.test.js \
                                            -Dsonar.javascript.jstest.reportsPaths=coverage/junit.xml
                                    '''
                                }
                            }
                        }
                    }
                }
                //for test rollback
                // stage('Build Docker Image') {
                //     steps {
                //         echo '🐳 Building Docker image...'
                //         script {
                //             withCredentials([usernamePassword(
                //                 credentialsId: 'jenkins_dockerhub_token',
                //                 passwordVariable: 'DOCKER_PASSWORD',
                //                 usernameVariable: 'DOCKER_USERNAME'
                //             )]) {
                //                 sh '''
                //                     echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
                                    
                //                     # Standard Docker build (single platform)
                //                     docker build \
                //                         -t ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:${DOCKER_TAG} \
                //                         -t ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:latest \
                //                         .
                                    
                //                     # Push to registry
                //                     docker push ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:${DOCKER_TAG}
                //                     docker push ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:latest
                //                 '''
                //             }
                //         }
                //     }
                // }


                //for test no cache
                // stage('Build Docker Image') {
                //     steps {
                //         echo '🐳 Building Docker image with buildx (no cache)...'
                //         script {
                //             withCredentials([usernamePassword(
                //                 credentialsId: 'jenkins_dockerhub_token',
                //                 passwordVariable: 'DOCKER_PASSWORD',
                //                 usernameVariable: 'DOCKER_USERNAME'
                //             )]) {
                //                 sh '''
                //                     echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
                //                     docker buildx rm mybuilder || true
                //                     docker buildx create --name mybuilder --use --driver docker-container --driver-opt network=host
                //                     docker buildx inspect --bootstrap
                //                     docker buildx build \
                //                         --platform linux/amd64,linux/arm64 \
                //                         --no-cache \
                //                         -t ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:${DOCKER_TAG} \
                //                         -t ${DOCKER_REGISTRY_USER}/${DOCKER_IMAGE}:latest \
                //                         --push .
                //                 '''
                //             }
                //         }
                //     }
                // }


                // Comment out buildx for testing
                stage('Build Docker Image') {
                    steps {
                        echo '🐳 Building Docker image with buildx...'
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

        stage('Quality Gate') {
            steps {
                echo 'Quality Gate'
                // timeout(time: 1, unit: 'MINUTES') {
                //     waitForQualityGate abortPipeline: true
                // }  
            }
        }

        stage('Deploy to Staging') {
            steps {
                echo '🚀 Deploying to staging...'
                script {
                    try {
                        sh '''
                            # Pull latest image
                            docker pull namchamchi/todo-app:${DOCKER_TAG}

                            # Stop and remove existing containers
                            docker stop todo-app || true
                            docker rm todo-app || true

                            # Create network if not exists
                            docker network create todo-network || true

                            # Start new container
                            docker run -d \
                                --name todo-app \
                                -p 3000:3000 \
                                --network todo-network \
                                --restart unless-stopped \
                                namchamchi/todo-app:${DOCKER_TAG}

                            # Wait for application to be ready with timeout
                            timeout ${HEALTH_CHECK_TIMEOUT} bash -c '
                                until curl -f http://${STAGING_HOST}:${STAGING_PORT}${HEALTH_CHECK_ENDPOINT}; do
                                    echo "Waiting for application to be ready..."
                                    sleep 5
                                done
                            '
                        '''
                    } catch (Exception e) {
                        echo "❌ Staging deployment failed: ${e.message}"
                        throw e
                    }
                }
            }
        }

        stage('Verify Staging') {
            steps {
                echo '🔍 Verifying staging deployment...'
                script {
                    sh '''
                        # Check container status
                        docker ps | grep todo-app

                        # Check application health
                        curl -f http://${STAGING_HOST}:${STAGING_PORT}${HEALTH_CHECK_ENDPOINT} || exit 1
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                echo '🚀 Deploying to production EC2...'
                script {
                    try {
                        sshagent(['ec2-ssh']) {
                            def currentImage = sh(
                                script: """
                                    ssh -o StrictHostKeyChecking=no ec2-user@${EC2_PROD_IP} \\
                                    'docker inspect --format="{{.Config.Image}}" todo-app || echo "none"'
                                """,
                                returnStdout: true
                            ).trim()
                            echo "🔁 Current running image on EC2: ${currentImage}"
                            writeFile file: ROLLBACK_FILE, text: currentImage

                            sh """
                                ssh -o StrictHostKeyChecking=no ec2-user@${EC2_PROD_IP} '
                                    set -e
                                    echo "🐳 Pulling latest Docker image..."
                                    docker pull namchamchi/todo-app:${DOCKER_TAG}

                                    echo "🛑 Stopping old container if exists..."
                                    docker stop todo-app || true
                                    docker rm todo-app || true

                                    echo "🚀 Starting new container..."
                                    docker run -d \
                                        --name todo-app \
                                        -p ${PROD_PORT}:3000 \
                                        --restart unless-stopped \
                                        namchamchi/todo-app:${DOCKER_TAG}

                                    echo "✅ Deployment on EC2 done!"
                                '
                            """
                        }
                    } catch (Exception e) {
                        echo "❌ Deployment failed: ${e.message}"
                        // Thực hiện rollback ngay lập tức
                        performRollback()
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
                    try {
                        // First check if container is running on EC2
                        echo '🔍 Checking container status on EC2...'
                        sshagent(['ec2-ssh']) {
                            sh """
                                ssh -o StrictHostKeyChecking=no ec2-user@${EC2_PROD_IP} '
                                    echo "Container status:"
                                    docker ps | grep todo-app || echo "Container not found"
                                    echo "Container logs:"
                                    docker logs todo-app --tail 20 || echo "No logs available"
                                '
                            """
                        }
                        
                        // Then perform health check
                        echo '🔍 Performing health check...'
                        sh '''
                            # Health check with timeout
                            timeout ${HEALTH_CHECK_TIMEOUT} bash -c '
                                until curl -f http://${EC2_PROD_IP}:${PROD_PORT}${HEALTH_CHECK_ENDPOINT}; do
                                    echo "Waiting for production application to be ready..."
                                    sleep 5
                                done
                            '
                        '''
                    } catch (Exception e) {
                        echo "❌ Production verification failed: ${e.message}"
                        echo "🔄 Triggering rollback due to verification failure..."
                        performRollback()
                        throw e
                    }
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
                    deploymentStatus = sh(script: 'docker ps | grep todo-app', returnStdout: true).trim()
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
                    to: "${env.EMAIL_RECIPIENTS}",
                    cc: "${env.EMAIL_CC}",
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

// Helper function for rollback
def performRollback() {
    script {
        try {
            def rollbackTag = readFile(ROLLBACK_FILE).trim()
            if (rollbackTag != 'none') {
                echo "🔄 Rolling back to previous version: ${rollbackTag}"
                
                // Rollback staging environment
                echo '🔄 Rolling back staging environment...'
                sh """
                    docker stop todo-app || true
                    docker rm todo-app || true
                    docker pull ${rollbackTag} || true
                    docker run -d \
                        --name todo-app \
                        -p ${STAGING_PORT}:3000 \
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
                            docker stop todo-app || true
                            docker rm todo-app || true
                            docker pull ${rollbackTag} || true
                            docker run -d \
                                --name todo-app \
                                -p ${PROD_PORT}:3000 \
                                --restart unless-stopped \
                                ${rollbackTag} || true
                            
                            echo "✅ Rollback completed!"
                        '
                    """
                }
            } else {
                echo "⚠️ No previous version available for rollback"
            }
        } catch (Exception e) {
            echo "❌ Rollback failed: ${e.message}"
        }
    }
}

def withResourceThreshold(Map params = [:], Closure body) {
    def cpuThreshold = params.get('cpuThreshold', 60)
    def memThreshold = params.get('memThreshold', 60)
    def timeoutSec = params.get('timeout', 300)
    def sleepSec = params.get('interval', 10)

    int maxRetry = (int)(timeoutSec / sleepSec)

    for (int i = 0; i < maxRetry; i++) {
        def cpuUsage = sh(script: 'top -bn1 | grep "Cpu(s)" | awk \'{print 100 - $8}\'', returnStdout: true).trim()
        def memUsage = sh(script: 'free | awk \'/Mem:/ {print $3/$2 * 100.0}\'', returnStdout: true).trim()
        def cpuFloat = cpuUsage.toFloat()
        def memFloat = memUsage.toFloat()

        echo "🔍 CPU hiện tại: ${cpuFloat}% | MEM hiện tại: ${memFloat}% (lần thử ${i + 1}/${maxRetry})"

        if (cpuFloat < cpuThreshold && memFloat < memThreshold) {
            echo "✅ CPU (${cpuFloat}%) < ${cpuThreshold}% & MEM (${memFloat}%) < ${memThreshold}%. Tiến hành chạy task..."
            body()
            return
        } else {
            def remaining = timeoutSec - (i + 1) * sleepSec
            echo "⏳ Tài nguyên cao (CPU: ${cpuFloat}%, MEM: ${memFloat}%). Đợi thêm ${sleepSec}s (còn ${remaining}s)..."
            sleep sleepSec
        }
    }

    error "❌ Quá thời gian ${timeoutSec}s mà CPU hoặc MEM vẫn cao hơn ngưỡng cho phép. Dừng tác vụ."
}






