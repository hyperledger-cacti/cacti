import dataclasses
import yaml

pathNodeSettings = "/etc/cactus-indy/node-settings.yaml"
pathNodeValidatorRegistry = "/etc/cactus-indy/node-validator-registry.yaml"
pathValidatorSettings = "/etc/cactus-indy/validator-001-settings.yaml"
pathValidatorSecrets = "/etc/cactus-indy/validator-001-secrets.yaml"

#dataclass for validator-<DLT id>-settings.yml
#data members should be equal to yml
@dataclasses.dataclass
class NodeSettings:
    port: int
    logging_dir: str

#dataclass for validator-<DLT id>-settings.yml
#data members should be equal to yml
@dataclasses.dataclass
class NodeValidatorRegistry:
    proto: str
    url: str
    publickey: str

#dataclass for validator-<DLT id>-settings.yml
#data members should be equal to yml
@dataclasses.dataclass
class ValidatorSettings:
    port: int

#dataclass for validator-<DLT id>-settings.yml
#data members should be equal to yml
@dataclasses.dataclass
class ValidatorSecrets:
    sign_key: str
    auth_credential: str

@dataclasses.dataclass
class Settings:
    nodeSettings: NodeSettings = None
    nodeValidatorRegistry: NodeValidatorRegistry = None
    validatorSettings: ValidatorSettings = None
    validatorSecrets: ValidatorSecrets = None

    # this method is automatically implemented after generate object
    def __post_init__(self):

        self.validatorSettings = ValidatorSettings(**(self.loadYaml(pathNodeSettings)))
        self.validatorSettings = ValidatorSettings(**(self.loadYaml(pathNodeValidatorRegistry)))
        self.validatorSettings = ValidatorSettings(**(self.loadYaml(pathValidatorSettings)))
        self.validatorSettings = ValidatorSettings(**(self.loadYaml(pathValidatorSecrets)))


    def loadYaml(self, yamlFilePath):
        # load usersettings file
        with open(pathValidatorSettings) as yamlFile:
            yamlObj = yaml.safe_load(yamlFile)

        return yamlObj
