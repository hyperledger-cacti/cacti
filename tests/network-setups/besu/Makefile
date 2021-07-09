start:
	bash scripts/setupNetwork.sh

clean:
	tmux kill-session -t EthSigner_session || true
	tmux kill-session -t Node-1_session || true
	tmux kill-session -t Node-2_session || true
	tmux kill-session -t Node-3_session || true
	tmux kill-session -t Node-4_session || true
	rm -rf SampleBesuNetwork/

test:
	bash scripts/testSetup.sh
