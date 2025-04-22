pipeline {
    agent any

    environment {
        // Đặt biến môi trường nếu cần, ví dụ:
        PROJECT_NAME = 'my-app'
    }

    triggers {
        // Tự động chạy khi có push lên Git
        pollSCM('* * * * *') // mỗi phút kiểm tra SCM thay đổi (nên dùng webhook thay vì poll nếu có thể)
    }

    stages {
        stage('Checkout') {
            steps {
                echo '🔄 Checking out code...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '📦 Installing dependencies...'
                // Ví dụ với Node.js
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                echo '🧪 Running tests...'
                // Chạy test, ví dụ với Jest
                sh 'npm test'
            }
        }

        stage('Post-Test Actions') {
            steps {
                echo '✅ Tests completed.'
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
        }

        success {
            echo '🎉 Build succeeded!'
        }

        failure {
            echo '💥 Build failed.'
        }
    }
}
