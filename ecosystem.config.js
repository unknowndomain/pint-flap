module.exports = {
	apps : [{
	  name: 'pintflap',
	  script: 'npm run start',
	  instances: 1,
	  autorestart: true,
	  watch: false,
	  max_memory_restart: '1G'
	}]
  };
