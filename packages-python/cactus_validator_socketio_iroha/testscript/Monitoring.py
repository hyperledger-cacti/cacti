from typing import Type
from iroha import Iroha, IrohaCrypto, IrohaGrpc
import schedule

net = IrohaGrpc('localhost:50051')

iroha = Iroha('admin@test')
admin_priv_key = 'f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70' #Private Key of user decided at previous line

temp_blocks = []
latestNumOfBlocks = 0
isMonitoring = False

def init():
        global temp_blocks
        global latestNumOfBlocks
        global isMonitoring
        temp_blocks = []
        latestNumOfBlocks = 0
        isMonitoring = True        
        get_diff_blocks()
        clear_temp_blocks()

def get_block(blockNum):
        # create Query
        get_block_query = iroha.query(
                'GetBlock',
                height = blockNum
        )
        # sign Query
        IrohaCrypto.sign_query(get_block_query, admin_priv_key)
        # send Query
        response = net.send_query(get_block_query)
        return response

def get_diff_blocks():
        print("called get_diff_blocks")
        global temp_blocks
        global latestNumOfBlocks

        print(f"latestNumOfBlocks before execute: {latestNumOfBlocks}")

        height = latestNumOfBlocks
        is_latest = False

        # get blocks from latestNumOfBlocks + 1
        while(not is_latest):
                height += 1
                response = get_block(height)

                if(response.error_response.error_code == 0):
                        temp_blocks.append(response)
                elif(response.error_response.error_code == 3):
                        print(response.error_response.message)
                        latestNumOfBlocks = height - 1
                        is_latest = True
        
        print(f"latestNumOfBlocks after execute: {latestNumOfBlocks}")

def clear_temp_blocks():
        print("called clear_temp_blocks")
        global temp_blocks
        temp_blocks = []

def monitoring_routine():
        get_diff_blocks()
        print("temp_blocks")
        print(temp_blocks)
        # send blocks to verifier
        # TODO implement
        #after sending, clear temp
        clear_temp_blocks()


# start monitoring
# when starting monitoring, call get_diff_blocks and clear_temp_blocks once as for get latest number of blocks 
init()

schedule.every(1).minutes.do(monitoring_routine)

while isMonitoring:
        schedule.run_pending()

print("finish")


