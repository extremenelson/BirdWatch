'use strict';

/** tweets service, load previous tweets and receives subsequent live tweets for given query */
angular.module('birdwatch.services').factory('tweets', function ($http, utils, $location) {
    var tweetFeed;
    
    /** callback function to perform when new tweet(s) arrive */
    var onNewTweets = function (t) {};
    var registerCallback = function (callback) { onNewTweets = callback; };

    /** handle incoming tweets: add to tweets array */
    var addTweet = function (msg) { onNewTweets([utils.formatTweet(JSON.parse(msg.data))]); };

    /** Load previous Tweets, paginated. Recursive function, calls itself with the next chunk to load until
     *  eventually n, the remaining tweets to load, is not larger than 0 any longer. guarantees at least n hits
     *  if available, potentially more if (n % chunkSize != 0) */
    var loadPrev = function (searchString, n, chunkSize, offset) {
        if (n > 0) {
            $http({method: "POST", data: utils.buildQuery(searchString, chunkSize, offset), url: "/tweets/search"})
                .success(function (data) {
                    onNewTweets(data.hits.hits.reverse().map(function (t) { return t._source; }).map(utils.formatTweet));
                    loadPrev(searchString, n - chunkSize, chunkSize, offset + chunkSize);
                }).error(function (data, status, headers, config) { }
            );
        }
    };

    /** Start Listening for Tweets with given query */
    var search = function (queryString, prevSize) {
        if (typeof tweetFeed === 'object') { tweetFeed.close(); }

        var searchString = "*";
        if (queryString.length > 0) {
            searchString = queryString;
            $location.path(searchString);
        }
        else $location.path("");

        tweetFeed = new EventSource("/tweetFeed?q=" + searchString);
        tweetFeed.addEventListener("message", addTweet, false);

        loadPrev(searchString, prevSize, 100, 0);
    };

    return { search: search, registerCallback: registerCallback};
});
