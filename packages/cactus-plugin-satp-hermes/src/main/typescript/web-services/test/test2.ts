import { Empty } from "@bufbuild/protobuf";
import { Message } from "../../generated/proto/test/message_pb";
import { HandlerContext } from "@connectrpc/connect";

export const TestImplementation2: any = {
  async getMessage(req: Empty, context: HandlerContext): Promise<Message> {
    console.log("Received request", req, context);
    return new Message({
      content: "Hello, SATP!" + "2",
    });
  },
};
