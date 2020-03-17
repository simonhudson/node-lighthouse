'use strict';

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const launchChrome = url => {
    chromeLauncher.launch({
        startingUrl: url
    });
};

launchChrome('https://creditmatcher.experian.co.uk')