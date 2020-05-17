import convict from "convict";

export const validate = (sources: any[], schema?: any) => {
  if (!Array.isArray(sources)) {
    throw new Error("must be of type Array");
  }

  for (const source of sources) {
    convict(schema.pluginSchema).load(source).validate();
  }
};

export const coerce = (value: string) => {
  // CLI sends comman separated objects as a JSON string without the array square brackets
  // ENV sends the proper array that is valid JSON so we have to detect and handle both cases
  const isJsonArray = value.startsWith("[") && value.endsWith("]");
  return isJsonArray ? JSON.parse(value) : JSON.parse(`[${value}]`);
};

export const FORMAT_PLUGIN_ARRAY = {
  name: "plugin-array",
  validate,
  coerce,
};
