/* globals qq, CryptoJS */



qq.s3.RequestSignerWorkerManager = function (o) {
    "use strict";
    var _worker = null,
        _workerPromises = {},
        options = {
            workerUrl: null,
            log: function(str, level) {}
        };
    qq.extend(options, o, true);


    function init() {
        var workerUrl;
        switch (typeof options.workerUrl) {
        case "string":
            if (options.workerUrl !== "inline") {
                workerUrl = options.workerUrl;
            } else {
                if (!qq.s3.createS3InlineWorkerUrl) {
                    qq.Error("Missing inline s3 worker");
                    return;
                }
                workerUrl = qq.s3.createS3InlineWorkerUrl();
            }
            break;
        case "function":
            workerUrl = options.workerUrl();
            break;
        default:
            break;
        }
        if (!workerUrl) {
            return;
        }
        try {
            _worker = new Worker(workerUrl);
            _worker.onerror = function (e) {
                // Prevent the event from bubbling
                e.preventDefault();
                // log the error, and fail any pending promises.
                options.log("Worker encountered an error. Disabling. " + e.message, "warn");
                _worker = null;
                var outstandingRequests = Object.keys(_workerPromises),
                    i;
                for (i = 0; i < outstandingRequests.length; i++) {
                    _workerPromises[outstandingRequests[i]].failure(e);
                    delete _workerPromises[outstandingRequests[i]];
                }
            };
            _worker.onmessage = function (e) {
                if (!_workerPromises[e.data.id]) {
                    options.log("Worker returned a result for an request we dont know about.");
                    return;
                }
                if (e.data.err) {
                    _workerPromises[e.data.id].failure(e.data.err);
                } else {
                    _workerPromises[e.data.id].success(e.data.resp);
                }
                delete _workerPromises[e.data.id];
            };
        }  catch (ex) {
            // worker is not supported or invalid
            options.log("Worker failed to be created. Defaulting back to main thread processing." + ex, "warn");
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
        if (!_worker) {
            return null;
        }
        var promise = new qq.Promise(),
            task = {file: file, id: qq.getUniqueId()};
        _workerPromises[task.id] = promise;
        _worker.postMessage(task);
        return promise;
    };
};
