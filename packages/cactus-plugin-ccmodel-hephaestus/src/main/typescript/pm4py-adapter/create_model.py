import sys
import os
# uncomment if problems with dependencies
#%pip install pm4py
#%pip install pandas
import pm4py
import time
import pandas
import pickle
import json

#chage path if necessary
path = os.getcwd()
parent = os.path.dirname(path)
csv_dir = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/test/csv"
json_dir = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/test/json"
pnml_file = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/main/typescript/pm4py-adapter/process_models/pnml/petri_output.pnml"

def import_csv_original(file_path):
    event_log = pandas.read_csv(file_path, sep=';')
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def import_json_original(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    event_log = pandas.DataFrame(data)
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

##################################################################
# unused

def create_and_serialize_model_file(ccLog):
    pn, im, fm = pm4py.discover_petri_net_inductive(ccLog)
    pm4py.write_pnml(pn, im, fm, pnml_file)

def create_and_serialize_model_pickle(ccLog):
    pn, im, fm = pm4py.discover_petri_net_inductive(ccLog)

    pn_str = pickle.dumps(pn)
    print(pn_str)
    im_str = pickle.dumps(im)
    print(im_str)
    fm_str = pickle.dumps(fm)
    print(fm_str)

    return pn_str + b"\n" + im_str + b"\n" + fm_str + b"\n"

##################################################################

def create_and_serialize_model(ccLog):
    pn, im, fm = pm4py.discover_petri_net_inductive(ccLog)
    # pm4py.view_petri_net(pn, im, fm)
    return str(pn.places) + ";" + str(pn.transitions) + ";" + str(pn.arcs) + ";" + str(im) + ";" + str(fm)

##################################################################

def main():
    file_csv = file + ".csv"
    file_json = file + ".json"

    file_path_csv = os.path.join(csv_dir, file_csv)
    file_path_json = os.path.join(json_dir, file_json)

    if (os.path.exists(file_path_csv)):
        ccLog = import_csv_original(file_path_csv)
        serialized_model = create_and_serialize_model(ccLog)
        print(serialized_model)
    elif (os.path.exists(file_path_json)):
        ccLog = import_json_original(file_path_json)
        serialized_model = create_and_serialize_model(ccLog)
        print(serialized_model)
    else:
        print(f"File '{file}' does not exist")
        exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 create_model_csv.py file_with_logs")
        exit(1)
    
    file = sys.argv[1]
    main()