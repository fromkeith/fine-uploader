/**
 * Goes at the bottom of the S3 worker.
 * Here we define the actual task handling and communication.
 */

function doTask(body, cb) {
    var reader = new FileReader();
    reader.onloadend = function(e) {
        if (e.target.readyState === FileReader.DONE) {
            if (e.target.error) {
                cb(e.target.error);
            }
            else {
                var wordArray = qq.CryptoJS.lib.WordArray.create(e.target.result);
                cb(null, qq.CryptoJS.SHA256(wordArray).toString());
            }
        }
    };
    reader.readAsArrayBuffer(body);
}
onmessage = function (e) {
    doTask(e.data.file, function (err, str) {
        postMessage({err: err, resp: str, id: e.data.id});
    });
};
