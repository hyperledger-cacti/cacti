from flask import Flask, render_template, request
from flask_socketio import SocketIO
import jwt
import json

from .Settings import Settings
from .IrohaConnector import IrohaConnector

class SocketIoValidator:
    def __init__(self):
        self.moduleName = 'SocketIoValidator'
        # self.the_cb = None
        self.iroha_dic = {}
        
        # load settings
        self.settings = Settings()

        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'secret!'
        # socketio = SocketIO(app)

        print(f'socket port: {self.settings.validatorSettings.port}')

        self.socketio = SocketIO(self.app, host='0.0.0.0', port=self.settings.validatorSettings.port, logger=True, engineio_logger=True)
        
        self.privateKeyFile = '3PfTJw8g.priv'
        self.algorithm = 'ES256'

        self.emitType = "eventReceived"

        @self.socketio.on('connect')
        def handle_connect():
            print(f'on connect (sessionid: {request.sid})')
            self.session_dict[request.sid] = self.getValidatorInstance()

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print('on disconnect')
            del self.session_dict[request.sid]

        @self.socketio.on('startMonitor')
        def handle_startMonitor():
            print('on startMonitor')
            # clientId = None
            # cb = None
            # self.session_dict[request.sid].startMonitor(clientId, cb)
            # def the_cb(resp): return self.cb_helper(request.sid, resp)
            self.session_dict[request.sid].startMonitor()

        @self.socketio.on('stopMonitor')
        def handle_stopMonitor():
            print('on stopMonitor')
            self.session_dict[request.sid].stopMonitor()

        @self.socketio.on('nop')
        def handle_nop():
            print('received nop')
            self.session_dict[request.sid].nop()

        @self.socketio.on('test-event')
        def handle_event():
            self.session_dict[request.sid].cb('data-from-blockchain')

        @self.socketio.on('sendAsyncRequest')
        def handle_sendAsyncRequest(requestData):
            print('received sendAsyncRequest')
            print(f"##requestData: {requestData}")
            result = self.session_dict[request.sid].sendAsyncRequest(requestData)
            resp_obj = self.build_res_obj(200, requestData["reqID"], result)
            #respJson = json.dumps(resp_obj)
            self.socketio.emit("response", resp_obj)

        @self.socketio.on('request2')
        def handle_execSyncFunction(requestData):
            print('received request2')
            print(f"##requestData:  {requestData}")
            
            result = self.session_dict[request.sid].execSyncFunction(None, None, requestData)

            resp_obj = self.build_res_obj(200, requestData["reqID"], result)
            #respJson = json.dumps(resp_obj)
            self.socketio.emit("response", resp_obj)

        self.session_dict = {}

    # build response object of execSyncFunction
    def build_res_obj(self, status_code, req_id, result):

        print(f"##build_res_obj result: {result}")

        signed_results = self.sign(result)
        responseData = {}
        res_obj = {}
        res_obj["status"] = status_code
        res_obj["data"] = signed_results
        responseData["resObj"] = res_obj
        if req_id is not None:
            responseData["id"] = req_id
        return responseData

    def run(self):
        """Run Validator"""
        # self.init_iroha();
        self.socketio.run(self.app, host='0.0.0.0', port=self.settings.validatorSettings.port)

    # def cb_helper(self, sessionid, answer):
    #     print(f'cb helper: {self.session_dict[request.sid]}')
    #     return self.session_dict[sessionid].cb(answer)

    def getValidatorInstance(self):
        print(f'##called getValidatorInstance()')
        return IrohaConnector(self.socketio, request.sid, self.iroha_dic, self)

    def sign(self, data):
        """ sign data """
        print(f'##called sign()')
        with open(self.privateKeyFile, 'br') as fh:
            private_key = fh.read()

        print(f"raw data:  {data}")
        encoded_jwt = jwt.encode(data, private_key, algorithm="ES256")
        print(f"encoded_jwt:  {encoded_jwt}")
        return encoded_jwt

    # build result of monitoring
    def build_monitoring_result(self, blockData):
        signedBlockData = self.sign({"blockData":json.dumps(blockData, default=str)})
        # Notify only if transaction exists
        retObj = {
            "status"    : 200,
            "blockData" : signedBlockData
        }
        print(f'##build_monitoring_result retObj : {retObj}')
        return retObj

    # send result of monitoring using socket
    def publish_event(self, event):
        resp_obj = self.build_monitoring_result(event)
        self.socketio.emit(self.emitType, resp_obj)