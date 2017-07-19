/* globals describe, beforeEach, $fixture, qq, assert, it, qqtest, helpme, purl, Q, timemachine */
describe("S3 serverless upload tests", function() {
    "use strict";

    if (qqtest.canDownloadFileAsBlob) {
        describe("no-server S3 upload tests", function() {

            var fileTestHelper = helpme.setupFileTests(),
                testS3Endpoint = "https://mytestbucket.s3.amazonaws.com",
                testAccessKey = "testAccessKey",
                testSecretKey = "testSecretKey",
                testSessionToken = "testSessionToken";

            describe("v4 signatures", function() {

                it("test simple upload with only mandatory credentials specified as options", function(done) {
                    var testExpiration = new Date(Date.now() + 10000),
                        uploader = new qq.s3.FineUploaderBasic({
                            request: {
                                endpoint: testS3Endpoint
                            },
                            signature: {
                                version: 4
                            },
                            credentials: {
                                accessKey: testAccessKey,
                                secretKey: testSecretKey,
                                expiration: testExpiration
                            }
                        });

                    qqtest.downloadFileAsBlob("up.jpg", "image/jpeg").then(function (blob) {
                        var request, requestParams;

                        fileTestHelper.mockXhr();
                        uploader.addFiles({name: "test", blob: blob});

                        assert.equal(fileTestHelper.getRequests().length, 1, "Wrong # of requests");

                        request = fileTestHelper.getRequests()[0];
                        requestParams = request.requestBody.fields;

                        assert.equal(request.url, testS3Endpoint);
                        assert.equal(request.method, "POST");

                        assert.equal(requestParams["Content-Type"], "image/jpeg");
                        assert.equal(requestParams.success_action_status, 200);
                        assert.equal(requestParams[qq.s3.util.SESSION_TOKEN_PARAM_NAME], null);
                        assert.equal(requestParams["x-amz-storage-class"], null);
                        assert.equal(requestParams["x-amz-meta-qqfilename"], "test");
                        assert.equal(requestParams.key, uploader.getKey(0));
                        assert.equal(requestParams.acl, "private");
                        assert.ok(requestParams.file);

                        assert.equal(requestParams["x-amz-algorithm"], "AWS4-HMAC-SHA256");
                        assert.ok(new RegExp(testAccessKey + "\\/\\d{8}\\/us-east-1\\/s3\\/aws4_request").test(requestParams["x-amz-credential"]));
                        assert.ok(requestParams["x-amz-date"]);
                        assert.ok(requestParams.policy);

                        done();
                    });
                });

                describe("worker signature", function() {
                    var chunkAnswers = [
                        {
                            expect: {
                                headers: {
                                    "x-amz-acl": "private",
                                    "x-amz-meta-qqfilename": "test",
                                    "x-amz-date": "20170103T051259Z",
                                    "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                                    "Content-Type": "image/jpeg;charset=utf-8",
                                    Authorization: "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-acl;x-amz-content-sha256;x-amz-date;x-amz-meta-qqfilename,Signature=14fdc2d6a00d17df9567be47a31ca095b80524aeb8e79f3053af043015974430"
                                }
                            },
                            response: {
                                body: "<UploadId>123</UploadId>"
                            }
                        },
                        {
                            expect: {
                                headers: {
                                    "x-amz-date": "20170103T051259Z",
                                    "x-amz-content-sha256": "f0e8f719522f251f70867928d11d65bcbf411bb90a6b179f59615034deacdef4",
                                    Authorization: "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=a877f0f446fc54b72c39d9b880feb835b2067ae44fd88aa06a6ccaef3926e450",
                                    "Content-Type": "text/plain;charset=utf-8"
                                }
                            },
                            response: {
                                headers: {
                                    ETag: "123"
                                }
                            }
                        },
                        {
                            expect: {
                                headers: {
                                    "x-amz-date": "20170103T051259Z",
                                    "x-amz-content-sha256": "f7cde1a6dc195915c61cb2ecbbd059568fd62ae69b3deec8bb9378d58fb962e1",
                                    Authorization: "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=4f27d48c111d977828386fbb68962d9b5ee5693330d21b72bea89c161229b79e",
                                    "Content-Type": "text/plain;charset=utf-8"
                                }
                            },
                            response: {
                                headers: {
                                    ETag: "124"
                                }
                            }
                        },
                        {
                            expect: {
                                headers: {
                                    "x-amz-date": "20170103T051259Z",
                                    "x-amz-content-sha256": "cb132c33557875745102c2b390aac7dcb59ba6f0df972db59aac6bf97c11f195",
                                    Authorization: "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=2b66885e1ce095e841d306720e6990bc94871101db301b7e0ea642bc88f8f1f1",
                                    "Content-Type": "text/plain;charset=utf-8"
                                }
                            },
                            response: {
                                headers: {
                                    ETag: "125"
                                }
                            }
                        },
                        {
                            expect: {
                                headers: {
                                    "x-amz-date": "20170103T051259Z",
                                    "x-amz-content-sha256": "c560b4f8b54d541e32b42a423ccbb1b43b298e9e0deee5c2c09d1e40ceb70a0b",
                                    Authorization: "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=9925d724d5af0f9ac6ede5a32519d98c2e3034e2fff81f01cb0641bd312b6ee4",
                                    "Content-Type": "text/plain;charset=utf-8"
                                }
                            },
                            response: {
                                headers: {
                                    ETag: "126"
                                }
                            }
                        },
                        {
                            expect: {
                                headers: {
                                    "x-amz-date": "20170103T051259Z",
                                    "x-amz-content-sha256": "065af8ce8639945de4edfed2f9f08a559e4916ff67b96aeaa348ab6dc2bbc9c5",
                                    Authorization: "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=4b51bb95b32b33b19ede316192fa5f176e2397e543962f287b4ea6ab217ec9ea",
                                    "Content-Type": "application/xml;charset=utf-8"
                                },
                                body: "<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>123</ETag></Part><Part><PartNumber>2</PartNumber><ETag>124</ETag></Part><Part><PartNumber>3</PartNumber><ETag>125</ETag></Part><Part><PartNumber>4</PartNumber><ETag>126</ETag></Part></CompleteMultipartUpload>"
                            },
                            response: {
                                headers: {
                                    ETag: "127"
                                },
                                body: "<CompleteMultipartUploadResult><Bucket>mytestbucket</Bucket><Key>test-key</Key></CompleteMultipartUploadResult>"
                            }
                        }
                    ];
                    function doTest(uploader, answers) {
                        function handleChunk(which) {
                            return function () {
                                if (which >= answers.length) {
                                    return;
                                }
                                var request = fileTestHelper.getRequests()[which];
                                var checkHeaders = Object.keys(answers[which].expect.headers);
                                for (var i = 0; i < checkHeaders.length; i++) {
                                    assert.equal(request.requestHeaders[checkHeaders[i]], answers[which].expect.headers[checkHeaders[i]]);
                                }
                                if (answers[which].expect.body) {
                                    assert.equal(request.requestBody, answers[which].expect.body);
                                }
                                if (answers[which].response) {
                                    request.respond(200, answers[which].response.headers, answers[which].response.body);
                                }
                                setTimeout(handleChunk(which + 1), 100);
                            };
                        }
                        qqtest.downloadFileAsBlob("up.jpg", "image/jpeg").then(function (blob) {
                            var request, requestParams;

                            fileTestHelper.mockXhr();
                            uploader.addFiles({name: "test", blob: blob});
                            handleChunk(0)();
                        });
                    }
                    it("test simple time-locked upload using default worker to sign", function(done) {
                        // we need to lock the time, so our signature is constant
                        timemachine.config({
                            timestamp: 1483420379000 //'January 03, 2017 00:12:59'
                        });
                        var testExpiration = new Date(Date.now() + 10000),
                            uploader = new qq.s3.FineUploaderBasic({
                                request: {
                                    endpoint: testS3Endpoint
                                },
                                signature: {
                                    version: 4,
                                    workerUrl: "inline"
                                },
                                objectProperties: {
                                    key: function () {
                                        return "test-key";
                                    }
                                },
                                chunking: {
                                    enabled: true,
                                    partSize: 1024
                                },
                                credentials: {
                                    accessKey: testAccessKey,
                                    secretKey: testSecretKey,
                                    expiration: testExpiration
                                },
                                callbacks: {
                                    onAllComplete: function(succeeded, failed) {
                                        assert.equal(failed.length, 0);
                                        timemachine.reset();
                                        done();
                                    },
                                }
                            });
                        doTest(uploader, chunkAnswers);
                    });
                    it("test simple time-locked upload using no worker to sign", function(done) {
                        // we need to lock the time, so our signature is constant
                        timemachine.config({
                            timestamp: 1483420379000 //'January 03, 2017 00:12:59'
                        });
                        var testExpiration = new Date(Date.now() + 10000),
                            uploader = new qq.s3.FineUploaderBasic({
                                request: {
                                    endpoint: testS3Endpoint
                                },
                                signature: {
                                    version: 4
                                },
                                objectProperties: {
                                    key: function () {
                                        return "test-key";
                                    }
                                },
                                chunking: {
                                    enabled: true,
                                    partSize: 1024
                                },
                                credentials: {
                                    accessKey: testAccessKey,
                                    secretKey: testSecretKey,
                                    expiration: testExpiration
                                },
                                callbacks: {
                                    onAllComplete: function(succeeded, failed) {
                                        assert.equal(failed.length, 0);
                                        timemachine.reset();
                                        done();
                                    },
                                }
                            });
                        doTest(uploader, chunkAnswers);
                    });
                    it("test simple time-locked upload using invalid worker - defaults back and works", function(done) {
                        // we need to lock the time, so our signature is constant
                        timemachine.config({
                            timestamp: 1483420379000 //'January 03, 2017 00:12:59'
                        });
                        var testExpiration = new Date(Date.now() + 10000),
                            uploader = new qq.s3.FineUploaderBasic({
                                request: {
                                    endpoint: testS3Endpoint
                                },
                                signature: {
                                    version: 4,
                                    workerUrl: "http://localhost:3000/file.not.exists.js"
                                },
                                objectProperties: {
                                    key: function () {
                                        return "test-key";
                                    }
                                },
                                chunking: {
                                    enabled: true,
                                    partSize: 1024
                                },
                                credentials: {
                                    accessKey: testAccessKey,
                                    secretKey: testSecretKey,
                                    expiration: testExpiration
                                },
                                retry: { // turn on retry as our worker fails asyncrounously
                                    enableAuto: true,
                                    autoAttemptDelay: 0,
                                    maxAutoAttempts: 1
                                },
                                callbacks: {
                                    onAllComplete: function(succeeded, failed) {
                                        assert.equal(failed.length, 0);
                                        timemachine.reset();
                                        done();
                                    },
                                }
                            });
                        var answers = JSON.parse(JSON.stringify(chunkAnswers));
                        answers.splice(1, 0, {
                            expect: {
                                headers: {
                                    "x-amz-date": undefined
                                }
                            }
                        });
                        doTest(uploader, answers);
                    });
                    it("test simple time-locked upload using custom worker to sign", function(done) {
                        // we need to lock the time, so our signature is constant
                        timemachine.config({
                            timestamp: 1483420379000 //'January 03, 2017 00:12:59'
                        });
                        var fakeSignatureWorker = "" +
                            "onmessage = function (e) {" +
                                "postMessage({resp: '00000000002f251f70867928d11d65bcbf411bb90a6b179f59615034deacdef4', id: e.data.id});" +
                            "};";
                        var testExpiration = new Date(Date.now() + 10000),
                            uploader = new qq.s3.FineUploaderBasic({
                                request: {
                                    endpoint: testS3Endpoint
                                },
                                signature: {
                                    version: 4,
                                    workerUrl: function () {
                                        return URL.createObjectURL(new Blob([fakeSignatureWorker], {type: "application/javascript"}));
                                    }
                                },
                                objectProperties: {
                                    key: function () {
                                        return "test-key";
                                    }
                                },
                                chunking: {
                                    enabled: true,
                                    partSize: 1024
                                },
                                credentials: {
                                    accessKey: testAccessKey,
                                    secretKey: testSecretKey,
                                    expiration: testExpiration
                                },
                                callbacks: {
                                    onAllComplete: function(succeeded, failed) {
                                        assert.equal(failed.length, 0);
                                        timemachine.reset();
                                        done();
                                    },
                                }
                            });
                        // make a copy, and change the expected headers b/c of our
                        // fake signature worker
                        var answers = JSON.parse(JSON.stringify(chunkAnswers));
                        for (var i = 1; i < answers.length - 1; i++) {
                            answers[i].expect.headers["x-amz-content-sha256"] = "00000000002f251f70867928d11d65bcbf411bb90a6b179f59615034deacdef4";
                        }
                        answers[1].expect.headers.Authorization = "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=e563897a58bc1841481737424d81f2401ae7ba527f925285622459ab97753128";
                        answers[2].expect.headers.Authorization = "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=a5956265f51d6039c8dd0df42ddef5a4bdfc8fc1b65812d6a4d55d121f3952dc";
                        answers[3].expect.headers.Authorization = "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=56f2da2ee333edb6d96d116ef9ea046ff2c4648e7117f2c1b6475f2dd572530a";
                        answers[4].expect.headers.Authorization = "AWS4-HMAC-SHA256 Credential=testAccessKey/20170103/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=6bbd9cbca147eab277bf18138961e43e309d08a10d13e5afd2d4b3ba51d08ad1";
                        doTest(uploader, answers);
                    });
                });
            });

            it("test simple upload with only mandatory credentials specified as options", function(done) {
                assert.expect(14, done);

                var testExpiration = new Date(Date.now() + 10000),
                    uploader = new qq.s3.FineUploaderBasic({
                        request: {
                            endpoint: testS3Endpoint
                        },
                        credentials: {
                            accessKey: testAccessKey,
                            secretKey: testSecretKey,
                            expiration: testExpiration
                        }
                    });

                qqtest.downloadFileAsBlob("up.jpg", "image/jpeg").then(function (blob) {
                    var request, requestParams;

                    fileTestHelper.mockXhr();
                    uploader.addFiles({name: "test", blob: blob});

                    assert.equal(fileTestHelper.getRequests().length, 1, "Wrong # of requests");

                    request = fileTestHelper.getRequests()[0];
                    requestParams = request.requestBody.fields;

                    assert.equal(request.url, testS3Endpoint);
                    assert.equal(request.method, "POST");

                    assert.equal(requestParams["Content-Type"], "image/jpeg");
                    assert.equal(requestParams.success_action_status, 200);
                    assert.equal(requestParams[qq.s3.util.SESSION_TOKEN_PARAM_NAME], null);
                    assert.equal(requestParams["x-amz-storage-class"], null);
                    assert.equal(requestParams["x-amz-meta-qqfilename"], "test");
                    assert.equal(requestParams.key, uploader.getKey(0));
                    assert.equal(requestParams.AWSAccessKeyId, testAccessKey);
                    assert.equal(requestParams.acl, "private");
                    assert.ok(requestParams.file);

                    assert.ok(requestParams.signature);
                    assert.ok(requestParams.policy);
                });
            });

            it("test simple upload with all credential options specified", function(done) {
                assert.expect(1, done);

                var testExpiration = new Date(Date.now() + 10000).toISOString(),
                    uploader = new qq.s3.FineUploaderBasic({
                        request: {
                            endpoint: testS3Endpoint
                        },
                        credentials: {
                            accessKey: testAccessKey,
                            secretKey: testSecretKey,
                            expiration: testExpiration,
                            sessionToken: testSessionToken
                        }
                    });

                qqtest.downloadFileAsBlob("up.jpg", "image/jpeg").then(function (blob) {
                    var request, requestParams;

                    fileTestHelper.mockXhr();
                    uploader.addFiles({name: "test", blob: blob});

                    request = fileTestHelper.getRequests()[0];
                    requestParams = request.requestBody.fields;

                    assert.equal(requestParams[qq.s3.util.SESSION_TOKEN_PARAM_NAME], testSessionToken);
                });
            });

            it("test simple upload with credentials only specified via API method", function(done) {
                assert.expect(14, done);

                var testExpiration = new Date(Date.now() + 10000),
                    uploader = new qq.s3.FineUploaderBasic({
                        request: {
                            endpoint: testS3Endpoint
                        }
                    });

                uploader.setCredentials({
                    accessKey: testAccessKey,
                    secretKey: testSecretKey,
                    expiration: testExpiration,
                    sessionToken: testSessionToken
                });

                qqtest.downloadFileAsBlob("up.jpg", "image/jpeg").then(function (blob) {
                    var request, requestParams;

                    fileTestHelper.mockXhr();
                    uploader.addFiles({name: "test", blob: blob});

                    assert.equal(fileTestHelper.getRequests().length, 1, "Wrong # of requests");

                    request = fileTestHelper.getRequests()[0];
                    requestParams = request.requestBody.fields;

                    assert.equal(request.url, testS3Endpoint);
                    assert.equal(request.method, "POST");

                    assert.equal(requestParams["Content-Type"], "image/jpeg");
                    assert.equal(requestParams.success_action_status, 200);
                    assert.equal(requestParams[qq.s3.util.SESSION_TOKEN_PARAM_NAME], testSessionToken);
                    assert.equal(requestParams["x-amz-storage-class"], null);
                    assert.equal(requestParams["x-amz-meta-qqfilename"], "test");
                    assert.equal(requestParams.key, uploader.getKey(0));
                    assert.equal(requestParams.AWSAccessKeyId, testAccessKey);
                    assert.equal(requestParams.acl, "private");
                    assert.ok(requestParams.file);

                    assert.ok(requestParams.signature);
                    assert.ok(requestParams.policy);
                });
            });

            it("test endpoint as a function", function(done) {
                assert.expect(14, done);

                var overrideEndpoint = 'https://different-bucket.s3.amazonaws.com';
                var testExpiration = new Date(Date.now() + 10000),
                    uploader = new qq.s3.FineUploaderBasic({
                        request: {
                            endpoint: function () {
                                return overrideEndpoint;
                            }
                        }
                    });

                uploader.setCredentials({
                    accessKey: testAccessKey,
                    secretKey: testSecretKey,
                    expiration: testExpiration,
                    sessionToken: testSessionToken
                });

                qqtest.downloadFileAsBlob("up.jpg", "image/jpeg").then(function (blob) {
                    var request, requestParams;

                    fileTestHelper.mockXhr();
                    uploader.addFiles({name: "test", blob: blob});

                    assert.equal(fileTestHelper.getRequests().length, 1, "Wrong # of requests");

                    request = fileTestHelper.getRequests()[0];
                    requestParams = request.requestBody.fields;

                    assert.equal(request.url, overrideEndpoint);
                    assert.equal(request.method, "POST");

                    assert.equal(requestParams["Content-Type"], "image/jpeg");
                    assert.equal(requestParams.success_action_status, 200);
                    assert.equal(requestParams[qq.s3.util.SESSION_TOKEN_PARAM_NAME], testSessionToken);
                    assert.equal(requestParams["x-amz-storage-class"], null);
                    assert.equal(requestParams["x-amz-meta-qqfilename"], "test");
                    assert.equal(requestParams.key, uploader.getKey(0));
                    assert.equal(requestParams.AWSAccessKeyId, testAccessKey);
                    assert.equal(requestParams.acl, "private");
                    assert.ok(requestParams.file);

                    assert.ok(requestParams.signature);
                    assert.ok(requestParams.policy);
                });
            });

            describe("test chunk retry edge cases", function () {
                it("gets a signature response back before we have hashed the chunk", function (done) {
                    this.timeout(5 * 1000);
                    var testExpiration = new Date(Date.now() - 1000);
                    // takes a long time to return the result
                    var fakeSignatureWorker = "var i = 0;" +
                        "onmessage = function (e) { i++;" +
                            "setTimeout(function () {postMessage({resp: '00000000002f251f70867928d11d65bcbf411bb90a6b179f59615034deacdef4', id: e.data.id});}, i > 2 ? 200: 0)" +
                        "};";
                    var uploader = new qq.s3.FineUploaderBasic({
                        request: {
                            endpoint: testS3Endpoint
                        },
                        signature: {
                            version: 4,
                            workerUrl: function () {
                                return URL.createObjectURL(new Blob([fakeSignatureWorker], {type: "application/javascript"}));
                            }
                        },
                        objectProperties: {
                            key: function () {
                                return "test-key";
                            }
                        },
                        chunking: {
                            enabled: true,
                            partSize: 1024,
                            concurrent: {
                                enabled: true
                            }
                        },
                        maxConnections: 2,
                        credentials: {
                            accessKey: testAccessKey,
                            expiration: testExpiration
                        },
                        retry: {
                            enableAuto: true,
                            autoAttemptDelay: 0,
                            maxAutoAttempts: 1
                        },
                        callbacks: {
                            onAutoRetry: function () {
                            },
                            onAllComplete: function(succeeded, failed) {
                                if (failed && failed.length > 0) {
                                    done(new Error('failed has length > 0'));
                                }
                                done();
                            },
                        }
                    });
                    // help us keep track of requests
                    var testHelper = {
                        a: [null, null],
                        b: [null, null],
                        c: [null, null]
                    };
                    /*
                        each iteration of requests we handle.
                        which keeps track of our index.
                        the basic ordering of requests are
                            0. sign initiate multipart request.
                            1. s3 -> initiate multipart request.
                            2. create the s3 request to upload the 1st chunk. Do not send it yet.
                            3. create the s3 request to upload the 2nd chunk. Do not send it yet.
                            4. get the signature for the 1st chunk.
                            5. get the signature for the 2nd chunk. <- this is where we will cause #2 to fail
                            6. auto retry kicks in. it does #2 again
                            7. auto retry causes us to do #3 again. <- this is where we will trigger the bug
                            8. if we get here, then we have passed! woo. just follow the happy path.
                    */
                    function handleChunk(which) {
                        return function () {
                            var requests = fileTestHelper.getRequests();
                            if (which >= requests.length) {
                                setTimeout(handleChunk(which), 100);
                                return;
                            }
                            var request = requests[which];
                            switch (which) {
                            case 0: // initiate multipart request (signature)
                                request.respond(200, {}, "{\"signature\": \"asdasdasda\"} ");
                                break;
                            case 1: // initiate multipart request (actual)
                                request.respond(200, {}, "<UploadId>123</UploadId>");
                                break;
                            case 2:
                                // keep a hold of the upload request to s3
                                // we will later fail this request with a 500
                                // NOTE: this request has not been 'made' yet, just created.
                                // the signuture request will need to be sent out first
                                testHelper.a[0] = request;
                                break;
                            case 3:
                                // ignore this upload request to s3, we don't care about it for this request
                                break;
                            case 4:
                                // sign the first chunk for (which = 2)
                                request.respond(200, {}, "{\"signature\": \"asdasdasda\"} ");
                                break;
                            case 5:
                                // hold onto the signature request for for which = 3
                                testHelper.a[1] = request;
                                // now lets fail upload for which = 2
                                setTimeout(function () {
                                    // fail the upload request we got earlier with 500
                                    testHelper.a[0].respond(500, {}, "<Error><Code>InternalError</Code><Message>InternalError</Message><Resource>/mybucket/myfoto.jpg</Resource> <RequestId>4442587FB7D0A2F9</RequestId></Error>");
                                    setTimeout(handleChunk(which + 1), 100);
                                }, 100);
                                return;
                            case 6:
                                // the auto retry kicks in
                                // this is, like before, an upload request to s3 for the 1st chunk
                                // that is not yet 'made', just created
                                testHelper.b[0] = request;
                                break;
                            case 7:
                                // now we get the upload request for the second chunk,
                                // but like before, this is not yet 'made', just created
                                testHelper.b[1] = request;
                                // lets jump back to which = 5's request.
                                // lets respond with a success message
                                // ----
                                // This will trigger our bug (date is undefined)
                                // ----
                                testHelper.a[1].respond(200, {}, "{\"signature\": \"asdasdasda\"} ");
                                break;
                            // ---
                            // Every case forward is the happy success path.
                            // ---
                            case 8:
                                // sign the first chunk
                                request.respond(200, {}, "{\"signature\": \"asdasdasda\"} ");
                                break;
                            case 9:
                                request.respond(200, {}, "{\"signature\": \"asdasdasda\"} ");
                                setTimeout(function () {
                                    // resolve the uploads
                                    testHelper.b[0].respond(200, {ETag: '123'}, "");
                                    testHelper.b[1].respond(200, {ETag: '123'}, "");
                                });
                                setTimeout(handleChunk(which + 1), 100);
                                return;
                            case 10:
                                // more uploads (success path)
                                testHelper.c[0] = request;
                                break;
                            case 11:
                                // more uploads (success path)
                                testHelper.c[1] = request;
                                break;
                            case 12:
                                request.respond(200, {}, "{\"signature\": \"asdasdasda\"} ");
                                break;
                            case 13:
                                request.respond(200, {}, "{\"signature\": \"asdasdasda\"} ");
                                setTimeout(function () {
                                    // resolve the uploads
                                    testHelper.c[0].respond(200, {ETag: '123'}, "");
                                    testHelper.c[1].respond(200, {ETag: '123'}, "");
                                });
                                setTimeout(handleChunk(which + 1), 100);
                                return;
                            case 14:
                                // signature for finalize
                                request.respond(200, {}, "{\"signature\": \"asdasdasda\"} ");
                                break;
                            case 15:
                                // complete it
                                request.respond(200, {ETag: '123'}, '<CompleteMultipartUploadResult><Bucket>mytestbucket</Bucket><Key>test-key</Key></CompleteMultipartUploadResult>');
                                return;
                            }
                            setTimeout(handleChunk(which + 1), 50);
                        };
                    }
                    qqtest.downloadFileAsBlob("up.jpg", "image/jpeg").then(function (blob) {
                        var request, requestParams;

                        fileTestHelper.mockXhr();
                        uploader.addFiles({name: "test", blob: blob});
                        handleChunk(0)();
                    });
                });

            });

            describe("test credentialsExpired callback", function() {
                var testExpiration = new Date(Date.now() - 1000),
                    testAccessKeyFromCallback = "testAccessKeyFromCallback",
                    testSessionTokenFromCallback = "testSessionTokenFromCallback";

                function runTest(callback, done) {
                    assert.expect(15, done);

                    var uploader = new qq.s3.FineUploaderBasic({
                        request: {
                            endpoint: testS3Endpoint
                        },
                        credentials: {
                            accessKey: testAccessKey,
                            secretKey: testSecretKey,
                            expiration: testExpiration,
                            sessionToken: testSessionToken
                        },
                        callbacks: {
                            onCredentialsExpired: callback
                        }
                    });

                    qqtest.downloadFileAsBlob("up.jpg", "image/jpeg").then(function (blob) {
                        var request, requestParams;

                        fileTestHelper.mockXhr();
                        uploader.addFiles({name: "test", blob: blob});

                        assert.equal(fileTestHelper.getRequests().length, 1, "Wrong # of requests");

                        setTimeout(function() {
                            request = fileTestHelper.getRequests()[0];
                            requestParams = request.requestBody.fields;

                            assert.equal(request.url, testS3Endpoint);
                            assert.equal(request.method, "POST");

                            assert.equal(requestParams["Content-Type"], "image/jpeg");
                            assert.equal(requestParams.success_action_status, 200);
                            assert.equal(requestParams[qq.s3.util.SESSION_TOKEN_PARAM_NAME], testSessionTokenFromCallback);
                            assert.equal(requestParams["x-amz-storage-class"], null);
                            assert.equal(requestParams["x-amz-meta-qqfilename"], "test");
                            assert.equal(requestParams.key, uploader.getKey(0));
                            assert.equal(requestParams.AWSAccessKeyId, testAccessKeyFromCallback);
                            assert.equal(requestParams.acl, "private");
                            assert.ok(requestParams.file);

                            assert.ok(requestParams.signature);
                            assert.ok(requestParams.policy);
                        }, 10);
                    });
                }

                it("qq.Promise", function(done) {
                    var callback = function() {
                        assert.ok(true);

                        var promise = new qq.Promise();
                        promise.success({
                            accessKey: testAccessKeyFromCallback,
                            secretKey: testSecretKey,
                            expiration: new Date(Date.now() + 10000),
                            sessionToken: testSessionTokenFromCallback
                        });
                        return promise;
                    };

                    runTest(callback, done);
                });

                it("Q.js", function(done) {
                    var callback = function() {
                        assert.ok(true);

                        /* jshint newcap:false */
                        return Q({
                            accessKey: testAccessKeyFromCallback,
                            secretKey: testSecretKey,
                            expiration: new Date(Date.now() + 10000),
                            sessionToken: testSessionTokenFromCallback
                        });
                    };

                    runTest(callback, done);
                });
            });
        });
    }

    describe("non-file-based tests", function() {
        it("enforces mandatory credentials", function() {
            var uploader = new qq.s3.FineUploaderBasic({});

            assert.doesNotThrow(
                function() {
                    uploader.setCredentials({
                        accessKey: "ak",
                        secretKey: "sk",
                        expiration: new Date()
                    });
                }
            );

            assert.throws(
                function() {
                    uploader.setCredentials({
                        accessKey: "ak",
                        secretKey: "sk"
                    });
                }, qq.Error
            );

            assert.throws(
                function() {
                    uploader.setCredentials({
                        accessKey: "ak",
                        expiration: new Date()
                    });
                }, qq.Error
            );

            assert.throws(
                function() {
                    uploader.setCredentials({
                        secretKey: "sk",
                        expiration: new Date()
                    });
                }, qq.Error
            );
        });

    });
});
