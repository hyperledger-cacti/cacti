export const HELLO_WORLD_CONTRACT_GO_MOD = `module hello-world-contract

go 1.14

require (
	github.com/Knetic/govaluate v3.0.0+incompatible // indirect
	github.com/Shopify/sarama v1.27.0 // indirect
	github.com/fsouza/go-dockerclient v1.6.5 // indirect
	github.com/grpc-ecosystem/go-grpc-middleware v1.2.1 // indirect
	github.com/hashicorp/go-version v1.2.1 // indirect
	github.com/hyperledger/fabric v1.4.8
	github.com/hyperledger/fabric-amcl v0.0.0-20200424173818-327c9e2cf77a // indirect
	github.com/miekg/pkcs11 v1.0.3 // indirect
	github.com/mitchellh/mapstructure v1.3.3 // indirect
	github.com/onsi/ginkgo v1.14.1 // indirect
	github.com/onsi/gomega v1.10.2 // indirect
	github.com/op/go-logging v0.0.0-20160315200505-970db520ece7 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/spf13/viper v1.7.1 // indirect
	github.com/stretchr/testify v1.6.1 // indirect
	github.com/sykesm/zap-logfmt v0.0.3 // indirect
	go.uber.org/zap v1.16.0 // indirect
	golang.org/x/crypto v0.0.0-20200820211705-5c72a883971a // indirect
	golang.org/x/net v0.0.0-20200904194848-62affa334b73 // indirect
	google.golang.org/grpc v1.31.1 // indirect
)
`;

const exportSourceToFs = async () => {
  const path = await import("path");
  const fs = await import("fs");
  const fileName = "./go.mod";
  const scriptPath = path.join(__dirname, fileName);
  fs.writeFileSync(scriptPath, HELLO_WORLD_CONTRACT_GO_MOD);
};

if (require.main === module) {
  exportSourceToFs();
}
