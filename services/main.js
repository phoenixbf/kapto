const express = require('express');
const http    = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');
const cors = require('cors');

const API  = require('./api');
const Core = require('./core');

let PORT = 8070;

let app = express();
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', express.static(Core.DIR_PUBLIC));

app.use(cors({
	credentials: true,
	origin: true
}));

Core.init();
API.init( app );

// Proxies
if (Core.conf.proxies){
	for (let p in Core.conf.proxies){
		app.use(p, createProxyMiddleware({ 
			target: "http://localhost:"+Core.conf.proxies[p], 
			pathRewrite: (path, req)=>{
				return path.replace(p+"/", "/");
			},
			changeOrigin: true
		}));
	}
}

http.createServer(app).listen(PORT, ()=>{
	console.log("Kapto is up and running on port: "+PORT);
});