start: start-network1 start-network2

start-network1:
	bash scripts/setupNetwork.sh 1

start-network2:
	bash scripts/setupNetwork.sh 2

test: test-network1 test-network2

test-network1:
	bash scripts/testSetup.sh 1 8545

test-network2:
	bash scripts/testSetup.sh 2 9544

clean: clean-network1 clean-network2

clean-network1:
	tmux kill-session -t Network1_EthSigner_session || true
	tmux kill-session -t Network1_Node1_session || true
	tmux kill-session -t Network1_Node2_session || true
	tmux kill-session -t Network1_Node3_session || true
	tmux kill-session -t Network1_Node4_session || true
	rm -rf SampleBesuNetwork1/

clean-network2:
	tmux kill-session -t Network2_EthSigner_session || true
	tmux kill-session -t Network2_Node1_session || true
	tmux kill-session -t Network2_Node2_session || true
	tmux kill-session -t Network2_Node3_session || true
	tmux kill-session -t Network2_Node4_session || true
	rm -rf SampleBesuNetwork2/
