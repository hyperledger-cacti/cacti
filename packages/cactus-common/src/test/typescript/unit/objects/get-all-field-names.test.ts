import test, { Test } from "tape";
import { Objects } from "../../../../main/typescript/public-api";

test("tests for get the properties of object", async (assert: Test) => {
  const student = {
    name: "Jack",
    last_name: "Santos",
    age: 20,
    state: "California",
    city: "San Francisco",
    course: "Architecture",
  };

  const fieldNames = Objects.getAllFieldNames(student);
  const arrayResultExpected = [
    "name",
    "last_name",
    "age",
    "state",
    "city",
    "course",
  ];

  assert.ok(Array.isArray(fieldNames), "expect an array of strings returned");
  assert.ok(
    fieldNames.length === arrayResultExpected.length,
    "Arrays have same length",
  );
  assert.ok(
    Object.prototype.hasOwnProperty.call(student, "course"),
    '"course" property present in object',
  );
  assert.ok(fieldNames.includes("course"), '"course" element present in array');
  assert.deepEqual(fieldNames, arrayResultExpected);
  assert.end();
});
