pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
    }

    tools {
        nodejs 'NodeJS 20.1.0' // Chỉnh theo version bạn đã cài trong Jenkins
    }

    stages {
        stage('Clone') {
            steps {
                echo '🌀 Cloning repository...'
                // Nếu dùng "Pipeline from SCM", Jenkins tự clone rồi, không cần dòng git này.
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
                sh 'npm test' // hoặc `npx jest`, `npm run test`, tuỳ setup
            }
        }

        stage('Build') {
            steps {
                echo '🏗️ Building app...'
                sh 'npm run build' // Nếu bạn có bước build, ví dụ với React/Next
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
