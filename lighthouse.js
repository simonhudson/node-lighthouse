'use strict';

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const argv = require('yargs').argv;
const url = require('url');
const fs = require('fs');

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
            return chrome.kill().then(() => {
                return {
                    js: results.lhr,
                    json: results.report
                };
            });
        });
    });
};

if (!argv.env) {
    console.log('No env argument passed')
} else {
    const url = envUrl[argv.env];
    if (url) {
        const urlObj = new URL(url);
        const reportsRootDir = 'reports';
        if (!fs.existsSync(reportsRootDir)) fs.mkdirSync(reportsRootDir);
        let dirName = `${reportsRootDir}/${urlObj.host.replace('www.','')}`;
        if (urlObj.pathname !== '/') dirName = dirName + urlObj.pathname.replace(/\//g, '_');
        if (!fs.existsSync(dirName)) fs.mkdirSync(dirName);
        launchChromeAndRunLighthouse(url).then(results => {
            fs.writeFile(
                `${dirName}/${results.js['fetchTime'].replace(/:/g, '_')}.json`,
                results.json,
                err => {
                  if (err) throw err;
                }
              );
        });
    } else {
        console.log(`No environment URL found for ${argv.env}`)
    }
}
