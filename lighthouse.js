'use strict';

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const argv = require('yargs').argv;

const envUrl = {
    'local': 'https://localhost:8080',
    'int': 'https://c2.int.experiancs.co.uk',
    'stg': 'https://c2.stg.experiancs.co.uk',
    'prod': 'https://creditmatcher.experian.co.uk'
};

const launchChromeAndRunLighthouse = url => {
    console.log(`Running Lighthouse on ${url}`);
    return chromeLauncher.launch().then(chrome => {
        const opts = {
            port: chrome.port
        };
        return lighthouse(url, opts).then(results => {
            return chrome.kill().then(() => results.report);
        });
    });
};

if (!argv.env) {
    console.log('No env argument passed')
} else {
    const url = envUrl[argv.env];
    if (url) {
        launchChromeAndRunLighthouse(url).then(results => {
            console.log(results);
        });
    } else {
        console.log(`No environment URL found for ${argv.env}`)
    }
}
