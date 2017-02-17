/* globals qq, CryptoJS */

/**
 * Manages creation and communication of s3 signature workers.
 */
qq.s3.RequestSignerWorkerManager = function (o) {
    "use strict";
    var worker = null,
        workerPromises = {},
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
            worker = new Worker(workerUrl);
            worker.onerror = function (e) {
                // Prevent the event from bubbling
                e.preventDefault();
                // log the error, and fail any pending promises.
                options.log("Worker encountered an error. Disabling. " + e.message, "warn");
                worker = null;
                var outstandingRequests = Object.keys(workerPromises),
                    i;
                for (i = 0; i < outstandingRequests.length; i++) {
                    workerPromises[outstandingRequests[i]].failure(e);
                    delete workerPromises[outstandingRequests[i]];
                }
            };
            worker.onmessage = function (e) {
                if (!workerPromises[e.data.id]) {
                    options.log("Worker returned a result for an request we dont know about.", "warn");
                    return;
                }
                if (e.data.err) {
                    workerPromises[e.data.id].failure(e.data.err);
                } else {
                    workerPromises[e.data.id].success(e.data.resp);
                }
                delete workerPromises[e.data.id];
            };
        }  catch (ex) {
            // worker is not supported or invalid
            options.log("Worker failed to be created. Defaulting back to main thread processing." + ex, "warn");
            worker = null;
        }
    }
    init();
    /*
        Generates the signuare of the given file.
        @param file the file/slice to generate the signature for.
        @returns a promise or null if we can't generate signatures at all.
    */
    this.generateSignature = function (file) {
        if (!worker) {
            return null;
        }
        var promise = new qq.Promise(),
            task = {file: file, id: qq.getUniqueId()};
        workerPromises[task.id] = promise;
        worker.postMessage(task);
        return promise;
    };
};
