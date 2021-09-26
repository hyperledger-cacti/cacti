const fs = require("fs");
const jwt = require("jsonwebtoken");
const JSONbig = require('json-bigint');

// NOTE: Run pip install socket.io-client.
const io = require('socket.io-client');
const url = "http://localhost:5060";
const socket = io(url, {
    //transports: [ 'websocket', 'polling']
});

const crtPath = "3PfTJw8g.crt";
const paramAlgorithm = "ES256";

socket.on('connect', () => {
    console.log('connect');
    console.log(socket.id);
    const transport = socket.io.engine.transport.name;
    console.log(transport);
    //socket.emit('mymessage', 'hoge');
});

socket.on('mymessage', () => {
    console.log('received mymessage');
});

socket.on("response", (result) => {
    console.log(`#[recv]response, res: ${result}`);
    responseFlag = true;
    decodeFunc(result.resObj.data);
});

socket.on("eventReceived", (result) => {
    console.log(`#[recv]eventReceived, res: ${result}`);
    responseFlag = true;
    console.log(`#[recv]eventReceived, res_status: ${result.status}`)
    decodeFunc(result.blockData);
});

const verify = (signature) => new Promise(resolve => {
    const publicKey = fs.readFileSync(crtPath);

    const option = {
      algorithms: paramAlgorithm,
    };

    jwt.verify(signature, publicKey, option, (err, decoded) => {
        return new Promise((resolve, reject) => {
            if (err) {
                // Authentication NG
                console.log(`Authentication NG : error = ${err}`);
                reject(err);
            } else {
                // Authentication OK
                console.log(`Authentication OK`);
                console.log(`decoded : ${JSON.stringify(decoded)}`);
                
                resolve(decoded);
            }
        });
    });
});

const decodeFunc = async (signsignature) => {
    try {
      console.log("call verify()");
      console.log(`##signsignature: ${signsignature}`);
      const decoded = await verify(signsignature);
      console.log(`##decoded: ${decoded}`);

    } catch (err) {
      console.log(`err: ${err}`);
    }
};

const requestStartMonitor = () => {
    console.log('##exec requestStartMonitor()');
    socket.emit('startMonitor');
    
    setTimeout(requestStopMonitor,180000);
}

const requestStopMonitor = () => {
    console.log('##exec requestStopMonitor()');
    socket.emit('stopMonitor');
    
    setTimeout(function(){
      // end communication
      socket.disconnect();
      process.exit(0);
    },5000);
}

setTimeout(requestStartMonitor, 2000);

socket.emit('test-event');

setTimeout(() => {
    console.log('call nop!');
    socket.emit('nop');
},  1000);

