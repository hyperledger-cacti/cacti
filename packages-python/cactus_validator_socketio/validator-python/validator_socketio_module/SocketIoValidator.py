from flask import Flask, render_template, request
from flask_socketio import SocketIO
import json
import time
import asyncio
import jwt

# from indy import ledger, pool
from indy import pool
from indy.error import ErrorCode, IndyError
from .utils import get_pool_genesis_txn_path, PROTOCOL_VERSION


from .Settings import Settings
from .IndyConnector import IndyConnector

class SocketIoValidator:
    def __init__(self):
        self.moduleName = 'SocketIoValidator'
        self.the_cb = None
        self.indy_dic = {}
        
        # load settings
        self.settings = Settings()

        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'secret!'
        # socketio = SocketIO(app)

        print(f'socket port: {self.settings.validatorSettings.port}')

        self.socketio = SocketIO(self.app, host='0.0.0.0', port=self.settings.validatorSettings.port, logger=True, engineio_logger=True)
        
        self.privateKeyFile = '3PfTJw8g.priv'
        self.algorithm = 'ES256'

        @self.socketio.on('connect')
        def handle_connect():
            # print('on connect (sessionid: ' + request.sid + ')')
            print(f'on connect (sessionid: {request.sid})')
            self.session_dict[request.sid] = self.getValidatorInstance()

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print('on disconnect')
            del self.session_dict[request.sid]

        @self.socketio.on('startMonitor')
        def handle_startMonitor():
            print('on startMonitor')
            clientId = None
            cb = None
            self.session_dict[request.sid].startMonitor(clientId, cb)
            def the_cb(resp): return self.cb_helper(request.sid, resp)

        @self.socketio.on('stopMonitor')
        def handle_stopMonitor():
            print('on startMonitor')
            self.session_dict[request.sid].stopMonitor()

        @self.socketio.on('nop')
        def handle_nop():
            print('received nop')
            self.session_dict[request.sid].nop()

        @self.socketio.on('test-event')
        def handle_event():
            self.session_dict[request.sid].cb('data-from-blockchain')

        @self.socketio.on('request2')
        def handle_execSyncFunction(requestData):
            print('received request2')
            print(f"##requestData:  {requestData}")
            
            result = self.session_dict[request.sid].execSyncFunction(None, None, requestData)

            resp_obj = self.build_res_obj(200, requestData["reqID"], result)
            #respJson = json.dumps(resp_obj)
            self.socketio.emit("response", resp_obj)

        self.session_dict = {}

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
        # self.init_indy();
        self.socketio.run(self.app, host='0.0.0.0', port=self.settings.validatorSettings.port)

    def cb_helper(self, sessionid, answer):
        print(f'cb helper: {self.session_dict[request.sid]}')
        return self.session_dict[sessionid].cb(answer)

    def getValidatorInstance(self):
        print(f'##called getValidatorInstance()')
        return IndyConnector(self.socketio, request.sid, self.indy_dic)

    def sign(self, data):
        """ sign data """
        print(f'##called sign()')
        with open(self.privateKeyFile, 'br') as fh:
            private_key = fh.read()

        # unique process for reqId in indy data
        # data["result"]["reqId"] = str(data["result"]["reqId"])

        print(f"raw data:  {data}")
        encoded_jwt = jwt.encode(data, private_key, algorithm="ES256")
        print(f"encoded_jwt:  {encoded_jwt}")
        return encoded_jwt

    # for INDY
    def init_indy(self):
        """ Initialization process for INDY """
        print(f'##called init_indy()')

        self.run_coroutine(self.init_indy_pool)
        self.run_coroutine(self.open_pool)
        time.sleep(1)

    # for INDY
    async def init_indy_pool(self):
        pool_ = {
            'name': 'pool1'
        }
        print("Open Pool Ledger: {}".format(pool_['name']))
        pool_['genesis_txn_path'] = get_pool_genesis_txn_path(pool_['name'])
        pool_['config'] = json.dumps({"genesis_txn": str(pool_['genesis_txn_path'])})

        # Set protocol version 2 to work with Indy Node 1.4
        await pool.set_protocol_version(PROTOCOL_VERSION)

        try:
            await pool.create_pool_ledger_config(pool_['name'], pool_['config'])
            print('##init_indy_pool create pool ledger config completed')
        except IndyError as ex:
            if ex.error_code == ErrorCode.PoolLedgerConfigAlreadyExistsError:
                pass
    
    # for INDY
    async def open_pool(self):
        # open the pool and get handler
        # self.pool_handle = await pool.open_pool_ledger('pool1', None)
        self.indy_dic['pool_handle'] = await pool.open_pool_ledger('pool1', None)
        print(f"##{self.moduleName} set pool_handle.")

    # for INDY
    def run_coroutine(self, coroutine, loop=None):
        print(f'##called run_coroutine()')
        if loop is None:
            loop = asyncio.get_event_loop()
        loop.run_until_complete(coroutine())
