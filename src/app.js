'use strict';
const fs = require('fs');
const handlebars = require('handlebars');
const moment = require('moment');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const config = {
    "template": "default",
    "json": "data.json",
    "port": 5555,
    "saveImage": false,
    "savePdf": true
};

handlebars.registerHelper('ifObject', function (item, options) {
    if (typeof item === "object") {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

handlebars.registerHelper('ifArray', function (item, options) {
    if (typeof item === Array) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

let typedir = 'saves';
let dir = `./${typedir}/${moment().format('X')}`;
let fullpath = `${dir}/${typedir}`;

if (!fs.existsSync(`./${typedir}/`)) {
    fs.mkdirSync(`./${typedir}/`);
}
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

let templateDirectory = path.join(__dirname, '../', 'templates');
let templateName = config.template;
let data = require(path.join(__dirname, '../', config.json));

if (data) {
    let promise = new Promise((res, rej) => {
        if (!templateExists(templateName)) {
            rej(`Template (${templateName}) does not exist.`);
        }
        let html = getTemplate(templateName, `index.html`);
        let header = "";
        let footer = "";
        if (templateExists(templateName + '/header.html')) {
            header = getTemplate(templateName, 'header.html');
            let headerTemplate = handlebars.compile(header);
            header = headerTemplate(data);
        }
        if (templateExists(templateName + '/footer.html')) {
            footer = getTemplate(templateName, 'footer.html');
            let footerTemplate = handlebars.compile(header);
            footer = footerTemplate(data);
        }
        let template = handlebars.compile(html);
        html = template(data);

        const server = http.createServer((req, res) => res.end(html)).listen(config.port, async () => {

            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.goto(`http://localhost:${config.port}`, {
                waitUntil: 'networkidle0'
            });
            await page.waitFor(500);

            if (config.saveImage) {
                await page.screenshot({
                    path: `${fullpath}.png`,
                    fullPage: true
                });
            }
            if (config.savePdf) {
                await page.pdf({
                    path: `${fullpath}.pdf`,
                    footerTemplate: footer,
                    headerTemplate: header,
                    margin: {
                        top: '55px',
                        bottom: '55px'
                    },
                    format: 'A4'
                });
            }

            await browser.close();
            server.close();
        });
        server.addListener("close", () => {
            return res();
        });
    });

    promise.then(() => {
        console.log("Saved.");
    }).catch(err => {
        console.error("Error...", err);
    });
}

function templateExists(templateName) {
    return fs.existsSync(`${templateDirectory}/${templateName}`);
}

function getTemplate(templateName, filename) {
    return fs.readFileSync(`${templateDirectory}/${templateName}/${filename}`, 'utf8');
}