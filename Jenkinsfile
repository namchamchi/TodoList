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
        EC2_PROD_IP = '54.147.130.180'
        DOCKER_CLI_EXPERIMENTAL = "enabled"
        // Cache configuration
        REDIS_HOST = '10.0.2.15'
        REDIS_PORT = '6379'
        CACHE_KEY_PREFIX = "pipeline_${BUILD_NUMBER}"
    }

    tools {
        nodejs 'NodeJS 20.1.0'
    }

    stages {
        stage('Setup Cache') {
            steps {
                echo '🔄 Setting up Redis cache...'
                sh '''
                    # Install Redis client if not exists
                    if ! command -v redis-cli &> /dev/null; then
                        echo "Installing Redis client..."
                        apt-get update && apt-get install -y redis-tools
                    fi

                    # Check if Redis container exists and handle it
                    if docker ps -a | grep -q redis-cache; then
                        echo "Redis container exists, checking status..."
                        if ! docker ps | grep -q redis-cache; then
                            echo "Starting existing Redis container..."
                            docker start redis-cache
                        else
                            echo "Redis container is already running"
                        fi
                    else
                        echo "Starting new Redis container..."
                        docker run -d --name redis-cache -p 6379:6379 redis:alpine
                    fi

                    # Test Redis connection using host IP
                    redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} ping || exit 1
                '''
            }
        }

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
                        script {
                            // Generate cache key based on package.json hash
                            def packageJsonHash = sh(
                                script: 'md5sum package.json | cut -d" " -f1',
                                returnStdout: true
                            ).trim()
                            def cacheKey = "${CACHE_KEY_PREFIX}_deps_${packageJsonHash}"

                            // Check if dependencies are cached
                            def cachedDeps = sh(
                                script: "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} get ${cacheKey}",
                                returnStdout: true
                            ).trim()

                            if (cachedDeps == "1") {
                                echo "📦 Using cached dependencies..."
                                sh '''
                                    # Restore node_modules from cache
                                    tar -xf /tmp/node_modules.tar.gz
                                '''
                            } else {
                                echo "📦 Installing fresh dependencies..."
                                sh '''
                                    # Install dependencies
                                    npm ci
                                    
                                    # Cache node_modules
                                    tar -czf /tmp/node_modules.tar.gz node_modules
                                    redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} set "${cacheKey}" "1"
                                    redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} expire "${cacheKey}" 86400  # Cache for 24 hours
                                '''
                            }
                        }
                    }
                }

                stage('Run Tests') {
                    steps {
                        echo '🧪 Running tests...'
                        script {
                            // Generate cache key based on test files hash
                            def testFilesHash = sh(
                                script: 'find . -name "*.test.js" -type f -exec md5sum {} \\; | sort | md5sum | cut -d" " -f1',
                                returnStdout: true
                            ).trim()
                            def cacheKey = "${CACHE_KEY_PREFIX}_tests_${testFilesHash}"

                            // Check if test results are cached
                            def cachedTests = sh(
                                script: "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} get ${cacheKey}",
                                returnStdout: true
                            ).trim()

                            if (cachedTests == "1") {
                                echo "🧪 Using cached test results..."
                            } else {
                                echo "🧪 Running fresh tests..."
                                sh 'npm test'
                                sh "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} set \"${cacheKey}\" \"1\""
                                sh "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} expire \"${cacheKey}\" 3600"  // Cache for 1 hour
                            }
                        }
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
                script {
                    // Generate cache key based on Dockerfile and source files
                    def dockerCacheKey = sh(
                        script: 'find . -type f -not -path "*/node_modules/*" -not -path "*/\\..*" -exec md5sum {} \\; | sort | md5sum | cut -d" " -f1',
                        returnStdout: true
                    ).trim()
                    
                    def cacheKey = "${CACHE_KEY_PREFIX}_docker_${dockerCacheKey}"
                    def cachedImage = sh(
                        script: "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} get ${cacheKey}",
                        returnStdout: true
                    ).trim()

                    if (cachedImage == "1") {
                        echo "🐳 Using cached Docker image..."
                        sh '''
                            docker pull namchamchi/${DOCKER_IMAGE}:latest
                            docker tag namchamchi/${DOCKER_IMAGE}:latest namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG}
                        '''
                    } else {
                        echo "🐳 Building fresh Docker image..."
                        withCredentials([usernamePassword(credentialsId: 'jenkins_dockerhub_token', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                            sh '''
                                echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
                                
                                # Build and push image
                                docker buildx build \
                                    --platform linux/amd64,linux/arm64 \
                                    -t namchamchi/${DOCKER_IMAGE}:${DOCKER_TAG} \
                                    -t namchamchi/${DOCKER_IMAGE}:latest \
                                    --push .

                                # Cache the build
                                redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} set ${cacheKey} 1
                                redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} expire ${cacheKey} 86400  # Cache for 24 hours
                            '''
                        }
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
                // Clean up old cache entries
                sh '''
                    # Remove cache entries older than 7 days
                    redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} keys "${CACHE_KEY_PREFIX}_*" | xargs -r redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} del
                '''
                
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
