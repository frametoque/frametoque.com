module.exports = {
  apps: [{
    name: 'frametoque',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '450M',
    node_args: '--max-old-space-size=384',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000
    }
  }]
};
