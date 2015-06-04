var http = require('http'),
    httpProxy = require('http-proxy'),
	fs = require('fs');

var proxy = httpProxy.createProxyServer({});

var dnsCache = [];

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

                console.log("Intercepted: " + req.url);
				res.write(file, 'binary');
				res.end();

			}

		};
	};

	var checkRequest = function (host) {

		if(req.url.indexOf("/webdav/files/") > -1) {

			fs.readFile(req.url.replace("/webdav/", ""), 'binary', readFile(host));

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
			if (item.answer[0].name === req.headers['host'].replace(":8080", "") + ".") {
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

server.listen(8080);