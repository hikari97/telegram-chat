module.exports = {
  apps: [
    {
      name: "telegram-chat-forwarder",
      script: "src/forwarder.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
