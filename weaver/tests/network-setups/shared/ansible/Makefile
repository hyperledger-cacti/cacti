INVENTORY_FILE ?= ./inventory/ansible_provisioners

all: setup 

.PHONY:	%
%:
ifndef ENVIRONMENT_FILE
    $(error Please specify the ENVIRONMENT_FILE variable to run the playbook)
endif
	ansible-playbook -i $(INVENTORY_FILE) $@.yaml -e @"$(ENVIRONMENT_FILE)"

