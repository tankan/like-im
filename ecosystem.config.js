module.exports = {
  "apps": [
    {
      "name": "like-im",
      "script": "./index.mjs",
      "error_file": "./logs/im.err.log",
      "out_file": "./logs/im.out.log",
      "log_date_format": "YYYY-MM-DD HH:mm Z",
      "instances" : "max",
      "exec_mode" : "cluster",
      "watch": false,
      "env": {
        "NODE_ENV": "production"
      }
    }
  ]
}