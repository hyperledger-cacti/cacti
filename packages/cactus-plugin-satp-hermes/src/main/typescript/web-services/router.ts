import { ConnectRouter } from "@connectrpc/connect";
import { TestService } from '../generated/proto/test/message_connect';
import { TestService2 } from '../generated/proto/test/message_connect';

import { TestImplementation } from "./test/test";
import { TestImplementation2 } from "./test/test2";

export const configureRoutes = (router: ConnectRouter): void => {
    // TODO: add all services and respective implementations
    router.service(TestService, TestImplementation);
    router.service(TestService2, TestImplementation2);
};