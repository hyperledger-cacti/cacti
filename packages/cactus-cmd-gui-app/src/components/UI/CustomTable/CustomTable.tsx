import { Component } from "solid-js";
import "./CustomTable.css";
import { TableProps, TableProperty } from "../../../schema/supabase-types";

const CustomTable: Component<{ cols: TableProps; data: any[] }> = (props) => {
  const getObjPropVal = (objProp: string[], row: any) => {
    if (objProp.length === 1) return row[objProp[0]];
    else {
      return objProp.map((prop) => (
        <>
          {row[prop]}
          <br></br>
        </>
      ));
    }
  };
  const handleRowClick = (row: any) => {
    props.cols.onClick.action(row[props.cols.onClick.prop]);
  };

  return (
    <table>
      <thead>
        <tr>
          {props.cols.schema.map((col, idx) => (
            <th>{col.display}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.data.map((row) => {
          return (
            <tr>
              {props.cols.schema.map((col: TableProperty, idx) => (
                <td onClick={() => handleRowClick(row)}>
                  {getObjPropVal(col.objProp, row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default CustomTable;
