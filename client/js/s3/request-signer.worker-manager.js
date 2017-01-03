/* globals qq, CryptoJS */



qq.s3.RequestSignerWorkerManager = function (o) {
    "use strict";
    var _worker = null,
        _workerPromises = {},
        options = {
            workerUrl: null,
        };
    qq.extend(options, o, true);


    function init() {
        var workerUrl;
        switch (typeof options.workerUrl) {
        case "string":
            if (options.workerUrl.length > 0) {
                workerUrl = options.workerUrl;
            } else {
                if (!qq.s3.worker) {
                    qq.Error("Missing inline s3 worker");
                    return;
                }
                workerUrl = qq.s3.worker();
            }
            console.log('use string worker');
            break;
        case "function":
            workerUrl = options.workerUrl();
            console.log('use function worker');
            break;
        default:
            break;
        }
        if (!workerUrl) {
            console.log('no worker to create');
            return;
        }
        try {
            _worker = new Worker(workerUrl);
            _worker.onmessage = function (e) {
                console.log('worker got response', e.data);
                if (!_workerPromises[e.data.id]) {
                    options.log("Worker returned a result for an request we dont know about.");
                    return;
                }
                if (e.data.err) {
                    _workerPromises[e.data.id].failure(e.data.err);
                } else {
                    console.log('called success');
                    _workerPromises[e.data.id].success(e.data.resp);
                }
                delete _workerPromises[e.data.id];
            };
            console.log('worker created');
        }  catch (ex) {
            console.log('failed to create worker');
            // worker is not supported or invalid
            options.log("Worker failed to be created. Defaulting back to main thread processing.", ex);
            _worker = null;
        }
    }
    init();
    /*
        Generates the signuare of the given file.
        @param file the file/slice to generate the signature for.
        @returns a promise or null if we can't generate signatures at all.
    */
    this.generateSignature = function (file) {
        console.log('ganerate Signature Please');
        if (!_worker) {
            return null;
        }
        console.log('posting to taks to sign');
        var promise = new qq.Promise(),
            task = {file: file, id: qq.getUniqueId()};
        _workerPromises[task.id] = promise;
        _worker.postMessage(task);
        return promise;
    };
};
