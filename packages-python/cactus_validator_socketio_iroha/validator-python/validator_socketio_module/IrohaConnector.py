from abc import ABCMeta, abstractmethod

import asyncio

from .AbstractConnector import AbstractConnector
from iroha import Iroha, IrohaCrypto, IrohaGrpc
import schedule
#import binascii ### for sendAsyncRequest

class IrohaConnector(AbstractConnector):
    def __init__(self, socketio, sessionid, iroha_dic, socketIoValidator):
        self.moduleName = "IrohaConnector"
        self.iroha_dic = iroha_dic
        self.socketIoValidator = socketIoValidator

        self.net = IrohaGrpc('localhost:50051')
        self.iroha = Iroha('admin@test')
        self.admin_priv_key = 'f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70' #Private Key of user decided at previous line
        self.latestNumOfBlocks = 0
        self.isMonitoring = False

        print(f"##{self.moduleName}.__init__")

    def getValidatorInformation(self, validatorURL):
        """Get the validator information including version, name, ID, and other information"""
        print(f"##{self.moduleName}.getValidatorInformation()")

    def sendAsyncRequest(self, requestData):
        """Request a verifier to execute a ledger operation"""
        print(f"##{self.moduleName}.sendAsyncRequest()")
        command = requestData['method']['command']
        if command == 'sendTx':
            return send_tx(requestData['args']['tx'])
    
    def send_tx(self, tx):
        #hex_hash = binascii.hexlify(IrohaCrypto.hash(tx))
        net.send_tx(tx)

    def getBalance(self, address):
        """Get balance of an account for native token on a leder"""
        print(f"##{self.moduleName}.getBalance()")
    
    def execSyncFunction(self, address, funcName, args):
        """Execute a synchronous function held by a smart contract"""
        print(f"##{self.moduleName}.execSyncFunction()")
        
        command = args['method']['command']
        print(f"##execSyncFunction : args['args']['args'] : {args['args']['args']}")
    
    def startMonitor(self):
        """Request a validator to start monitoring ledger"""

        # initial execution for getting current number of blocks
        self.monitoring_routine(True)
        self.isMonitoring = True
        print(f"##{self.moduleName}.startMonitor()")
        schedule.every(1).minutes.do(self.monitoring_routine)
        while self.isMonitoring:
            schedule.run_pending()
    
    def stopMonitor(self):
        """Request a validator to stop monitoring ledger"""
        self.isMonitoring = False
        print(f"##{self.moduleName}.stopMonitor()")

    def cb(self, callbackData):
        """Callback function to call when receiving data from Ledger"""
        print(f"##{self.moduleName}.cb()")

    def nop(self):
        """Nop function for testing"""
        print(f"##{self.moduleName}.nop()")

    def run_coroutine(self, coroutine, command, args, loop=None):
        if loop is None:
            loop = asyncio.get_event_loop()
        result = loop.run_until_complete(coroutine(command, args))
        return result

    def get_block(self, blockNum):
        print(f'##get_block block num is : {blockNum}')
        
        # create Query
        get_block_query = self.iroha.query(
            'GetBlock',
            height = blockNum
        )
        # sign Query
        IrohaCrypto.sign_query(get_block_query, self.admin_priv_key)
        # send Query
        response = self.net.send_query(get_block_query)
        return response

    def monitoring_routine(self, isInit = False):
        print(f'##called monitoring_routine()')
        while(True):
            blockData = self.get_block(self.latestNumOfBlocks + 1)
            if(blockData.error_response.error_code == 0):
                self.latestNumOfBlocks += 1
                if(not isInit):
                    event = self.extract_event(blockData)
                    self.socketIoValidator.publish_event(event)
            elif(blockData.error_response.error_code == 3):
                break

    def extract_event(self, blockData):
        # TODO return event which is extracted from blockData
        # improve temporary returning blockData
        return blockData