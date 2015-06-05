var http = require('http'),
    httpProxy = require('http-proxy'),
	fs = require('fs');

var port = 8080;

var proxy = httpProxy.createProxyServer({});

var dnsCache = [];

var server = http.createServer(function(req, res) {

	var options = {
		host: 'api.statdns.com',
		port: '80',
		path: '/' + req.headers['host'].replace(":" + port, "") + '/a',
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

                console.log("Intercepted: " + req.url);
				res.write(file, 'binary');
				res.end();

			}

		};
	};

	var checkRequest = function (host) {

		if(req.url.indexOf("/webdav/files/") > -1) {

			fs.readFile(req.url.replace("/webdav/files/", "assets/"), 'binary', readFile(host));

		} else {

			doProxy(host);

		}

	};

	var dnsData = function (dnsResponse) {
		data = JSON.parse(dnsResponse);
		dnsCache.push(data);
		host = data.answer[0].rdata;

		checkRequest(host);
	};

	var dnsCacheSearch = function (callback) {
		found = false;
		dnsCache.forEach(function (item) {
			if (item.answer[0].name === req.headers['host'].replace(":" + port, "") + ".") {
				callback(item);
				found = true;
			}
		});

		if (!found) {
			callback(null);
		}
	};

	var dnsRequest = function (dns) {
		dns.on('data', dnsData);
	};

	searchCallback = function (searchResponse) {

		if (searchResponse === null) {
			http.request(options, dnsRequest).end();
		} else {
			checkRequest(searchResponse.answer[0].rdata);
		}

	};

	dnsCacheSearch(searchCallback);

});

console.log("Proxy live at port 8080");

server.listen(port);