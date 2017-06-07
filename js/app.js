/* model is located in models/pizzaLocations.js

follows this schema
var model = {
    locations: [{
        name: "Little Italy Pizza",
        address: "2 E 33rd St, New York, NY 10016",
        bsLink: "http://www.barstoolsports.com/boston/barstool-pizza-review/",
        twLink: "https://twitter.com/stoolpresidente/status/776117163056885760",
        bsRating: 6.4
    },

*/

var MyApp = window.MyApp || {};

(function() {
    'use strict'; // turn on Strict Mode

    var map;

    MyApp.flagMapError = function() {
        viewModel.mapError(true);
        viewModel.mapErrorMsg("Error in retrieving data from Google Maps");
        ko.applyBindings(viewModel);
    };


    MyApp.mapInit = function() {
        var mapElem = document.getElementById('map');
        var mapParams = {
            center: {
                lat: 40.7463979,
                lng: -73.9922911
            },
            zoom: 15,
            disableDefaultUI: true,
            styles: [{
                featureType: "poi",
                elementType: "labels",
                stylers: [{
                    visibility: "off"
                }]
            }, {
                featureType: "transit",
                elementType: "labels",
                stylers: [{
                    visibility: "off"
                }]
            }]
        };

        map = new google.maps.Map(mapElem, mapParams);

        // add get coordinates and markers
        model.locations.forEach(function (x) {
            var loc = new Location(x);
            addGeoData(loc);

            // create list of all locations
            viewModel.locationList.push(loc);

            // create default viewList
            viewModel.viewList.push(loc);
        });

        ko.applyBindings(viewModel);
    };

    // gets coordinates from the location addresses, adds markers and creates flags for any errors
    function addGeoData(location) {
        var urlBase = "https://maps.googleapis.com/maps/api/geocode/json?&address=";
        var apiKey = "add your api key here"
        var url = urlBase + location.address() + "&key=" + apiKey;

        $.getJSON(url).done(function (data) {
            if (data.status == "OK") {
                location.coords = data.results[0].geometry.location;
                addMarker(location);
            } else {
                console.log("Google Maps error " + data.status);
                MyApp.flagMapError();
            }
        }).fail(function (data) {
            console.log(data);
            MyApp.flagMapError();
        });
    }

    // function to add markers to map
    function addMarker(location) {
        var marker = new google.maps.Marker({
            position: location.coords,
            icon: "img/pizza.ico",
            title: location.name(),
            map: map
        });

        marker.addListener('click', function () {

            // on click it brings up a modal with twitter and yelp info
            viewModel.getOtherInfo(location);
            map.setCenter(marker.getPosition());
        });

        // add marker to location
        location.marker = marker;
    }


    // authorizes and builds api params
    function yelpParams(name, coords) {

        // Yelp API
        var auth = {
            consumerKey: "add your yelp creditianals",
            consumerSecret: " ",
            accessToken: " ",
            accessTokenSecret: " ",
            serviceProvider: {
                signatureMethod: "HMAC-SHA1"
            }
        };

        var accessor = {
            consumerSecret: auth.consumerSecret,
            tokenSecret: auth.accessTokenSecret
        };

        var parameters = [];
        parameters.push(['ll', coords.lat + ',' + coords.lng]);
        parameters.push(['term', name]);
        parameters.push(['limit', 1]); // limit results to 1
        parameters.push(['sort', 0]); // 0 = best match, 1 = distance, 2 = highest rated
        parameters.push(['radius_filter', 100]); // restaurants within 100m
        parameters.push(['category_filter', 'restaurants']);
        parameters.push(['callback', 'cb']);
        parameters.push(['oauth_consumer_key', auth.consumerKey]);
        parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
        parameters.push(['oauth_token', auth.accessToken]);
        parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

        var message = {
            'action': 'http://api.yelp.com/v2/search',
            'method': 'GET',
            'parameters': parameters
        };

        // oauth is in external file
        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);
        var parameterMap = OAuth.getParameterMap(message.parameters);
        parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature);

        return parameterMap;
    }

    function getYelp(name, coords, successCB, errorCB) {
        $.ajax({
            url: "http://api.yelp.com/v2/search",
            data: yelpParams(name, coords),
            cache: true,
            dataType: 'jsonp'
        }).done(successCB)
        .fail(function(jqXHR){
            console.log(jqXHR);
            errorCB("Sorry, there was an error retrieving data from Yelp. Status Code: " + jqXHR.status);
        });
    }

    function getTweet(twLink, successCB, errorCB) {
        var tweetId = twLink.split("/").pop();
        var link = 'https://api.twitter.com/1.1/statuses/oembed.json?id=' + tweetId + '&omit_script=true';

        $.ajax({
            url: link,
            cache: true,
            dataType: 'jsonp',
        }).done(successCB)
        .fail(function(jqXHR){
            console.log(jqXHR);
            errorCB("Sorry, there was an error retrieving data from Twitter. Status Code: " + jqXHR.status);
        });
    }


    var Location = function (data) {
        this.name = ko.observable(data.name);
        this.address = ko.observable(data.address);
        this.bsLink = ko.observable(data.bsLink);
        this.twLink = ko.observable(data.twLink);
        this.bsRating = ko.observable(data.bsRating);
        this.yelpRating = ko.observable(data.yelpRating);
        this.yelpLink = ko.observable(data.yelpLink);
        this.tweet = ko.observable();
        this.errorMsg = ko.observable("");
    };


    var viewModel = {
        locationList: [],
        mapError: ko.observable(false),
        mapErrorMsg: ko.observable(),
        viewList: ko.observableArray(),
        setViewList: function (minRating, maxRating) {

            // clear out viewList
            this.viewList([]);

            for (var i = 0; i < this.locationList.length; i++) {
                var location = this.locationList[i];
                if (location.bsRating() >= minRating && location.bsRating() < maxRating) {
                    this.viewList.push(location);

                    // make Marker visible
                    location.marker.setVisible(true);
                } else {
                    location.marker.setVisible(false);
                }
            }
        },

        // hides the popup modal by default
        showModal: ko.observable(false),
        curLoc: ko.observable(),
        setCurLoc: function (location) {
            var self = this;

            // Make marker bounce once clicked
            location.marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(function () {
                location.marker.setAnimation(null);
            }, 1400);

            self.showModal(true);
            self.curLoc(location);
        },
        setErrorMsg: function (location, error) {
            if (location.errorMsg() !== "") {
                error = location.errorMsg() + "<br>" + error;
                location.errorMsg(error);
            } else {
                location.errorMsg(error);
            }
        },

        // gets Yelp and Twitter info once a location is clicked
        getOtherInfo: function (location) {
            var self = this;
            getYelp(
                location.name(),
                location.coords,

                //success callback
                function (data) {

                    //make it a base of 10 to match barstool rating
                    var rating = (Number(data.businesses["0"].rating) * 2).toFixed(1);
                    var link = "https://www.yelp.com/biz/" + data.businesses["0"].id;
                    if (rating) {
                        location.yelpRating(rating);
                    }
                    if (link) {
                        location.yelpLink(link);
                    }
                },

                //error callback
                function (error) {
                    self.setErrorMsg(location, error);
                }
            );

            getTweet(
                location.twLink(),

                //success callback
                function (response) {
                    location.tweet(response.html);

                    //twitter widget needs to rescan the DOM to apply format
                    twttr.widgets.load(document.getElementById("tweet"));
                },

                //error callback
                function (error) {
                    self.setErrorMsg(location, error);
                }
            );

            viewModel.setCurLoc(location);
        }
    };

    // binding for boostrap modal, allows it to toggle visibility
    ko.bindingHandlers.modal = {
        init: function (element, valueAccessor) {
            $(element).modal({show: false});

            var value = valueAccessor();
            if (ko.isObservable(value)) {
                $(element).on('hide.bs.modal', function () {
                    value(false);
                    viewModel.showModal(false);
                });
            }
        },
        update: function (element, valueAccessor) {
            var value = valueAccessor();
            if (ko.utils.unwrapObservable(value)) {
                $(element).modal('show');
            } else {
                $(element).modal('hide');
            }
        }
    };

}()); // end of file
