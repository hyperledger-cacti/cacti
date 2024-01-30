import { Empty } from "@bufbuild/protobuf";
import { Message, ModifyMessageRequest, ModifyMessageResponse } from '../../generated/proto/test/message_pb';
import { HandlerContext } from '@connectrpc/connect';

export const TestImplementation2: any = {
  async getMessage(req: Empty, context: HandlerContext): Promise<Message> {
    console.log("Received request", req);
    return new Message({
        content: "Hello, SATP!" + "2"	
    });
  },
};
