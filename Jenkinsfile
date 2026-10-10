pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    IMAGE_TAG = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci --no-audit --no-fund'
      }
    }

    stage('Test') {
      steps {
        sh '''
          mkdir -p artifacts/test-reports
          node --test --test-reporter=junit backend/test/*.test.js > artifacts/test-reports/backend.xml
          npm run test --workspace frontend -- --reporter=junit --outputFile=../artifacts/test-reports/frontend.xml
        '''
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'artifacts/test-reports/*.xml'
        }
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Package artifacts') {
      steps {
        sh '''
          mkdir -p artifacts
          tar -czf artifacts/shelfwise-frontend-${BUILD_NUMBER}.tar.gz -C frontend/dist .
          tar -czf artifacts/shelfwise-backend-${BUILD_NUMBER}.tar.gz backend/src backend/package.json
          tar -czf artifacts/shelfwise-kubernetes-${BUILD_NUMBER}.tar.gz k8s
        '''
      }
    }

    stage('Build Docker images') {
      steps {
        sh '''
          docker build -f backend/Dockerfile -t shelfwise/backend:${IMAGE_TAG} .
          docker build -f frontend/Dockerfile -t shelfwise/frontend:${IMAGE_TAG} .
          docker save shelfwise/backend:${IMAGE_TAG} | gzip > artifacts/shelfwise-backend-image-${BUILD_NUMBER}.tar.gz
          docker save shelfwise/frontend:${IMAGE_TAG} | gzip > artifacts/shelfwise-frontend-image-${BUILD_NUMBER}.tar.gz
        '''
      }
    }

    stage('Deploy to Minikube') {
      steps {
        sh '''
          docker save shelfwise/backend:${IMAGE_TAG} |
            docker exec -i minikube ctr -n k8s.io images import -
          docker save shelfwise/frontend:${IMAGE_TAG} |
            docker exec -i minikube ctr -n k8s.io images import -

          kubectl apply -k k8s
          kubectl set image deployment/backend \
            backend=shelfwise/backend:${IMAGE_TAG} -n shelfwise
          kubectl set image deployment/frontend \
            frontend=shelfwise/frontend:${IMAGE_TAG} -n shelfwise

          kubectl rollout status deployment/backend -n shelfwise --timeout=180s
          kubectl rollout status deployment/frontend -n shelfwise --timeout=180s
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'artifacts/**/*', fingerprint: true
      deleteDir()
    }
  }
}
