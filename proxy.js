var http = require('http'),
    httpProxy = require('http-proxy'),
	fs = require('fs');

var port = 8080;

var proxy = httpProxy.createProxyServer({});

var dnsCache = [];

var loggingTool = function (message) {

    var colors = require('colors');

    var date = new Date();
    var currentHours = date.getHours();
    var currentMinutes = date.getMinutes();
    var currentMilliseconds = date.getMilliseconds();
    currentMilliseconds = String(currentMilliseconds).substring(0, 2);

    var currentTime = currentHours + ":" + currentMinutes + ":" + currentMilliseconds;
    var outputTime = "[" + currentTime.gray + "]";

    console.log(outputTime + " " + message);

};

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

	var readFile = function (host, filePath) {
		return function (err, file) {

			if (err) {

				doProxy(host);

			} else {

                var fullUrl = req.protocol + '://' + req.headers['host'] + req.url;

                loggingTool("Intercepted: " + fullUrl);
                loggingTool("Replaced with: " + filePath);

				res.write(file, 'binary');
				res.end();

			}

		};
	};

	var checkRequest = function (host) {

		if(req.url.indexOf("/webdav/files/") > -1) {

            var filePaths = [
                req.url.replace("/webdav/files/", "./build/"),
                req.url.replace("/webdav/files/", "./lib/"),
                req.url.replace("/webdav/files/", "./assets/")
            ];

            filePaths.forEach(function (item, index) {

                var found = false;

                fs.readFile(item, function (err, file) {

                    if (!err) {
                        found = true;
                        fs.readFile(item, 'binary', readFile(host, item));
                    }

                });

                if (found == false && index == filePaths.length - 1) {
                    readFile(host, filePaths[0])(true, null);
                }

            });

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

loggingTool("Proxy live at port 8080");

server.listen(port);