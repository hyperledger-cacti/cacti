from abc import ABCMeta, abstractmethod

import json
import time
from indy import ledger
import asyncio

from .AbstractConnector import AbstractConnector

class IndyConnector(AbstractConnector):
    def __init__(self, socketio, sessionid, indy_dic):
        self.moduleName = "IndyConnector"
        self.indy_dic = indy_dic
        print(f"##{self.moduleName}.__init__")

    def getValidatorInformation(self, validatorURL):
        """Get the validator information including version, name, ID, and other information"""
        print(f"##{self.moduleName}.getValidatorInformation()")

    def sendSignedTransaction(self, signedTransaction):
        """Request a verifier to execute a ledger operation"""
        print(f"##{self.moduleName}.sendSignedTransaction()")
    
    def getBalance(self, address):
        """Get balance of an account for native token on a leder"""
        print(f"##{self.moduleName}.getBalance()")
    
    def execSyncFunction(self, address, funcName, args):
        """Execute a synchronous function held by a smart contract"""
        print(f"##{self.moduleName}.execSyncFunction()")
        
        command = args['method']['command']
        if command== 'indy_ledger_submit_request':
            print(f"##execSyncFunction : args['args']['args'] : {args['args']['args']}")
            # return self.load_schema_or_credential_definition(args['args']['args'])

        if command== 'get_schema' or command== 'get_cred_def':
            print(f"##execSyncFunction get_schema_or_cred_def: args['args']['args'] : {args['args']['args']}")
            resTuple = self.run_coroutine(self.get_schema_or_cred_def, command, args['args']['args'])
            # resList = json.dumps(resTuple)
            resJson = {"result": resTuple}
            # resJson = {"data":str(resObj)}
            print(f"##execSyncFunction resObj : {resJson}")
            return resJson
            
        print(f"##{self.moduleName} unknown command : {command}")
        return "unknown command."
    
    
    def load_schema_or_credential_definition(self, args):
        """Execute a synchronous function held by a smart contract"""
        print(f"##{self.moduleName}.load_schema_or_credential_definition()")

        pool_handle = self.indy_dic['pool_handle']
        responseStr = self.run_coroutine_ensure_previous_request_applied(pool_handle, args, lambda response: response['result']['data'] is not None)
        
        print(f"##{self.moduleName}.responseStr: {responseStr}")

        response = json.loads(responseStr)
        
        return response
    
    def startMonitor(self, clientId, cb):
        """Request a validator to start monitoring ledger"""
        print(f"##{self.moduleName}.startMonitor()")
    
    def stopMonitor(self, clientId):
        """Request a validator to stop monitoring ledger"""
        print(f"##{self.moduleName}.stopMonitor()")

    def cb(self, callbackData):
        """Callback function to call when receiving data from Ledger"""
        print(f"##{self.moduleName}.cb()")

    def nop(self):
        """Nop function for testing"""
        print(f"##{self.moduleName}.nop()")

    def run_coroutine_ensure_previous_request_applied(self, pool_handle, checker_request, checker, loop=None):
        if loop is None:
            loop = asyncio.get_event_loop()
        results = loop.run_until_complete(self.ensure_previous_request_applied(pool_handle, checker_request, checker))
        return results

    async def get_schema_or_cred_def(self, command, args):
        print(f"##{self.moduleName}.get_schema_or_cred_def()")

        pool_handle = self.indy_dic['pool_handle']
        did = args["did"]
        schema_id = args["schemaId"]
        if command== 'get_schema':
            response = await self.get_schema(pool_handle, did, schema_id)
        elif command== 'get_cred_def':
            response = await self.get_cred_def(pool_handle, did, schema_id)

        print(f"##get_schema_or_cred_def response : {response}")

        return response
        

    async def ensure_previous_request_applied(self, pool_handle, checker_request, checker):
        for _ in range(3):
            response = json.loads(await ledger.submit_request(pool_handle, checker_request))
            try:
                if checker(response):
                    return json.dumps(response)
            except TypeError:
                pass
            time.sleep(5)

    async def get_schema(self, pool_handle, _did, schema_id):
        print(f"##{self.moduleName}.get_schema()")
        get_schema_request = await ledger.build_get_schema_request(_did, schema_id)
        get_schema_response = await self.ensure_previous_request_applied(
            pool_handle, get_schema_request, lambda response: response['result']['data'] is not None)
        return await ledger.parse_get_schema_response(get_schema_response)

    async def get_cred_def(self, pool_handle, _did, cred_def_id):
        print(f"##{self.moduleName}.get_cred_def()")
        get_cred_def_request = await ledger.build_get_cred_def_request(_did, cred_def_id)
        get_cred_def_response = \
            await self.ensure_previous_request_applied(pool_handle, get_cred_def_request,
                                                lambda response: response['result']['data'] is not None)
        return await ledger.parse_get_cred_def_response(get_cred_def_response)

    def run_coroutine(self, coroutine, command, args, loop=None):
        if loop is None:
            loop = asyncio.get_event_loop()
        result = loop.run_until_complete(coroutine(command, args))
        return result