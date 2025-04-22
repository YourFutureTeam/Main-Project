module.exports = {
  apps: [
    {
      name: 'yourfuture-backend',
      script: 'main.py',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'sqlite:///yourfuture_app.db'
      }
    },
    {
      name: 'yourfuture-static',
      script: 'npx',
      args: 'serve -s build -l 3000',
      cwd: '/Users/mac/Desktop/Your Future/crypto-project',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};