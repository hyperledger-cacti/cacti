import os
path = os.getcwd()
parent = os.path.dirname(path)

import sys
import pm4py
import datetime as dt
import time
import pandas

# process mining
from pm4py.algo.discovery.alpha import algorithm as alpha_miner
from pm4py.algo.discovery.inductive import algorithm as inductive_miner
from pm4py.algo.discovery.heuristics import algorithm as heuristics_miner
from pm4py.algo.discovery.dfg import algorithm as dfg_discovery

# viz
from pm4py.visualization.petri_net import visualizer as pn_visualizer
from pm4py.visualization.process_tree import visualizer as pt_visualizer
from pm4py.visualization.heuristics_net import visualizer as hn_visualizer
from pm4py.visualization.dfg import visualizer as dfg_visualization

from pm4py.objects.conversion.process_tree import converter as pt_converter

def import_csv_original(file_path):
    event_log = pandas.read_csv(file_path, sep=';')
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def getStartActivities(event_log):
    s = pm4py.get_start_activities(event_log)
    print("Start activities: {}\n".format(s))
    return s
def getEndActivities(event_log):
    e = pm4py.get_end_activities(event_log)
    print("End activities: {}\n".format(e))
    return (e)

def getAttributeFromLog(event_log, attr):
    entries = pm4py.get_event_attribute_values(event_log,attr)
    print("Entries: {}\n".format(entries))
    return entries


def main():
    start_time = time.perf_counter()
    #######################

    print("path is:\n", file_path)
    log = import_csv_original(file_path)
    print(log)
    print("leght is", len(log))
    startAct = getStartActivities(log)
    endAct = getEndActivities(log)
    timestamps = getAttributeFromLog(log, "timestamp")

    process_tree = pm4py.discover_process_tree_inductive(log)
    print("generated-process-tree:",process_tree)


    #######################
    end_time = time.perf_counter()
    timeDiff = end_time - start_time

    # in ms
    print(f"EVAL-ccModel-DUMMY:{timeDiff*1000:0.2f}" )


if __name__ == '__main__':
    print(sys.argv)
    CSV_FILE = sys.argv[1]
    OUTPUT_DIR = "/blockchain-integration-framework/packages/cactus-plugin-cc-tx-visualization/src/main/test-results/"
    CSV_DIR = "/blockchain-integration-framework/packages/cactus-plugin-cc-tx-visualization/src/main/csv/"
   
    file_path = parent + CSV_DIR + CSV_FILE
    print(file_path)
    main()

