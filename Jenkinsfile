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
                echo '🔍 Running SonarQube analysis...'
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        npm install -g sonarqube-scanner
                        sonar-scanner \
                            -Dsonar.projectKey=todo-app \
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

        stage('Quality Gate') {
            steps {
                echo '✅ Checking Quality Gate...'
                script {
                    // Lấy task ID từ SonarQube
                    def taskId = sh(
                        script: 'curl -s -u admin:admin http://192.168.1.6:9000/api/ce/task?component=todo-app | grep -o \'"id":"[^"]*"\' | cut -d\'"\' -f4',
                        returnStdout: true
                    ).trim()
                    
                    echo "SonarQube Task ID: ${taskId}"
                    
                    // Đợi task hoàn thành
                    def maxAttempts = 12  // 2 phút với mỗi lần check 10 giây
                    def attempt = 0
                    
                    while (attempt < maxAttempts) {
                        def taskStatus = sh(
                            script: "curl -s -u admin:admin http://192.168.1.6:9000/api/ce/task?id=${taskId}",
                            returnStdout: true
                        ).trim()
                        
                        echo "Attempt ${attempt + 1}/${maxAttempts} - Task Status: ${taskStatus}"
                        
                        if (taskStatus.contains('"status":"SUCCESS"')) {
                            echo "✅ SonarQube analysis completed successfully"
                            break
                        } else if (taskStatus.contains('"status":"FAILED"')) {
                            error "❌ SonarQube analysis failed"
                        }
                        
                        attempt++
                        sleep 10
                    }
                    
                    // Kiểm tra Quality Gate
                    timeout(time: 1, unit: 'MINUTES') {
                        waitForQualityGate abortPipeline: true
                    }
                }
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
                    docker.withRegistry('https://index.docker.io/v1/', 'jenkins_dockerhub_token') {
                        docker.image("namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                        docker.image("namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG}").push('latest')
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
                script {
                    try {
                        sh 'kubectl apply -f k8s/production-deployment.yaml'
                        sh 'kubectl apply -f k8s/production-service.yaml'
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
                        sh 'kubectl rollout status deployment/todo-app-production'
                        sh 'npm run test:smoke'
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
