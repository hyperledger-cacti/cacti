import { execSync } from "child_process";

import path from "path";

export function createModelPM4PY(file_name: string): string {
  const createModelScript = path.join(__dirname, "create_model.py");
  const command = `python3 ${createModelScript} ${file_name}`;

  try {
    const startTime = new Date();
    const serializedCCModel = execSync(command).toString("utf-8");
    const finalTime = new Date();
    console.log(
      `CREATE-MODEL-PM4PY:${finalTime.getTime() - startTime.getTime()}`,
    );
    return serializedCCModel;
  } catch (error) {
    console.error(`Error executing ${command}:`, error);
    throw error;
  }
}

export function checkConformancePM4PY(
  file_name: string,
  serializedCCModel: string,
): string {
  const checkConformanceScript = path.join(__dirname, "check_conformance.py");
  const command = `python3 ${checkConformanceScript} ${file_name} \'${serializedCCModel}\'`;

  try {
    const checkOutput = execSync(command).toString("utf-8");
    return checkOutput;
  } catch (error) {
    console.error(`Error executing ${command}:`, error);
    throw error;
  }
}

export function convertToProcessTreePM4PY(
  serializedCCModel: string,
): string | undefined {
  const ConvertModelScript = path.join(__dirname, "convert_model.py");
  const command = `python3 ${ConvertModelScript} \'${serializedCCModel}\' ProcessTree`;

  try {
    const output = execSync(command, { encoding: "utf-8" });
    return output;
  } catch (error) {
    console.error(`Error executing ${command}:`, error);
    throw error;
  }
}

// // not needed?
// // this is just assigning the serialized process to hepheastus' ccmodel
// export function processModelToCCModelPM4PY(
//   ccmodel: CrossChainModel,
//   // processModel: string,
// ): CrossChainModel {
//   // something like that
//   // ccmodel.setModel(ccmodel.ccModelType, processModel);
//   return ccmodel;
// }

// // converts the ccmodel into process model for later conformance checking
// // if needed it's going to be different
// export function ccModelToProcessModelPM4PY(
//   model: CrossChainModel,
//   modelType: CrossChainModelType,
// ): string {
//   let processModel: string | undefined;
//   if (modelType == CrossChainModelType.PetriNet) {
//     // call pm4py to make PetriNet
//     processModel = model.getModel(CrossChainModelType.PetriNet);
//   } else if (modelType == CrossChainModelType.ProcessTree) {
//     // call pm4py to make ProcessTree
//     processModel = model.getModel(CrossChainModelType.ProcessTree);
//   } else {
//     return "failed";
//   }

//   const processModelToCCModel = path.join(
//     __dirname,
//     "ccmodel_to_process_model.py", // serializes the ccmodel
//   );
//   const command = `python3 ${processModelToCCModel} ${modelType} ${processModel}`;

//   try {
//     const output = execSync(command, { encoding: "utf-8" });
//     console.log("Command output:", output);
//     // return parseMP4PYOutput(output);
//     return output;
//   } catch (error) {
//     console.error(`Error executing ${command}:`, error);
//     throw error;
//   }
// }
