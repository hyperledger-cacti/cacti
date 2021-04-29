/*
    SPDX-License-Identifier: Apache-2.0
*/

import { ErrInvalidDateFormat, ErrUnknownUOM } from "../util/const";
import { UtilityEmissionsFactorInterface } from "./utilityEmissionsFactor";

//
const UOM_FACTORS: { [key: string]: number } = {
  wh: 1.0,
  kwh: 1000.0,
  mwh: 1000000.0,
  gwh: 1000000000.0,
  twh: 1000000000000.0,
  kg: 1.0,
  t: 1000.0,
  ton: 1000.0,
  tons: 1000.0,
  g: 0.001,
  kt: 1000000.0,
  mt: 1000000000.0,
  pg: 1000000000.0,
  gt: 1000000000000.0,
};

export const getUomFactor = (uom: string): number => {
  const factor = UOM_FACTORS[uom.toLowerCase()];
  if (!factor) {
    throw new Error(`${ErrUnknownUOM} : ${uom} is not a valid uom`);
  }
  return factor;
};

export const getYearFromDate = (date: string): number => {
  const time = new Date(date);
  if (!time.getFullYear()) {
    throw new Error(
      `${ErrInvalidDateFormat} : ${date} date format not supported`,
    );
  }
  return time.getFullYear();
};

interface CO2EmissionFactorInterface {
  emission: {
    value: number;
    uom: string;
  };
  division_type: string;
  division_id: string;
  renewable_energy_use_amount: number;
  nonrenewable_energy_use_amount: number;
  year: number;
}

export function getCO2EmissionFactor(
  factor: UtilityEmissionsFactorInterface,
  usage: number,
  usageUOM: string,
): CO2EmissionFactorInterface {
  // initialize return variables
  let emissionsValue: number;
  let emissionsUOM: string;
  let renewableEnergyUseAmount: number;
  let nonrenewableEnergyUseAmount: number;

  // calculate emissions using percent_of_renewables if found
  if (factor.percent_of_renewables.length !== 0) {
    emissionsUOM = "g";
    const co2EquivalentEmissionsUOM = factor.co2_equivalent_emissions_uom.split(
      "/",
    );
    if (co2EquivalentEmissionsUOM.length === 0) {
      console.error("co2_equivalent_emissions_uom not found in factor");
    }
    emissionsValue =
      (Number(factor.co2_equivalent_emissions) *
        usage *
        getUomFactor(co2EquivalentEmissionsUOM[0])) /
      getUomFactor(co2EquivalentEmissionsUOM[1]);
    const percentOfRenewables = Number(factor.percent_of_renewables) / 100;
    renewableEnergyUseAmount = usage * percentOfRenewables;
    nonrenewableEnergyUseAmount = usage * (1 - percentOfRenewables);
  } else {
    emissionsUOM = "tons";

    const net_generation_uom = factor.net_generation_uom;
    const co2_equivalent_emissions_uom = factor.co2_equivalent_emissions_uom;

    const usageUOMConversion =
      getUomFactor(usageUOM) / getUomFactor(net_generation_uom);
    const emissionsUOMConversion =
      getUomFactor(co2_equivalent_emissions_uom) / getUomFactor(emissionsUOM);

    emissionsValue =
      (Number(factor.co2_equivalent_emissions) /
        Number(factor.net_generation)) *
      usage *
      usageUOMConversion *
      emissionsUOMConversion;

    const totalGeneration =
      Number(factor.non_renewables) + Number(factor.renewables);
    renewableEnergyUseAmount =
      usage * (Number(factor.renewables) / totalGeneration);
    nonrenewableEnergyUseAmount =
      usage * (Number(factor.non_renewables) / totalGeneration);
  }
  return {
    emission: {
      value: emissionsValue,
      uom: emissionsUOM,
    },
    division_type: factor.division_type,
    division_id: factor.division_id,
    renewable_energy_use_amount: renewableEnergyUseAmount,
    nonrenewable_energy_use_amount: nonrenewableEnergyUseAmount,
    year: Number(factor.year),
  } as CO2EmissionFactorInterface;
}
