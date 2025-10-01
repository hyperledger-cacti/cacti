import sys
# uncomment if problems with dependencies
#%pip install pm4py
import pm4py
from pm4py.objects.petri_net.obj import PetriNet, Marking
from pm4py.objects.petri_net.utils import petri_utils

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

##################################################################

def main():
    (petri_net, initial_marking, final_marking) = unserialize_model(serialized_model)
    process_tree = pm4py.convert_to_process_tree(petri_net, initial_marking, final_marking)
    print(process_tree)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 convert_model.py serialized_model")
        exit(1)
    
    serialized_model = sys.argv[1]
    main()