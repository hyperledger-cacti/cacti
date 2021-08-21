import os
import sys
from iroha import Iroha, IrohaCrypto, IrohaGrpc

ADMIN_ACCOUNT_ID = os.getenv("ADMIN_ACCOUNT_ID", "admin@test")
iroha_admin = Iroha(ADMIN_ACCOUNT_ID)
user_account = "admin@test"
iroha_user = Iroha(user_account)


def get_account(account: str, port: str):
    """Health check function"""
    # setup of iroha client address
    host = "127.0.0.1"
    net = IrohaGrpc(f"{host}:{port}")
    query = iroha_user.query("GetAccount", account_id=account)
    try:
        with open('/opt/iroha_data/admin@test.priv', 'r') as file:
            admin_private_key = file.read().strip()
    except Exception as e:
        print("Unable to read admin private key! Reason:", e)
        sys.exit(1)
    IrohaCrypto.sign_query(query, admin_private_key)
    response = net.send_query(query)
    # health check passes when response contains value of account parameter
    if response.account_response.account.account_id == user_account:
        print("Success!")
        sys.exit(0)
    # health check fails when response does not contain "admin@test"
    else:
        print(
            f"Successful connection, but account '{account}' does not exist!")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Must pass in 2 parameters as arguments! \n")
        print("Example: python3 heathcheck.py account ToriiPort")
        sys.exit(1)
    else:
        try:
            get_account(sys.argv[1], sys.argv[2])
        # health check fails when connection with Iroha client cannot establish
        except Exception as e:
            print("Connection failure! Reason:", e)
            sys.exit(1)
