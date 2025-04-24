pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        SONARQUBE_TOKEN = credentials('sonarqube-token')
    }

    tools {
        nodejs 'NodeJS 20.1.0' // version trong Jenkins
    }

    stages {
        stage('Clone') {
            steps {
                echo '🌀 Cloning repository...'
                checkout scm
            }
        }

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
                    sh '''
                        sonar-scanner \
                        -Dsonar.projectKey=todo-app \
                        -Dsonar.sources=. \
                        -Dsonar.host.url=http://localhost:9000 \
                        -Dsonar.login=${SONARQUBE_TOKEN} \
                        -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                        -Dsonar.testExecutionReportPaths=coverage/test-report.xml
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo '🔍 Waiting for SonarQube analysis to complete...'
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build') {
            steps {
                echo '🏗️ Building app...'
                sh 'npm run build' 
            }
        }
    }

    post {
        success {
            echo '✅ Build and test completed successfully!'
        }
        failure {
            echo '❌ Build or test failed.'
        }
    }
}
