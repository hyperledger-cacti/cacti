import EmptyTablePlaceholder from "./EmptyTablePlaceholder/EmptyTablePlaceholder";
import styles from "./CustomTable.module.css";
import {
  useState,
  useEffect,
  ReactElement,
  JSXElementConstructor,
  ReactNode,
  ReactPortal,
} from "react";
import { TableProperty } from "../../common/supabase-types";

function CustomTable(props: any) {
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

  const getObjPropVal = (objProp: any[], row: any) => {
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
            <table className={styles["custom-table"]}>
              <thead>
                <tr>
                  {props.cols.schema.map((col: any) => (
                    <th>{col.display}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.data.map((row: any) => {
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
              {props.data.map((row: any) => {
                return (
                  <table
                    className={`${styles["custom-table"]} ${styles["table-rwd"]}`}
                    onClick={() => handleRowClick(row)}
                  >
                    <tbody>
                      {props.cols.schema.map(
                        (
                          heading: {
                            display:
                              | string
                              | number
                              | boolean
                              | ReactElement<
                                  any,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | ReactPortal
                              | null
                              | undefined;
                          },
                          idx: string | number,
                        ) => {
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
                        },
                      )}
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
