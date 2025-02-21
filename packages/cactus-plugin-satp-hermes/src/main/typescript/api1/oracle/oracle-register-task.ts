// todo implement service by calling internal compomnents (public functions of oracle manager)
/*
GOAL
Goal is to implement an oracle that allows data transfers, keeping accountability. gateway notarizes data (produces a proof with bungee) and persists the data on target + notarization

IDEA:
Register data transfer task (automatic data transfer, needs trigger conditions)ORexecute data transfer task (perform one data transfer at current time)

General Config includes:
1. Source and target chain id
2. Source and target chain contract id
3. Source chain contract event name or function endpoint
4. if event name, then also event fields 5. if function endponit, which method and parameters
6. session id (for data transfer)
7. (optional) callbackurl for notifications

config for automatic data transfer
8. trigger conditions (eg fire event, return value on certain function call changes, time, 


returns an ID (of data transfer task, taskID) to be used in the status endpoint;
*/
