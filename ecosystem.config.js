module.exports = {

    apps: [
      {
        name          : 'Kapto Main Service',
        script        : 'services/main.js',
        instances     : 'max',
        exec_mode     : 'cluster',
        instance_var  : 'INSTANCE_ID',
        merge_logs    : true,
        //restart_delay : 1000,
        //out_file     : "./logs/main.log",
        env: {
          "NODE_ENV" : "production",
        }
      }
    ]
  };