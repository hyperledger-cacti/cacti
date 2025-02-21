// todo implement service by calling internal compomnents (public functions of oracle manager)
/*
GOAL
Goal is to implement an oracle that allows data transfers, keeping accountability. gateway notarizes data (produces a proof with bungee) and persists the data on target + notarization

IDEA:
instead of Register data transfer task,that is ran on specific conditions, do a one-time data transfer task

input parameters include
4. if event name, then also event fields 5. if function endponit, which method and parameters
6. session id (for data transfer)
7. (optional) callbackurl for notifications
smart contract addresses, functions, and parameters for source and target chains, etc

returns an ID (of data transfer task, taskID) to be used in the status endpoint;
*/
