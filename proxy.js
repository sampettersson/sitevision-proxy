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

            if (req.written === true) {
                return;
            }

			if (err) {

				doProxy(host);

			} else {

                req.protocol = req.connection.encrypted ? 'https' : 'http';

                var fullUrl = req.protocol + '://' + req.headers['host'] + req.url;

                loggingTool("Intercepted: " + fullUrl);
                loggingTool("Replaced with: " + filePath);

                req.written = true;
				res.write(file, 'binary');
				res.end();

			}

		};
	};

	var checkRequest = function (host) {

		if(req.url.indexOf("/webdav/files/resources/") > -1 || req.url.indexOf("/webdav/images/resources/") > -1) {

            var filePaths = [
                req.url.split("?")[0].replace("/webdav/files/resources/", "./build/"),
                req.url.split("?")[0].replace("/webdav/images/resources/", "./build/img/")
            ];

            var callback_count = 0;

            filePaths.forEach(function (item, index) {
                fs.readFile(item, function (err, file) {

                    callback_count = callback_count + 1;

                    if (!err) {
                        fs.readFile(item, 'binary', readFile(host, item));
                    } else if (callback_count === filePaths.length) {
                        readFile(host, filePaths[0])(true, null);
                    }

                });
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