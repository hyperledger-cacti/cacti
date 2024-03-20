import { TableProperty } from "../../../schema/supabase-types";

import EmptyTablePlaceholder from "./EmptyTablePlaceholder/EmptyTablePlaceholder";
import styles from "./CustomTable.module.css";
import { useEffect, useState } from "react";

function CustomTable(props) {
  const [viewport, setViewport] = useState("");

  useEffect(() => {
    const screenResized = () =>
      setViewport(window.innerWidth <= 1699 ? "small" : "wide");
    screenResized();
    window.addEventListener("resize", screenResized, true);
    return () => {
      window.removeEventListener("resize", screenResized, true);
    };
  }, [viewport]);

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
    <>
      {props.data.length === 0 ? (
        <EmptyTablePlaceholder />
      ) : (
        <>
          {viewport === "wide" && (
            <table>
              <thead>
                <tr>
                  {props.cols.schema.map((col) => (
                    <th>{col.display}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.data.map((row) => {
                  return (
                    <tr>
                      {props.cols.schema.map((col: TableProperty) => (
                        <td onClick={() => handleRowClick(row)}>
                          {getObjPropVal(col.objProp, row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {viewport === "small" && (
            <>
              {props.data.map((row) => {
                return (
                  <table
                    className={styles["table-rwd"]}
                    onClick={() => handleRowClick(row)}
                  >
                    <tbody>
                      {props.cols.schema.map((heading, idx) => {
                        return (
                          <tr>
                            <td className={styles["table-rwd-heading"]}>
                              {heading.display}
                            </td>
                            <td>
                              {getObjPropVal(
                                props.cols.schema[idx].objProp,
                                row,
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })}
            </>
          )}
        </>
      )}
    </>
  );
}

export default CustomTable;
