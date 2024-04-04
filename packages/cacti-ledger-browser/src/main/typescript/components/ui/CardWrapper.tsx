import Button from "./Button";
import Search from "./Search";

import CustomTable from "./CustomTable";

import Pagination from "./Pagination";
import EmptyTablePlaceholder from "./EmptyTablePlaceholder/EmptyTablePlaceholder";
import styles from "./CardWrapper.module.css";

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const pageSize: number = 6;

function CardWrapper(props: any) {
  const location = useLocation();
  const path = location.pathname.split("/");
  const navigate = useNavigate();
  const [searchKey, setSearchKey] = useState("");
  let filteredData = props.data;
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [viewport, setViewport] = useState("");

  const handleGoToPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const handleNextPage = () => {
    if (currentPage === totalPages) return;
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage === 1) return;
    setCurrentPage((prev) => prev - 1);
  };

  const filterData = () => {
    const { filters, data } = props;
    if (searchKey.length === 0) {
      filteredData = data;
      return;
    }
    const newData = data.filter((row: any) => {
      let isMatch: boolean = false;
      filters?.forEach((property: string | number) => {
        if (row[property]?.toString().toLowerCase().includes(searchKey)) {
          isMatch = true;
        }
      });
      return isMatch;
    });
    filteredData = newData;
  };

  const handleSearch = () => {
    filterData();
    if (props.getSearchValue) {
      props.getSearchValue(searchKey);
    }
  };

  useEffect(() => {
    const screenResized = () =>
      setViewport(window.innerWidth <= 1699 ? "small" : "wide");
    screenResized();
    window.addEventListener("resize", screenResized, true);
    return () => {
      window.removeEventListener("resize", screenResized, true);
    };
  }, []);

  useEffect(() => {
    if (filteredData.length <= pageSize) {
      setPaginatedData(filteredData);
    } else {
      const firstEl = currentPage * pageSize - pageSize;
      setPaginatedData(filteredData.slice(firstEl, firstEl + pageSize));
    }
  }, [currentPage, filteredData]);

  useEffect(() => {
    const pageNum = Math.ceil(filteredData.length / pageSize);
    setTotalPages(pageNum);
  }, [filteredData]);

  return (
    <section
      className={`${styles["wrapper"]} ${
        props.display === "small"
          ? styles["wrapper-half-width"]
          : styles["wrapper-full-width"]
      }`}
    >
      <header className={styles["wrapper-header"]}>
        <span className={styles["wrapper-title"]}>{props.title}</span>
        {props.trimmed && viewport === "small" && (
          <Button
            type={"primary"}
            onClick={() => navigate(`/${path[1]}/${props.title.toLowerCase()}`)}
          >
            View all
          </Button>
        )}
        {props.filters && (
          <div className={styles["wrapper-search"]}>
            <Search
              onKeyUp={(e: any) => setSearchKey(e)}
              type="text"
              placeholder="Type to search"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
        )}
      </header>
      <div className={styles["wrapper-cards"]}>
        {props?.columns && props.data?.length > 0 && (
          <CustomTable cols={props.columns} data={paginatedData} />
        )}
        {props?.data?.length === 0 && <EmptyTablePlaceholder />}
      </div>
      <div className={styles["wrapper-btns"]}>
        {" "}
        {props.trimmed && viewport === "wide" && (
          <Button
            type={"primary"}
            onClick={() => navigate(`/${path[1]}/${props.title.toLowerCase()}`)}
          >
            View all
          </Button>
        )}
      </div>

      {!props.trimmed && (
        <Pagination
          current={currentPage}
          total={totalPages}
          goToPage={handleGoToPage}
          goNextPage={handleNextPage}
          goPrevPage={handlePrevPage}
        />
      )}
    </section>
  );
}

export default CardWrapper;
