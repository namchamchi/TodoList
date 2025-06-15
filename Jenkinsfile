pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        DOCKER_IMAGE = 'todo-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY = 'docker.io'
        EMAIL_RECIPIENTS = 'covodoi09@gmail.com'
        SONAR_HOST_URL = 'http://192.168.1.15:9000' 
        SONAR_TOKEN = credentials('sonar-token-1')
        EC2_PROD_IP = '3.83.152.121'
        // DOCKER_CLI_EXPERIMENTAL = "enabled"
        // DOCKER_BUILDKIT = "1"
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
            parallel {
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
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo '🔍 Skipping SonarQube analysis...'
                
                withSonarQubeEnv('SonarQube') {
                    sh 'npm install -g sonarqube-scanner'
                    sh 'sonar-scanner -Dsonar.projectKey=todo-app -Dsonar.sources=. -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js -Dsonar.tests=. -Dsonar.test.inclusions=**/*.test.js -Dsonar.javascript.jstest.reportsPaths=coverage/junit.xml'
                }
                
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
                // echo 'Quality Gate check...'
                
                // script {
                //     def taskId = sh(script: 'curl -s -u admin:admin http://192.168.1.15:9000/api/ce/task?component=todo-app | grep -o \'"id":"[^"]*"\' | cut -d\'"\' -f4', returnStdout: true).trim()
                //     echo "SonarQube Task ID: ${taskId}"
                //     def maxAttempts = 1
                //     def attempt = 0
                //     while (attempt < maxAttempts) {
                //         def taskStatus = sh(script: "curl -s -u admin:admin http://192.168.1.15:9000/api/ce/task?id=${taskId}", returnStdout: true).trim()
                //         echo "Attempt ${attempt + 1}/${maxAttempts} - Task Status: ${taskStatus}"
                //         if (taskStatus.contains('"status":"SUCCESS"')) {
                //             echo "✅ SonarQube analysis completed successfully"
                //             break
                //         } else if (taskStatus.contains('"status":"FAILED"')) {
                //             error "❌ SonarQube analysis failed"
                //         }
                //         attempt++
                //         sleep 10
                //     }
                //     timeout(time: 1, unit: 'MINUTES') {
                //         waitForQualityGate abortPipeline: true
                //     }
                // }
                
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '🐳 Building Docker image...'
                script {
                    withCredentials([usernamePassword(credentialsId: 'jenkins_dockerhub_token', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
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
                                --cache-from type=registry,ref=namchamchi/${DOCKER_IMAGE}:latest \
                                --cache-to type=inline \
                                -t namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG} \
                                -t namchamchi/${DOCKER_IMAGE}:latest \
                                --push .
                        '''
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                echo '🚀 Deploying to staging...'
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

                    # Wait for application to be ready
                    sleep 10

                    # Verify deployment
                    curl -f http://10.0.2.15:3000/api/todos || exit 1
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
                    curl -f http://10.0.2.15:3000/api/todos || exit 1
                '''
            }
        }

        stage('Deploy to Production') {
            steps {
                echo '🚀 Deploying to production EC2...'
                script {
                    try {
                        // Lưu thông tin image hiện tại trước khi deploy
                        def currentImage = sh(
                            script: 'docker inspect --format="{{.Config.Image}}" todo-app || echo "none"',
                            returnStdout: true
                        ).trim()
                        echo "🔁 Current running image: ${currentImage}"
                        writeFile file: '.rollback-tag', text: currentImage

                        sshagent(['ec2-ssh']) {
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
                                        -p 80:3000 \
                                        --restart unless-stopped \
                                        namchamchi/todo-app:${DOCKER_TAG}

                                    echo "✅ Deployment on EC2 done!"
                                '
                            """
                        }
                    } catch (Exception e) {
                        echo "❌ Deployment failed: ${e.message}"
                        // Thực hiện rollback ngay lập tức
                        def rollbackTag = readFile('.rollback-tag').trim()
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
                                    -p 3000:3000 \
                                    --network todo-network \
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
                                            -p 80:3000 \
                                            --restart unless-stopped \
                                            ${rollbackTag} || true
                                        
                                        echo "✅ Rollback completed!"
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
                    sh '''
                        curl -f http://${EC2_PROD_IP}/api/todos || exit 1
                    '''
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
                    cc: 'covodoi01@gmail.com',
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
