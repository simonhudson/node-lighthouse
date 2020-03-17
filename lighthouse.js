'use strict';

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const argv = require('yargs').argv;
const url = require('url');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

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

const getContents = pathStr => {
    const output = fs.readFileSync(pathStr, 'utf8', (err, results) => results);
    return JSON.parse(output);
};

const compareReports = (from, to) => {
    const metricFilter = [
        'first-contentful-paint',
        'first-meaningful-paint',
        'speed-index',
        'estimated-input-latency',
        'total-blocking-time',
        'max-potential-fid',
        'time-to-first-byte',
        'first-cpu-idle',
        'interactive'
    ];

    const calcPercentageDiff = (from, to) => {
        const per = ((to - from) / from) * 100;
        return Math.round(per * 100) / 100;
    };

    const fromAudits = from.audits;
    const toAudits = to.audits;

    for (let auditObj in fromAudits) {
        if (metricFilter.includes(auditObj)) {
            const percentageDiff = calcPercentageDiff(
                fromAudits[auditObj].numericValue,
                toAudits[auditObj].numericValue
            );
            let logColor = '\x1b[37m';
            const log = (() => {
                if (Math.sign(percentageDiff) === 1) {
                    logColor = '\x1b[31m';
                    return `${percentageDiff + '%'} slower`;
                } else if (Math.sign(percentageDiff) === 0) {
                    return 'unchanged';
                } else {
                    logColor = '\x1b[32m';
                    return `${percentageDiff + '%'} faster`;
                }
            })();
            console.log(logColor, `${fromAudits[auditObj].title} is ${log}`);
        }
    }
};

if (!argv.env) {
    console.log('No env argument passed')
} else {
    if (argv.from && argv.to) {
        compareReports(
            getContents(argv.from + '.json'),
            getContents(argv.to + '.json')
        );
    } else if (envUrl[argv.env]) {

        const url = envUrl[argv.env];
        const urlObj = new URL(url);
        const reportsRootDir = 'reports';

        if (!fs.existsSync(reportsRootDir)) fs.mkdirSync(reportsRootDir);
        let dirName = `${reportsRootDir}/${argv.env}`;
        if (urlObj.pathname !== '/') dirName = dirName + urlObj.pathname.replace(/\//g, '_');
        if (!fs.existsSync(dirName)) fs.mkdirSync(dirName);

        launchChromeAndRunLighthouse(url).then(results => {
            const prevReports = glob(`${dirName}/*.json`, { sync: true });
            if (prevReports.length) {
                let dates = [];
                for (let report in prevReports) {
                    dates.push(
                        new Date(path.parse(prevReports[report]).name.replace(/_/g, ':'))
                    );
                }
                const max = dates.reduce((a, b) => Math.max(a, b));
                const recentReport = new Date(max).toISOString();
                const recentReportContents = getContents(dirName + '/' + recentReport.replace(/:/g, '_') + '.json');
                compareReports(recentReportContents, results.js);
            }
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
