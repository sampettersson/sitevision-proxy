var http = require('http'),
    httpProxy = require('http-proxy'),
	fs = require('fs');

var gulp = require("gulp");
require('./gulpfile.js');

gulp.start('sass');

var proxy = httpProxy.createProxyServer({});

var server = http.createServer(function(req, res) {

	var options = {
		host: 'api.statdns.com',
		port: '80',
		path: '/' + req.headers['host'].replace(":8080", "") + '/a',
		method: 'GET'
	};

	var doProxy = function (host) {

		proxy.web(req, res, {
			target: 'http://' + host + '/'
		});

	};

	var readFile = function (host) {
		return function (err, file) {

			if (err) {

				doProxy(host);

			} else {

				res.write(file, 'binary');
				res.end();

			}

		};
	};

	var dnsData = function (dnsResponse) {
		data = JSON.parse(dnsResponse);
		host = data.answer[0].rdata;

		if(req.url.indexOf("/webdav/files/") > -1) {

			fs.readFile(req.url.replace("/webdav/", ""), 'binary', readFile(host));

		} else {

			doProxy(host);

		}

	};

	var dnsRequest = function (dns) {
		dns.on('data', dnsData);
	};

	http.request(options, dnsRequest).end();

});

console.log("Proxy live at port 8080");

server.listen(8080);