/// <reference path="angular.d.ts" />
/// <reference path="angular-route.d.ts" />
/// <reference path="angular-sanitize.d.ts" />
/// <reference path="bootstrap.d.ts" />
/// <reference path="moment.d.ts" />
/// <reference path="moment-duration-format.d.ts" />
/// <reference path="d3.d.ts" />
/// <reference path="underscore.d.ts" />

var bosunApp = angular.module('bosunApp', [
	'ngRoute',
	'bosunControllers',
	'mgcrea.ngStrap',
	'ngSanitize',
	'ui.ace',
]);

bosunApp.config(['$routeProvider', '$locationProvider', '$httpProvider', function($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider, $httpProvider: ng.IHttpProvider) {
	$locationProvider.html5Mode(true);
	$routeProvider.
		when('/', {
			title: 'Dashboard',
			templateUrl: 'partials/dashboard.html',
			controller: 'DashboardCtrl',
		}).
		when('/items', {
			title: 'Items',
			templateUrl: 'partials/items.html',
			controller: 'ItemsCtrl',
		}).
		when('/expr', {
			title: 'Expression',
			templateUrl: 'partials/expr.html',
			controller: 'ExprCtrl',
		}).
		when('/graph', {
			title: 'Graph',
			templateUrl: 'partials/graph.html',
			controller: 'GraphCtrl',
		}).
		when('/host', {
			title: 'Host View',
			templateUrl: 'partials/host.html',
			controller: 'HostCtrl',
			reloadOnSearch: false,
		}).
		when('/silence', {
			title: 'Silence',
			templateUrl: 'partials/silence.html',
			controller: 'SilenceCtrl',
		}).
		when('/config', {
			title: 'Configuration',
			templateUrl: 'partials/config.html',
			controller: 'ConfigCtrl',
			reloadOnSearch: false,
		}).
		when('/action', {
			title: 'Action',
			templateUrl: 'partials/action.html',
			controller: 'ActionCtrl',
		}).
		when('/history', {
			title: 'Alert History',
			templateUrl: 'partials/history.html',
			controller: 'HistoryCtrl',
		}).
		when('/put', {
			title: 'Data Entry',
			templateUrl: 'partials/put.html',
			controller: 'PutCtrl',
		}).
		when('/incident', {
			title: 'Incident',
			templateUrl: 'partials/incident.html',
			controller: 'IncidentCtrl',
		}).
		otherwise({
			redirectTo: '/',
		});
	$httpProvider.interceptors.push(function($q) {
		return {
			'request': function(config) {
				config.headers['X-Miniprofiler'] = 'true';
				return config;
			},
		};
	});
}]);

interface IRootScope extends ng.IScope {
	title: string;
	shortlink: boolean;
}

bosunApp.run(['$location', '$rootScope', function($location: ng.ILocationService, $rootScope: IRootScope) {
	$rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
		$rootScope.title = current.$$route.title;
		$rootScope.shortlink = false;
	});
}]);

var bosunControllers = angular.module('bosunControllers', []);

interface RootScope extends ng.IScope {
	setKey: (key: string, value: any) => void;
	getKey: (key: string) => any;
}

interface IBosunScope extends RootScope {
	active: (v: string) => any;
	json: (v: any) => string;
	btoa: (v: any) => string;
	encode: (v: string) => string;
	panelClass: (v: string) => string;
	timeanddate: number[];
	schedule: any;
	req_from_m: (m: string) => Request;
	refresh: (filter: string) => any;
	animate: () => any;
	stop: (all?: boolean) => any;
	shorten: () => any;
	shortlink: any;
	values: any;
}

bosunControllers.controller('BosunCtrl', ['$scope', '$route', '$http', '$q', '$rootScope', function($scope: IBosunScope, $route: ng.route.IRouteService, $http: ng.IHttpService, $q: ng.IQService, $rootScope: IRootScope) {
	$scope.$on('$routeChangeSuccess', function(event, current, previous) {
		$scope.stop(true);
	});
	$scope.active = (v: string) => {
		if (!$route.current) {
			return null;
		}
		if ($route.current.loadedTemplateUrl == 'partials/' + v + '.html') {
			return { active: true };
		}
		return null;
	};
	$scope.json = (v: any) => {
		return JSON.stringify(v, null, '  ');
	};
	$scope.btoa = (v: any) => {
		return encodeURIComponent(btoa(v));
	};
	$scope.encode = (v: string) => {
		return encodeURIComponent(v);
	};
	$scope.req_from_m = (m: string) => {
		var r = new Request();
		var q = new Query();
		q.metric = m;
		r.queries.push(q);
		return r;
	};
	$scope.panelClass = (status: string, prefix = "panel-") => {
		switch (status) {
			case "critical": return prefix + "danger";
			case "unknown": return prefix + "info";
			case "warning": return prefix + "warning";
			case "normal": return prefix + "success";
			case "error": return prefix + "danger";
			default: return prefix + "default";
		}
	};
	$scope.values = {};
	$scope.setKey = (key: string, value: any) => {
		if (value === undefined) {
			delete $scope.values[key];
		} else {
			$scope.values[key] = value;
		}
	};
	$scope.getKey = (key: string) => {
		return $scope.values[key];
	};
	var scheduleFilter: string;
	$scope.refresh = (filter: string) => {
		var d = $q.defer();
		scheduleFilter = filter;
		$scope.animate();
		var p = $http.get('/api/alerts?filter=' + encodeURIComponent(filter || ""))
			.success(data => {
				$scope.schedule = data;
				$scope.timeanddate = data.TimeAndDate;
				d.resolve();
			})
			.error(err => {
				d.reject(err);
			});
		p.finally($scope.stop);
		return d.promise;
	};
	var sz = 30;
	var orig = 700;
	var light = '#4ba2d9';
	var dark = '#1f5296';
	var med = '#356eb6';
	var mult = sz / orig;
	var bgrad = 25 * mult;
	var circles = [
		[150, 150, dark],
		[550, 150, dark],
		[150, 550, light],
		[550, 550, light],
	];
	var svg = d3.select('#logo')
		.append('svg')
		.attr('height', sz)
		.attr('width', sz);
	svg.selectAll('rect.bg')
		.data([[0, light], [sz/2, dark]])
		.enter()
		.append('rect')
		.attr('class', 'bg')
		.attr('width', sz)
		.attr('height', sz / 2)
		.attr('rx', bgrad)
		.attr('ry', bgrad)
		.attr('fill', (d: any) => { return d[1]; })
		.attr('y', (d: any) => { return d[0]; });
	svg.selectAll('path.diamond')
		.data([150, 550])
		.enter()
		.append('path')
		.attr('d', (d: any) => {
			var s = 'M ' + d * mult + ' ' + 150 * mult;
			var w = 200 * mult;
			s += ' l ' + w + ' ' + w;
			s += ' l ' + -w + ' ' + w;
			s += ' l ' + -w + ' ' + -w + ' Z';
			return s;
		})
		.attr('fill', med)
		.attr('stroke', 'white')
		.attr('stroke-width', 15 * mult);
	svg.selectAll('rect.white')
		.data([150, 350, 550])
		.enter()
		.append('rect')
		.attr('class', 'white')
		.attr('width', .5)
		.attr('height', '100%')
		.attr('fill', 'white')
		.attr('x', (d: any) => { return d * mult; });
	svg.selectAll('circle')
		.data(circles)
		.enter()
		.append('circle')
		.attr('cx', (d: any) => { return d[0] * mult; })
		.attr('cy', (d: any) => { return d[1] * mult; })
		.attr('r', 62.5 * mult)
		.attr('fill', (d: any) => { return d[2]; })
		.attr('stroke', 'white')
		.attr('stroke-width', 25 * mult);
	var transitionDuration = 750;
	var animateCount = 0;
	$scope.animate = () => {
		animateCount++;
		if (animateCount == 1) {
			doAnimate();
		}
	};
	function doAnimate() {
		if (!animateCount) {
			return;
		}
		d3.shuffle(circles);
		svg.selectAll('circle')
			.data(circles, (d: any, i: any) => { return i; })
			.transition()
			.duration(transitionDuration)
			.attr('cx', (d: any) => { return d[0] * mult; })
			.attr('cy', (d: any) => { return d[1] * mult; })
			.attr('fill', (d: any) => { return d[2]; });
		setTimeout(doAnimate, transitionDuration);
	}
	$scope.stop = (all = false) => {
		if (all) {
			animateCount = 0;
		} else if (animateCount > 0) {
			animateCount--;
		}
	};
	var short: any= $('#shortlink')[0];
	$scope.shorten = () => {
		$http.get('/api/shorten').success(data => {
			if (data.id) {
				short.value = data.id;
				$rootScope.shortlink = true;
				setTimeout(() => {
					short.setSelectionRange(0, data.id.length);
				});
			}
		});
	};
}]);

var tsdbDateFormat = 'YYYY/MM/DD-HH:mm:ss';

interface MomentStatic {
	defaultFormat: string;
}

moment.defaultFormat = tsdbDateFormat;

moment.locale('en', {
	relativeTime: {
		future: "in %s",
		past: "%s-ago",
		s: "%ds",
		m: "%dm",
		mm: "%dm",
		h: "%dh",
		hh: "%dh",
		d: "%dd",
		dd: "%dd",
		M: "%dn",
		MM: "%dn",
		y: "%dy",
		yy: "%dy"
	},
});

// From http://www.quirksmode.org/js/cookies.html

declare function escape(string: string): string;

declare function unescape(string: string): string;

interface Date {
	toGMTString(): string;
}

function createCookie(name, value, days) {
	var expires;

	if (days) {
		var date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = "; expires=" + date.toGMTString();
	} else {
		expires = "";
	}
	document.cookie = escape(name) + "=" + escape(value) + expires + "; path=/";
}

function readCookie(name) {
	var nameEQ = escape(name) + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) === ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0) return unescape(c.substring(nameEQ.length, c.length));
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name, "", -1);
}

function getUser() {
	return readCookie('action-user');
}

function setUser(name) {
	createCookie('action-user', name, 1000);
}

// from: http://stackoverflow.com/a/15267754/864236

bosunApp.filter('reverse', function() {
	return function(items) {
		if (!angular.isArray(items)) {
			return [];
		}
		return items.slice().reverse();
	};
});
