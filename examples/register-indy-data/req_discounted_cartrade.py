import time

from indy import anoncreds, did, ledger, pool, wallet, blob_storage

import json
import logging

import argparse
import os
import sys
from ctypes import *
from os.path import dirname, isfile

from indy.error import ErrorCode, IndyError

from src.utils import get_pool_genesis_txn_path, run_coroutine, PROTOCOL_VERSION, ensure_previous_request_applied

#use Requests
import requests


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# http request parameters
# http_req_params = {
#     "url": "http://localhost:5034/api/v1/bl/trades/",
#     "businessLogicID": "guks32pf",
#     "tradeParams": ["0xec709e1774f0ce4aba47b52a499f9abaaa159f71",
#                      "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55",
#                     "fuser01", "fuser02", 50, "CAR1"],
#     "authParams": ["<<company name>>"]
# }
http_req_params = {
    "url": "http://localhost:5034/api/v1/bl/trades/",
    "businessLogicID": "guks32pf",
    "tradeParams": ["0xec709e1774f0ce4aba47b52a499f9abaaa159f71",
                     "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55",
                    "fuser01", "fuser02", "CAR1"],
    "authParams": ["<<company name>>"]
}

proof_file_path = "/etc/cactus/indy-validator/myproof.json"

#parser = argparse.ArgumentParser(description='Run python getting-started scenario (Alice/Faber)')
parser = argparse.ArgumentParser(description='Run python getting-started scenario (Alice/Acme/Thrift)')
parser.add_argument('-t', '--storage_type', help='load custom wallet storage plug-in')
parser.add_argument('-l', '--library', help='dynamic library to load for plug-in')
parser.add_argument('-e', '--entrypoint', help='entry point for dynamic library')
parser.add_argument('-c', '--config', help='entry point for dynamic library')
parser.add_argument('-s', '--creds', help='entry point for dynamic library')
parser.add_argument('-p', '--proof_only', help="create only the proof, don't start the cartrade", action='store_true')
parser.add_argument('-f', '--force', help="force recreate the proof (even if already exists)", action='store_true')

args = parser.parse_args()

# check if we need to dyna-load a custom wallet storage plug-in
if args.storage_type:
    if not (args.library and args.entrypoint):
        parser.print_help()
        sys.exit(0)
    stg_lib = CDLL(args.library)
    result = stg_lib[args.entrypoint]()
    if result != 0:
        print("Error unable to load wallet storage", result)
        parser.print_help()
        sys.exit(0)

    # for postgres storage, also call the storage init (non-standard)
    if args.storage_type == "postgres_storage":
        try:
            print("Calling init_storagetype() for postgres:", args.config, args.creds)
            init_storagetype = stg_lib["init_storagetype"]
            c_config = c_char_p(args.config.encode('utf-8'))
            c_credentials = c_char_p(args.creds.encode('utf-8'))
            result = init_storagetype(c_config, c_credentials)
            print(" ... returns ", result)
        except RuntimeError as e:
            print("Error initializing storage, ignoring ...", e)

    print("Success, loaded wallet storage", args.storage_type)


async def run():
    logger.info("Getting started -> started")

    if (not isfile(proof_file_path)) or args.force:
        # Create dir for proof if doesn't already exist
        os.makedirs(dirname(proof_file_path), exist_ok=True)

        pool_ = {
            'name': 'pool1'
        }
        logger.info("Open Pool Ledger: {}".format(pool_['name']))
        pool_['genesis_txn_path'] = get_pool_genesis_txn_path(pool_['name'])
        pool_['config'] = json.dumps({"genesis_txn": str(pool_['genesis_txn_path'])})

        # Set protocol version 2 to work with Indy Node 1.4
        await pool.set_protocol_version(PROTOCOL_VERSION)

        try:
            await pool.create_pool_ledger_config(pool_['name'], pool_['config'])
        except IndyError as ex:
            if ex.error_code == ErrorCode.PoolLedgerConfigAlreadyExistsError:
                pass
        pool_['handle'] = await pool.open_pool_ledger(pool_['name'], None)

        logger.info("==============================")
        #logger.info("=== Getting Trust Anchor credentials for Faber, Acme, Thrift and Government  ==")
        logger.info("=== Getting Trust Anchor credentials for Acme  ==")
        logger.info("------------------------------")

        steward = {
            'name': "Sovrin Steward",
            'wallet_config': json.dumps({'id': 'sovrin_steward_wallet'}),
            'wallet_credentials': json.dumps({'key': 'steward_wallet_key'}),
            'pool': pool_['handle'],
            'seed': '000000000000000000000000Steward1'
        }

        await create_wallet(steward)

        logger.info("\"Sovrin Steward\" -> Create and store in Wallet DID from seed")
        steward['did_info'] = json.dumps({'seed': steward['seed']})
        steward['did'], steward['key'] = await did.create_and_store_my_did(steward['wallet'], steward['did_info'])

        logger.info("==============================")
        logger.info("== Getting Trust Anchor credentials - Government getting Verinym  ==")
        logger.info("------------------------------")

        government = {
            'name': 'Government',
            'wallet_config': json.dumps({'id': 'government_wallet'}),
            'wallet_credentials': json.dumps({'key': 'government_wallet_key'}),
            'pool': pool_['handle'],
            'role': 'TRUST_ANCHOR'
        }

        await getting_verinym(steward, government)

        logger.info("==============================")
        logger.info("== Getting Trust Anchor credentials - Acme getting Verinym  ==")
        logger.info("------------------------------")

        acme = {
            'name': 'Acme',
            'wallet_config': json.dumps({'id': 'acme_wallet'}),
            'wallet_credentials': json.dumps({'key': 'acme_wallet_key'}),
            'pool': pool_['handle'],
            'role': 'TRUST_ANCHOR'
        }

        await getting_verinym(steward, acme)

        logger.info("==============================")
        logger.info("== Getting Trust Anchor credentials - Thrift getting Verinym  ==")
        logger.info("------------------------------")

        thrift = {
            'name': 'Thrift',
            'wallet_config': json.dumps({'id': 'thrift_wallet'}),
            'wallet_credentials': json.dumps({'key': 'thrift_wallet_key'}),
            'pool': pool_['handle'],
            'role': 'TRUST_ANCHOR'
        }

        await getting_verinym(steward, thrift)

        logger.info("==============================")
        logger.info("=== Credential Schemas Setup ==")
        logger.info("------------------------------")

        logger.info("\"Government\" -> Create \"Job-Certificate\" Schema")
        job_certificate = {
            'name': 'Job-Certificate',
            'version': '0.2',
            'attributes': ['first_name', 'last_name', 'salary', 'employee_status', 'experience']
        }
        (government['job_certificate_schema_id'], government['job_certificate_schema']) = \
            await anoncreds.issuer_create_schema(government['did'], job_certificate['name'], job_certificate['version'],
                                                json.dumps(job_certificate['attributes']))
        job_certificate_schema_id = government['job_certificate_schema_id']

        logger.info("\"Government\" -> Send \"Job-Certificate\" Schema to Ledger")
        await send_schema(government['pool'], government['wallet'], government['did'], government['job_certificate_schema'])


        time.sleep(1)  # sleep 1 second before getting schema


        logger.info("==============================")
        logger.info("=== Acme Credential Definition Setup ==")
        logger.info("------------------------------")

        logger.info("\"Acme\" -> Get from Ledger \"Job-Certificate\" Schema")
        (acme['job_certificate_schema_id'], acme['job_certificate_schema']) = \
            await get_schema(acme['pool'], acme['did'], job_certificate_schema_id)

        logger.info("\"Acme\" -> Create and store in Wallet \"Acme Job-Certificate\" Credential Definition")
        job_certificate_cred_def = {
            'tag': 'TAG1',
            'type': 'CL',
            'config': {"support_revocation": False}
        }
        (acme['job_certificate_cred_def_id'], acme['job_certificate_cred_def']) = \
            await anoncreds.issuer_create_and_store_credential_def(acme['wallet'], acme['did'],
                                                                acme['job_certificate_schema'],
                                                                job_certificate_cred_def['tag'],
                                                                job_certificate_cred_def['type'],
                                                                json.dumps(job_certificate_cred_def['config']))

        logger.info("\"Acme\" -> Send \"Acme Job-Certificate\" Credential Definition to Ledger")
        await send_cred_def(acme['pool'], acme['wallet'], acme['did'], acme['job_certificate_cred_def'])

        logger.info("\"Acme\" -> Creates Revocation Registry")
        acme['tails_writer_config'] = json.dumps({'base_dir': "/tmp/indy_acme_tails", 'uri_pattern': ''})
        tails_writer = await blob_storage.open_writer('default', acme['tails_writer_config'])
        acme['revoc_reg_id'] = None
        #(acme['revoc_reg_id'], acme['revoc_reg_def'], acme['revoc_reg_entry']) = \
        #    await anoncreds.issuer_create_and_store_revoc_reg(acme['wallet'], acme['did'], 'CL_ACCUM', 'TAG1',
        #                                                      acme['job_certificate_cred_def_id'],
        #                                                      json.dumps({'max_cred_num': 5,
        #                                                                  'issuance_type': 'ISSUANCE_ON_DEMAND'}),
        #                                                      tails_writer)

        #logger.info("\"Acme\" -> Post Revocation Registry Definition to Ledger")
        #acme['revoc_reg_def_request'] = await ledger.build_revoc_reg_def_request(acme['did'], acme['revoc_reg_def'])
        #await ledger.sign_and_submit_request(acme['pool'], acme['wallet'], acme['did'], acme['revoc_reg_def_request'])

        #logger.info("\"Acme\" -> Post Revocation Registry Entry to Ledger")
        #acme['revoc_reg_entry_request'] = \
        #    await ledger.build_revoc_reg_entry_request(acme['did'], acme['revoc_reg_id'], 'CL_ACCUM',
        #                                               acme['revoc_reg_entry'])
        #await ledger.sign_and_submit_request(acme['pool'], acme['wallet'], acme['did'], acme['revoc_reg_entry_request'])


        logger.info("==============================")
        logger.info("== Alice setup ==")
        logger.info("------------------------------")

        alice = {
            'name': 'Alice',
            'wallet_config': json.dumps({'id': 'alice_wallet'}),
            'wallet_credentials': json.dumps({'key': 'alice_wallet_key'}),
            'pool': pool_['handle'],
        }
        await create_wallet(alice)
        (alice['did'], alice['key']) = await did.create_and_store_my_did(alice['wallet'], "{}")

        logger.info("\"Alice\" -> Create and store \"Alice\" Master Secret in Wallet")
        alice['master_secret_id'] = await anoncreds.prover_create_master_secret(alice['wallet'], None)


        logger.info("==============================")
        logger.info("== Apply for the job with Acme - Getting Job-Certificate Credential ==")
        logger.info("------------------------------")

        logger.info("\"Acme\" -> Create \"Job-Certificate\" Credential Offer for Alice")
        acme['job_certificate_cred_offer'] = \
            await anoncreds.issuer_create_credential_offer(acme['wallet'], acme['job_certificate_cred_def_id'])

        logger.info("\"Acme\" -> Send \"Job-Certificate\" Credential Offer to Alice")
        alice['job_certificate_cred_offer'] = acme['job_certificate_cred_offer']

        job_certificate_cred_offer_object = json.loads(alice['job_certificate_cred_offer'])

        logger.info("\"Alice\" -> Get \"Acme Job-Certificate\" Credential Definition from Ledger")
        (alice['acme_job_certificate_cred_def_id'], alice['acme_job_certificate_cred_def']) = \
            await get_cred_def(alice['pool'], alice['did'], job_certificate_cred_offer_object['cred_def_id'])

        logger.info("\"Alice\" -> Create and store in Wallet \"Job-Certificate\" Credential Request for Acme")
        (alice['job_certificate_cred_request'], alice['job_certificate_cred_request_metadata']) = \
            await anoncreds.prover_create_credential_req(alice['wallet'], alice['did'],
                                                        alice['job_certificate_cred_offer'],
                                                        alice['acme_job_certificate_cred_def'], alice['master_secret_id'])

        logger.info("\"Alice\" -> Send \"Job-Certificate\" Credential Request to Acme")
        alice['job_certificate_cred_values'] = json.dumps({
            "first_name": {"raw": "Alice", "encoded": "245712572474217942457235975012103335"},
            "last_name": {"raw": "Garcia", "encoded": "312643218496194691632153761283356127"},
            "employee_status": {"raw": "Permanent", "encoded": "2143135425425143112321314321"},
            "salary": {"raw": "2400", "encoded": "2400"},
            "experience": {"raw": "10", "encoded": "10"}
        })
        acme['job_certificate_cred_request'] = alice['job_certificate_cred_request']
        acme['job_certificate_cred_values'] = alice['job_certificate_cred_values']

        logger.info("\"Acme\" -> Create \"Job-Certificate\" Credential for Alice")
        acme['blob_storage_reader_cfg_handle'] = await blob_storage.open_reader('default', acme['tails_writer_config'])
        acme['job_certificate_cred'], acme['job_certificate_cred_rev_id'], acme['alice_cert_rev_reg_delta'] = \
            await anoncreds.issuer_create_credential(acme['wallet'], acme['job_certificate_cred_offer'],
                                                    acme['job_certificate_cred_request'],
                                                    acme['job_certificate_cred_values'],
                                                    acme['revoc_reg_id'],
                                                    acme['blob_storage_reader_cfg_handle'])

        #logger.info("\"Acme\" -> Post Revocation Registry Delta to Ledger")
        #acme['revoc_reg_entry_req'] = \
        #    await ledger.build_revoc_reg_entry_request(acme['did'], acme['revoc_reg_id'], 'CL_ACCUM',
        #                                               acme['alice_cert_rev_reg_delta'])
        #await ledger.sign_and_submit_request(acme['pool'], acme['wallet'], acme['did'], acme['revoc_reg_entry_req'])

        logger.info("\"Acme\" -> Send \"Job-Certificate\" Credential to Alice")
        alice['job_certificate_cred'] = acme['job_certificate_cred']
        job_certificate_cred_object = json.loads(alice['job_certificate_cred'])

        #logger.info("\"Alice\" -> Gets RevocationRegistryDefinition for \"Job-Certificate\" Credential from Acme")
        #alice['acme_revoc_reg_des_req'] = \
        #    await ledger.build_get_revoc_reg_def_request(alice['did'],
        #                                                 job_certificate_cred_object['rev_reg_id'])
        #alice['acme_revoc_reg_des_resp'] = \
        #    await ensure_previous_request_applied(alice['pool'], alice['acme_revoc_reg_des_req'],
        #                                          lambda response: response['result']['data'] is not None)
        #(alice['acme_revoc_reg_def_id'], alice['acme_revoc_reg_def_json']) = \
        #    await ledger.parse_get_revoc_reg_def_response(alice['acme_revoc_reg_des_resp'])
        alice['acme_revoc_reg_def_json'] = None

        logger.info("\"Alice\" -> Store \"Job-Certificate\" Credential")
        await anoncreds.prover_store_credential(alice['wallet'], None, alice['job_certificate_cred_request_metadata'],
                                                alice['job_certificate_cred'],
                                                alice['acme_job_certificate_cred_def'], alice['acme_revoc_reg_def_json'])

        logger.info("Creating Credential in Getting started -> done")

        logger.info("==============================")
        logger.info("=== Apply for the loan with Thrift ==")
        logger.info("==============================")

        async def apply_loan_basic():
            # This method will be called twice: once with a valid Job-Certificate and
            # the second time after the Job-Certificate has been revoked.
            logger.info("==============================")
            logger.info("== Apply for the loan with Thrift - Job-Certificate proving  ==")
            logger.info("------------------------------")

            #logger.info("\"Thrift\" -> Create \"Loan-Application-Basic\" Proof Request")
            logger.info("\"Alice\" -> Create \"Loan-Application-Basic\" Proof Request")
            nonce = await anoncreds.generate_nonce()
            #thrift['apply_loan_proof_request'] = json.dumps({
            alice['apply_loan_proof_request'] = json.dumps({
                'nonce': nonce,
                'name': 'Loan-Application-Basic',
                'version': '0.1',
                'requested_attributes': {
                    'attr1_referent': {
                        'name': 'employee_status',
                        'restrictions': [{'cred_def_id': acme['job_certificate_cred_def_id']}]
                    }
                },
                'requested_predicates': {
                    'predicate1_referent': {
                        'name': 'salary',
                        'p_type': '>=',
                        'p_value': 2000,
                        'restrictions': [{'cred_def_id': acme['job_certificate_cred_def_id']}]
                    },
                    'predicate2_referent': {
                        'name': 'experience',
                        'p_type': '>=',
                        'p_value': 1,
                        'restrictions': [{'cred_def_id': acme['job_certificate_cred_def_id']}]
                    }
                }#,
                # 'non_revoked': {'to': int(time.time())}
            })

            #logger.info("\"Thrift\" -> Send \"Loan-Application-Basic\" Proof Request to Alice")
            #alice['apply_loan_proof_request'] = thrift_apply_loan_proof_request
            logger.info("Creating Proof Request in Getting started -> done")

            logger.info("\"Alice\" -> Get credentials for \"Loan-Application-Basic\" Proof Request")

            search_for_apply_loan_proof_request = \
                await anoncreds.prover_search_credentials_for_proof_req(alice['wallet'],
                                                                        alice['apply_loan_proof_request'], None)

            cred_for_attr1 = await get_credential_for_referent(search_for_apply_loan_proof_request, 'attr1_referent')
            cred_for_predicate1 = await get_credential_for_referent(search_for_apply_loan_proof_request,
                                                                    'predicate1_referent')
            cred_for_predicate2 = await get_credential_for_referent(search_for_apply_loan_proof_request,
                                                                    'predicate2_referent')

            await anoncreds.prover_close_credentials_search_for_proof_req(search_for_apply_loan_proof_request)

            alice['creds_for_apply_loan_proof'] = {cred_for_attr1['referent']: cred_for_attr1,
                                                    cred_for_predicate1['referent']: cred_for_predicate1,
                                                    cred_for_predicate2['referent']: cred_for_predicate2}

            # requested_timestamp = int(json.loads(alice['apply_loan_proof_request'])['non_revoked']['to'])
            requested_timestamp = None
            alice['schemas_for_loan_app'], alice['cred_defs_for_loan_app'], alice['revoc_states_for_loan_app'] = \
                await prover_get_entities_from_ledger(alice['pool'], alice['did'],
                                                        alice['creds_for_apply_loan_proof'],
                                                        alice['name'], None, requested_timestamp)

            logger.info("\"Alice\" -> Create \"Loan-Application-Basic\" Proof")
            revoc_states_for_loan_app = json.loads(alice['revoc_states_for_loan_app'])
            timestamp_for_attr1 = get_timestamp_for_attribute(cred_for_attr1, revoc_states_for_loan_app)
            timestamp_for_predicate1 = get_timestamp_for_attribute(cred_for_predicate1, revoc_states_for_loan_app)
            timestamp_for_predicate2 = get_timestamp_for_attribute(cred_for_predicate2, revoc_states_for_loan_app)
            alice['apply_loan_requested_creds'] = json.dumps({
                'self_attested_attributes': {},
                'requested_attributes': {
                    'attr1_referent': {'cred_id': cred_for_attr1['referent'], 'revealed': True,
                                        'timestamp': timestamp_for_attr1}
                },
                'requested_predicates': {
                    'predicate1_referent': {'cred_id': cred_for_predicate1['referent'],
                                            'timestamp': timestamp_for_predicate1},
                    'predicate2_referent': {'cred_id': cred_for_predicate2['referent'],
                                            'timestamp': timestamp_for_predicate2}
                }
            })
            alice['apply_loan_proof'] = \
                await anoncreds.prover_create_proof(alice['wallet'], alice['apply_loan_proof_request'],
                                                    alice['apply_loan_requested_creds'], alice['master_secret_id'],
                                                    alice['schemas_for_loan_app'], alice['cred_defs_for_loan_app'],
                                                    alice['revoc_states_for_loan_app'])

            logger.info("Creating Proof in Getting started -> done")

            logger.info("\"Alice\" -> Send \"Loan-Application-Basic\" Proof to Thrift")
            logger.info(json.dumps(alice['apply_loan_proof']))
            # logger.info("USER_PROOF_REQUEST: " + json.dumps(alice['apply_loan_proof_request']))
            # logger.info("USER_PROOF: " + json.dumps(alice['apply_loan_proof']))
            # logger.info('{ "proof_request": ' + json.dumps(alice['apply_loan_proof_request']) + ', "proof": ' + json.dumps(alice['apply_loan_proof']) + ' }')

            # request_str = '{ "proof_request": ' + json.dumps(alice['apply_loan_proof_request']) + ', "proof": ' + json.dumps(alice['apply_loan_proof']) + ' }'
            # logger.info(request_str)

            ##request_json = { "proof_request": json.dumps(alice['apply_loan_proof_request']), "proof": json.dumps(alice['apply_loan_proof'])}
            request_json = { "proof_request": alice['apply_loan_proof_request'], "proof": alice['apply_loan_proof']}
            logger.info(json.dumps(request_json))

            # create_user_proof_file(proof_file_path, json.dumps(request_str))
            create_user_proof_file(proof_file_path, json.dumps(request_json))

        await apply_loan_basic()

    if not args.proof_only:
        request_discounted_cartrade(proof_file_path)

    print("Done.")

def wallet_config(operation, wallet_config_str):
    if not args.storage_type:
        return wallet_config_str
    wallet_config_json = json.loads(wallet_config_str)
    wallet_config_json['storage_type'] = args.storage_type
    if args.config:
        wallet_config_json['storage_config'] = json.loads(args.config)
    # print(operation, json.dumps(wallet_config_json))
    return json.dumps(wallet_config_json)


def wallet_credentials(operation, wallet_credentials_str):
    if not args.storage_type:
        return wallet_credentials_str
    wallet_credentials_json = json.loads(wallet_credentials_str)
    if args.creds:
        wallet_credentials_json['storage_credentials'] = json.loads(args.creds)
    # print(operation, json.dumps(wallet_credentials_json))
    return json.dumps(wallet_credentials_json)


async def create_wallet(identity):
    logger.info("\"{}\" -> Create wallet".format(identity['name']))
    try:
        await wallet.create_wallet(wallet_config("create", identity['wallet_config']),
                                   wallet_credentials("create", identity['wallet_credentials']))
    except IndyError as ex:
        if ex.error_code == ErrorCode.PoolLedgerConfigAlreadyExistsError:
            pass
    identity['wallet'] = await wallet.open_wallet(wallet_config("open", identity['wallet_config']),
                                                  wallet_credentials("open", identity['wallet_credentials']))


async def getting_verinym(from_, to):
    await create_wallet(to)

    (to['did'], to['key']) = await did.create_and_store_my_did(to['wallet'], "{}")

    from_['info'] = {
        'did': to['did'],
        'verkey': to['key'],
        'role': to['role'] or None
    }

    await send_nym(from_['pool'], from_['wallet'], from_['did'], from_['info']['did'],
                   from_['info']['verkey'], from_['info']['role'])


async def send_nym(pool_handle, wallet_handle, _did, new_did, new_key, role):
    nym_request = await ledger.build_nym_request(_did, new_did, new_key, None, role)
    await ledger.sign_and_submit_request(pool_handle, wallet_handle, _did, nym_request)


async def send_schema(pool_handle, wallet_handle, _did, schema):
    schema_request = await ledger.build_schema_request(_did, schema)
    await ledger.sign_and_submit_request(pool_handle, wallet_handle, _did, schema_request)


async def send_cred_def(pool_handle, wallet_handle, _did, cred_def_json):
    cred_def_request = await ledger.build_cred_def_request(_did, cred_def_json)
    await ledger.sign_and_submit_request(pool_handle, wallet_handle, _did, cred_def_request)


async def get_schema(pool_handle, _did, schema_id):
    get_schema_request = await ledger.build_get_schema_request(_did, schema_id)
    get_schema_response = await ensure_previous_request_applied(
        pool_handle, get_schema_request, lambda response: response['result']['data'] is not None)
    return await ledger.parse_get_schema_response(get_schema_response)


async def get_cred_def(pool_handle, _did, cred_def_id):
    get_cred_def_request = await ledger.build_get_cred_def_request(_did, cred_def_id)
    get_cred_def_response = \
        await ensure_previous_request_applied(pool_handle, get_cred_def_request,
                                              lambda response: response['result']['data'] is not None)
    return await ledger.parse_get_cred_def_response(get_cred_def_response)


async def get_credential_for_referent(search_handle, referent):
    credentials = json.loads(
        await anoncreds.prover_fetch_credentials_for_proof_req(search_handle, referent, 10))
    return credentials[0]['cred_info']


def get_timestamp_for_attribute(cred_for_attribute, revoc_states):
    if cred_for_attribute['rev_reg_id'] in revoc_states:
        return int(next(iter(revoc_states[cred_for_attribute['rev_reg_id']])))
    else:
        return None


async def prover_get_entities_from_ledger(pool_handle, _did, identifiers, actor, timestamp_from=None,
                                          timestamp_to=None):
    schemas = {}
    cred_defs = {}
    rev_states = {}
    for item in identifiers.values():
        logger.info("\"{}\" -> Get Schema from Ledger".format(actor))
        (received_schema_id, received_schema) = await get_schema(pool_handle, _did, item['schema_id'])
        schemas[received_schema_id] = json.loads(received_schema)

        logger.info("\"{}\" -> Get Claim Definition from Ledger".format(actor))
        (received_cred_def_id, received_cred_def) = await get_cred_def(pool_handle, _did, item['cred_def_id'])
        cred_defs[received_cred_def_id] = json.loads(received_cred_def)

        if 'rev_reg_id' in item and item['rev_reg_id'] is not None:
            # Create Revocations States
            logger.info("\"{}\" -> Get Revocation Registry Definition from Ledger".format(actor))
            get_revoc_reg_def_request = await ledger.build_get_revoc_reg_def_request(_did, item['rev_reg_id'])

            get_revoc_reg_def_response = \
                await ensure_previous_request_applied(pool_handle, get_revoc_reg_def_request,
                                                      lambda response: response['result']['data'] is not None)
            (rev_reg_id, revoc_reg_def_json) = await ledger.parse_get_revoc_reg_def_response(get_revoc_reg_def_response)

            logger.info("\"{}\" -> Get Revocation Registry Delta from Ledger".format(actor))
            if not timestamp_to: timestamp_to = int(time.time())
            get_revoc_reg_delta_request = \
                await ledger.build_get_revoc_reg_delta_request(_did, item['rev_reg_id'], timestamp_from, timestamp_to)
            get_revoc_reg_delta_response = \
                await ensure_previous_request_applied(pool_handle, get_revoc_reg_delta_request,
                                                      lambda response: response['result']['data'] is not None)
            (rev_reg_id, revoc_reg_delta_json, t) = \
                await ledger.parse_get_revoc_reg_delta_response(get_revoc_reg_delta_response)

            tails_reader_config = json.dumps(
                {'base_dir': dirname(json.loads(revoc_reg_def_json)['value']['tailsLocation']),
                 'uri_pattern': ''})
            blob_storage_reader_cfg_handle = await blob_storage.open_reader('default', tails_reader_config)

            logger.info('%s - Create Revocation State', actor)
            rev_state_json = \
                await anoncreds.create_revocation_state(blob_storage_reader_cfg_handle, revoc_reg_def_json,
                                                        revoc_reg_delta_json, t, item['cred_rev_id'])
            rev_states[rev_reg_id] = {t: json.loads(rev_state_json)}

    return json.dumps(schemas), json.dumps(cred_defs), json.dumps(rev_states)


async def verifier_get_entities_from_ledger(pool_handle, _did, identifiers, actor, timestamp=None):
    schemas = {}
    cred_defs = {}
    rev_reg_defs = {}
    rev_regs = {}
    for item in identifiers:
        logger.info("\"{}\" -> Get Schema from Ledger".format(actor))
        (received_schema_id, received_schema) = await get_schema(pool_handle, _did, item['schema_id'])
        schemas[received_schema_id] = json.loads(received_schema)

        logger.info("\"{}\" -> Get Claim Definition from Ledger".format(actor))
        (received_cred_def_id, received_cred_def) = await get_cred_def(pool_handle, _did, item['cred_def_id'])
        cred_defs[received_cred_def_id] = json.loads(received_cred_def)

        if 'rev_reg_id' in item and item['rev_reg_id'] is not None:
            # Get Revocation Definitions and Revocation Registries
            logger.info("\"{}\" -> Get Revocation Definition from Ledger".format(actor))
            get_revoc_reg_def_request = await ledger.build_get_revoc_reg_def_request(_did, item['rev_reg_id'])

            get_revoc_reg_def_response = \
                await ensure_previous_request_applied(pool_handle, get_revoc_reg_def_request,
                                                      lambda response: response['result']['data'] is not None)
            (rev_reg_id, revoc_reg_def_json) = await ledger.parse_get_revoc_reg_def_response(get_revoc_reg_def_response)

            logger.info("\"{}\" -> Get Revocation Registry from Ledger".format(actor))
            if not timestamp: timestamp = item['timestamp']
            get_revoc_reg_request = \
                await ledger.build_get_revoc_reg_request(_did, item['rev_reg_id'], timestamp)
            get_revoc_reg_response = \
                await ensure_previous_request_applied(pool_handle, get_revoc_reg_request,
                                                      lambda response: response['result']['data'] is not None)
            (rev_reg_id, rev_reg_json, timestamp2) = await ledger.parse_get_revoc_reg_response(get_revoc_reg_response)

            rev_regs[rev_reg_id] = {timestamp2: json.loads(rev_reg_json)}
            rev_reg_defs[rev_reg_id] = json.loads(revoc_reg_def_json)

    return json.dumps(schemas), json.dumps(cred_defs), json.dumps(rev_reg_defs), json.dumps(rev_regs)

def create_user_proof_file(json_file, user_proof):
    logger.info(f"called create_user_proof_file()")
    with open(json_file, 'w') as file:
        file.write(user_proof)
    logger.info(f"Saved proof to {json_file}")

def request_discounted_cartrade(json_file):
    # read json file
    json_str = ""
    with open(json_file, 'r') as file:
        data = json.load(file)
        json_str = json.dumps(data)

    # append data of json file to http req param
    http_req_params["tradeParams"].append(json_str)

    # logger.info(f"http_params: url: {http_req_params['url']}")
    # logger.info(f"http_params: businessLogicID: {http_req_params['businessLogicID']}")
    # logger.info(f"http_params: tradeParams: {http_req_params['tradeParams']}")
    # logger.info(f"http_params: authParams: {http_req_params['authParams']}")

    logger.info(f"http_params")

    req_url = http_req_params["url"]
    req_header = {'Content-Type': 'application/json'}
    req_body = {'businessLogicID': http_req_params["businessLogicID"],
                    'tradeParams': http_req_params["tradeParams"],
                    'authParams':  http_req_params["authParams"]}

    logger.info(f"req_body: {req_body}")


    # response = requests.post(
    #     http_req_params["url"],
    #     json.dumps({'businessLogicID': http_req_params["businessLogicID"],
    #                 'tradeParams': http_req_params["tradeParams"],
    #                 'authParams':  http_req_params["authParams"]}),
    #     headers={'Content-Type': 'application/json'})

    # send request
    response = requests.post(req_url, headers=req_header, data=json.dumps(req_body))
    logger.info("return requests.post()")
    logger.info("http_params: authParams: {}".format(http_req_params["authParams"]))
    print(f"return requests.post()")
    print(f"resp: {response}")
    print(f"resp.text: {response.text}")
    print(f"##----")

if __name__ == '__main__':
    run_coroutine(run)
    time.sleep(1)  # FIXME waiting for libindy thread complete
