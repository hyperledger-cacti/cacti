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
from pm4py.objects.petri_net.obj import PetriNet, Marking
from pm4py.objects.petri_net.utils import petri_utils

#chage path if necessary
path = os.getcwd()
parent = os.path.dirname(path)
csv_dir = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/test/csv"
json_dir = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/test/json"
pnml_file = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/main/typescript/pm4py-adapter/process_models/pnml/petri_output.pnml"

##################################################################

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

def unserialize_and_check_conformance_file(ccLog):
    net, initial_marking, final_marking = pm4py.read_pnml(pnml_file)
    # pm4py.view_petri_net(net, initial_marking, final_marking)

    # check  conformance:
    print("\n----diagnostics:")
    diagnostics = pm4py.conformance_diagnostics_alignments(ccLog, net, initial_marking, final_marking)
    print(diagnostics)

##################################################################

def divide_model(model):
    split_model = model.split(';')
    return split_model[0], split_model[1], split_model[2], split_model[3], split_model[4]

def get_from_to_arc(arc):
    if '->' in arc:
        return arc.split('->')
    else:
        return None, None

def get_place(places_set, name):
    for place in places_set:
        if place.name == name:
            return place
    return None

def get_transition(transitions_set, name):
    name = name[1:name.find(',')]
    for transition in transitions_set:
        if transition.name == name:
            return transition
    return None

def unserialize_model(model):
    (places_str, transitions_str, arcs_str, im_str, fm_str) = divide_model(model)

    net = PetriNet("unserialized__petri_net")

    #unserialize places:
    places_str = places_str[1:-1].replace(" ", "")
    places_str_list = places_str.split(',') # creates a list of stringed places
    for place_str in places_str_list:
        net.places.add(PetriNet.Place(place_str)) # creates place from each string
    
    #unserialize transitions:
    transitions_str = transitions_str[1:-1].replace(" ", "").replace("(", "").replace(")", "")
    transitions_str_list = transitions_str.split(',') # creates a list of strings
    i = 0
    while i < len(transitions_str_list):
        if transitions_str_list[i] == 'None':
            net.transitions.add(PetriNet.Transition(None, transitions_str_list[i+1]))
        elif transitions_str_list[i+1] == 'None':
            net.transitions.add(PetriNet.Transition(transitions_str_list[i], None))
        else:
            net.transitions.add(PetriNet.Transition(transitions_str_list[i], transitions_str_list[i+1]))
        i += 2

    #unserialize arcs:
    arcs_str = arcs_str[1:-1].replace(" ", "")
    text_parsed = arcs_str
    arcs_list = []
    while True:
        next_parentisis = text_parsed.find(')')
        next_comma = text_parsed.find(',', next_parentisis, len(text_parsed))

        if next_parentisis != -1 and next_comma != -1:
            arcs_list.append(text_parsed[:next_comma])
            text_parsed = text_parsed[next_comma + 1:]
        else:
            break
    arcs_list.append(text_parsed[:len(text_parsed)])

    # creates arc from place names
    for arc in arcs_list:
        (source, target) = get_from_to_arc(arc)
        
        # source is a place, target is a transition
        if get_place(net.places, source) != None: 
            place = get_place(net.places, source)
            transition = get_transition(net.transitions, target)
            petri_utils.add_arc_from_to(place, transition, net)
        
        # target is a place, source is a transition
        elif get_place(net.places, target) != None:
            transition = get_transition(net.transitions, source)
            place = get_place(net.places, target)
            petri_utils.add_arc_from_to(transition, place, net)
        
        # target and source are both a transition or a place - cannot happen
        else:
            print("arcs cannot have the same type in source and target")
            exit(1)
    
    ### unserialize tokens
    im_info = im_str.replace("[", "").replace("]", "").replace("\'", "").split(':')
    fm_info = fm_str.replace("[", "").replace("]", "").replace("\'", "").split(':')
    initial_marking = Marking()
    im_place = get_place(net.places, im_info[0])
    fm_place = get_place(net.places, fm_info[0])
    initial_marking[im_place] = int(im_info[1])
    final_marking = Marking()
    final_marking[fm_place] = int(fm_info[1])

    return net, initial_marking, final_marking

def unserialize_and_check_conformance(ccLog):
    (net, initial_marking, final_marking) = unserialize_model(serialized_ccmodel)
    # pm4py.view_petri_net(net, initial_marking, final_marking)

    # check  conformance:
    diagnostics = pm4py.conformance_diagnostics_alignments(ccLog, net, initial_marking, final_marking)
    if diagnostics == []:
        print("No event log provided")
        return

    alignment = diagnostics[0]["alignment"]
    conforming_activities = []
    non_conforming_activities = []
    skipped_activities = []
    all_activities = []

    for activity in alignment:
        if activity[0] == ">>" and activity[1] != None:
            all_activities.append(activity)
            skipped_activities.append(activity)
        elif activity[0] != ">>" and activity[1] == ">>":
            all_activities.append(activity)
            non_conforming_activities.append(activity)
        elif activity[0] != None and activity[1] != None:
            all_activities.append(activity)
            conforming_activities.append(activity)
            
    # Check for non-confomant behaviour
    if len(non_conforming_activities) != 0:
        print("NON-CONFORMANCE:")
        print(non_conforming_activities)
        print(file)
        return

    if len(all_activities) == len(conforming_activities):
        print("FULL CONFORMANCE:")
        print(conforming_activities)
        print(file)
        return

    # If there were no skips in the case, then all the conforming activities 
    # will be the same as the initial activities of the model
    # If not, then there were skips that cannot be ignored
    ignore_skips = True
    for i in range(len(conforming_activities)):
        if(conforming_activities[i] != all_activities[i]):
            ignore_skips = False

    if ignore_skips == True:
        print("PARTIAL CONFORMANCE:")
        print(conforming_activities)
        print(file)
    else:
        print("SKIPPED ACTIVITY:")
        print(skipped_activities)
        print(file)

##################################################################

def main():
    file_csv = file + ".csv"
    file_json = file + ".json"

    file_path_csv = os.path.join(csv_dir, file_csv)
    file_path_json = os.path.join(json_dir, file_json)
    if (os.path.exists(file_path_csv)):
        ccLog = import_csv_original(file_path_csv)
        unserialize_and_check_conformance(ccLog)
    elif (os.path.exists(file_path_json)):
        ccLog = import_json_original(file_path_json)
        unserialize_and_check_conformance(ccLog)
    else:
        print(f"File '{file}' does not exist")
        print(file_path_json)
        exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 check_conformance.py file_with_new_logs serialized_ccmodel")
        exit(1)
    
    file = sys.argv[1]
    serialized_ccmodel = sys.argv[2]
    main()