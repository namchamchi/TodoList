pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        DOCKER_IMAGE = 'todo-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY = 'docker.io'
        EMAIL_RECIPIENTS = 'covodoi09@gmail.com'
        SONAR_HOST_URL = 'http://localhost:9000' 
        SONAR_TOKEN = credentials('sonar-token')
        EC2_PROD_IP = '13.221.16.169'
        DOCKER_CLI_EXPERIMENTAL = "enabled"
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
                // // Commented out SonarQube analysis
                // /*
                // withSonarQubeEnv('SonarQube') {
                //     sh 'npm install -g sonarqube-scanner'
                //     sh 'sonar-scanner -Dsonar.projectKey=todo-app -Dsonar.sources=. -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js -Dsonar.tests=. -Dsonar.test.inclusions=**/*.test.js -Dsonar.javascript.jstest.reportsPaths=coverage/junit.xml'
                // }
                // */
            }
        }

        stage('Quality Gate') {
            steps {
                echo '✅ Skipping Quality Gate check...'
                // // Commented out Quality Gate check
                // /*
                // script {
                //     def taskId = sh(script: 'curl -s -u admin:admin http://192.168.1.6:9000/api/ce/task?component=todo-app | grep -o \'"id":"[^"]*"\' | cut -d\'"\' -f4', returnStdout: true).trim()
                //     echo "SonarQube Task ID: ${taskId}"
                //     def maxAttempts = 1
                //     def attempt = 0
                //     while (attempt < maxAttempts) {
                //         def taskStatus = sh(script: "curl -s -u admin:admin http://192.168.1.6:9000/api/ce/task?id=${taskId}", returnStdout: true).trim()
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
                // */
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '🐳 Building Docker image...'
                sh '''
                    # Cài đặt Docker Buildx
                    if ! docker buildx version &>/dev/null; then
                        echo "Docker Buildx không có sẵn, tiến hành cài đặt..."
                         mkdir -p ~/.docker/cli-plugins
                         curl -SL https://github.com/docker/buildx/releases/latest/download/buildx-linux-arm64 -o ~/.docker/cli-plugins/docker-buildx
                         chmod +x ~/.docker/cli-plugins/docker-buildx
                    fi
                    export DOCKER_CLI_EXPERIMENTAL=enabled
                    docker buildx version


                    docker buildx create --name mybuilder --use
                    docker buildx inspect --bootstrap
                    docker buildx build \
                        --platform linux/amd64,linux/arm64 \
                        -t namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG} \
                        -t namchamchi/${DOCKER_IMAGE}:latest \
                    # Tạo và sử dụng builder nếu chưa tồn tại
                    if ! docker buildx inspect mybuilder &>/dev/null; then
                        docker buildx create --name mybuilder --use
                    else
                        docker buildx use mybuilder
                    fi

                    # Khởi tạo QEMU và kiểm tra builder
                    docker buildx inspect --bootstrap

                    # Build và push multi-arch image
                    docker buildx build \
                        --platform linux/amd64,linux/arm64 \
                        -t namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG} \
                        -t namchamchi/${DOCKER_IMAGE}:latest \
                        --push .
                '''
            }
        }

        stage('Deploy to Staging') {
            steps {
                echo '🚀 Deploying to staging...'
                sh '''
                    # Pull latest image
                    docker pull namchamchi/todo-app:latest

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
                        namchamchi/todo-app:latest

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
                    sshagent(['ec2-ssh']) {
                        sh '''
                            ssh -o StrictHostKeyChecking=no ec2-user@${EC2_PROD_IP} <<EOF
                                set -e
                                echo "🐳 Pulling latest Docker image..."
                                docker pull namchamchi/todo-app:latest

                                echo "🛑 Stopping old container if exists..."
                                docker stop todo-app || true
                                docker rm todo-app || true

                                echo "🚀 Starting new container..."
                                docker run -d \
                                    --name todo-app \
                                    -p 80:3000 \
                                    --restart unless-stopped \
                                    namchamchi/todo-app:latest

                                echo "✅ Deployment on EC2 done!"
                            EOF
                        '''
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
            sh 'docker-compose down || true'
            script {
                try {
                    sh 'kubectl rollout undo deployment/todo-app-production'
                } catch (Exception e) {
                    echo '⚠️ Rollback skipped...'
                }
            }
        }
    }
}
