pipeline {
    agent any

    stages {
        stage('Clone') {
            steps {
                echo '🌀 Cloning repository...'
                // Nếu Jenkins đã checkout repo từ SCM, dòng này không cần
                // git url: 'https://github.com/namchamchi/TodoList.git', credentialsId: 'github-pat'
            }
        }

        stage('Build') {
            steps {
                echo '🏗️ Running build step...'
                sh 'echo "Build step executed!"'
            }
        }

        stage('Test') {
            steps {
                echo '🧪 Running test step...'
                sh 'echo "Test step executed!"'
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline executed successfully!'
        }
        failure {
            echo '❌ Pipeline failed.'
        }
    }
}
