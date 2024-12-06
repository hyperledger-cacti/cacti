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

def create_and_serialize_model(ccLog):
    pn, im, fm = pm4py.discover_petri_net_inductive(ccLog)
    # pm4py.view_petri_net(pn, im, fm)
    return str(pn.places) + ";" + str(pn.transitions) + ";" + str(pn.arcs) + ";" + str(im) + ";" + str(fm)

##################################################################

def main():
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"File '{file_path}' does not exist")
        exit(1)
        
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.csv':
        ccLog = import_csv_original(file_path)
        serialized_model = create_and_serialize_model(ccLog)
        print(serialized_model)
    elif file_extension == '.json':
        ccLog = import_json_original(file_path)
        serialized_model = create_and_serialize_model(ccLog)
        print(serialized_model)
    else:
        print(f"Unsupported file type: {file_extension}")
        exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 create_model.py path_to_log_file")
        exit(1)
    
    main()