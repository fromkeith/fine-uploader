'use strict';

/** Turns the given source-code into an inline worker.
 * Basically turning the source to string, then wrapping it
 * in a javascript function that we can call to retrieve the blob's url.
 */


const fs = require('fs');
const os = require('os');
const jsStringEscape = require('js-string-escape');

let source = process.argv[2];
let out = process.argv[3];


fs.readFile(source, 'UTF-8', function (err, data) {
    if (err) {
        console.log('workerToInline: failed to read source path');
        os.exit(1);
        return;
    }
    let sourceCode = jsStringEscape(data);

    let outCode = `
        qq.s3.createS3InlineWorkerUrl = function () {
            return URL.createObjectURL(new Blob(["${sourceCode}"], {type: "application/javascript"}));
        };
    `;
    fs.writeFile(out, outCode, function (err) {
        if (err) {
            console.log('workerToInline: failed to write output');
            os.exit(1);
            return;
        }
    });
});
