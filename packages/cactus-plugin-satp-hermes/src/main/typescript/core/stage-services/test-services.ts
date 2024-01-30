import { ConnectRouter } from "@connectrpc/connect";
import { Message } from "../../generated/proto/test/message_pb";
import { TestService } from "../../generated/proto/test/message_connect";

export const testRouter = (router: ConnectRouter) =>
  // registers connectrpc.eliza.v1.ElizaService
  router.service(TestService, {
    // implements rpc Say
    async sendMessage(req) {
      return {
        sentence: `You said: ${req}`
      }
    },
  });

