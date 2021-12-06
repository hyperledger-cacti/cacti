export class RequestInfo {
  businessLogicID: string = null;
  tradeID: string = null;

  setBusinessLogicID(businessLogicID: string) {
    this.businessLogicID = businessLogicID;
  }

  setTradeID(tradeID: string) {
    this.tradeID = tradeID;
  }
}
