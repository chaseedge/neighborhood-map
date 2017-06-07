## Synopsis
Project - Neighborhood Map for Udacity's Full Stack Nanodegree Program
Author - Chase Edge

The app takes pizza reviews from Barstool Sports for locations in NYC and maps them. The user can click on a location to get details of the review and the current yelp review too. The user can then filter the reviews in the sidebar.


## API Info

The app pulls in data from Google Maps, Twitter and Yelp. The yelp api requires OAuth, for which I used https://github.com/levbrie/mighty_marks/blob/master/yelp-search-sample.html


## Code Comments

API calls are made through jsonp, as a result, a timeout function was used to catch any errors that may result from the api calls.


## Installation

1. Simply clone the repository to your local machine 
2. Add your Google Map and Yelp API credentials to the app.js file.
3. Open index.html
