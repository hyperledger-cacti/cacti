import { Objects } from "../../../../main/typescript/public-api";
import "jest-extended";

test("tests for get the properties of object", async () => {
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

  expect(Array.isArray(fieldNames)).toBeTruthy();
  expect(fieldNames.length).toBe(arrayResultExpected.length);
  expect(Object.prototype.hasOwnProperty.call(student, "course")).toBeTruthy();
  expect(fieldNames.includes("course")).toBeTruthy();
  expect(fieldNames).toStrictEqual(arrayResultExpected);
});
