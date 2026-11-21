module.exports = {
    apps: [
        {
            name: "vet-clinic-app",
            script: "dist/index.cjs",
            instances: "max",          // Use all available CPU cores
            exec_mode: "cluster",      // Cluster mode for multi-core support
            autorestart: true,
            watch: false,
            max_memory_restart: "500M", // Restart individual worker if it exceeds 500MB
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            env: {
                NODE_ENV: "production",
                PORT: 5000,
            },
        },
    ],
};
