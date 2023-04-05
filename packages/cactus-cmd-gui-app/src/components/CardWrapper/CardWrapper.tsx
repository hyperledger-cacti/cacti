import { createSignal, createEffect, ParentComponent } from "solid-js";
import Button from "../UI/Button/Button";
// @ts-expect-error
import styles from "./CardWrapper.module.css";
import { TbCactus } from "solid-icons/tb";
import { useNavigate } from "@solidjs/router";
import Search from "../UI/Search/Search";
import CustomTable from "../UI/CustomTable/CustomTable";
import { TableProps } from "../../schema/supabase-types";
import Pagination from "../Pagination/Pagination";

type cardWrapperProp = {
  filters?: string[];
  data: any[];
  display: string;
  trimmed?: boolean;
  columns?: TableProps;
  title: string;
  getSearchValue?: (val: string) => {};
};

const pageSize: number = 2;

const CardWrapper: ParentComponent<cardWrapperProp> = (props) => {
  const navigate = useNavigate();
  const [searchKey, setSearchKey] = createSignal("");
  const [filteredData, setFilteredData] = createSignal<any[]>([]);
  const [paginatedData, setPaginatedData] = createSignal<any[]>([]);
  const [currentPage, setCurrentPage] = createSignal<number>(1);
  const [totalPages, setTotalPages] = createSignal<number>(1);

  const handleGoToPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages()) return;
    setCurrentPage(pageNumber);
  };

  const handleNextPage = () => {
    if (currentPage() === totalPages()) return;
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage() === 1) return;
    setCurrentPage((prev) => prev - 1);
  };

  const filterData = () => {
    const { filters, data } = props;
    if (searchKey().length === 0) {
      setFilteredData(data);
      return;
    }
    let newData = data.filter((row) => {
      let isMatch: boolean = false;
      filters?.forEach((property) => {
        if (row[property].toString().toLowerCase().includes(searchKey())) {
          isMatch = true;
        }
      });
      return isMatch;
    });
    setFilteredData(newData);
  };

  const handleSearch = () => {
    filterData();
    if (props.getSearchValue) {
      props.getSearchValue(searchKey());
    }
  };

  createEffect(() => {
    setFilteredData(props.data);
  });

  createEffect(() => {
    if (filteredData().length <= pageSize) {
      setPaginatedData(filteredData());
    } else {
      const firstEl = currentPage() * pageSize - pageSize;
      setPaginatedData(filteredData().slice(firstEl, firstEl + pageSize));
    }
  });

  createEffect(() => {
    const pageNum = Math.ceil(filteredData().length / pageSize);
    setTotalPages(pageNum);
  });

  return (
    <section
      class={styles["wrapper"]}
      style={{ width: `${props.display === "small" ? "50%" : "100%"}` }}
    >
      <header class={styles["wrapper-header"]}>
        <span class={styles["wrapper-title"]}>
          <TbCactus /> {props.title}
        </span>
        {props.filters && (
          <div class={styles["wrapper-search"]}>
            <Search
              onKeyUp={(e) => setSearchKey(e)}
              type="text"
              placeholder="Type to search"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
        )}
      </header>
      <div class={styles["wrapper-cards"]}>
        {props?.columns && props.data?.length > 0 && (
          <CustomTable cols={props.columns} data={paginatedData()} />
        )}
        {props.children}
      </div>
      <div class={styles["wrapper-btns"]}>
        {" "}
        {props.trimmed && (
          <Button
            type={"primary"}
            onClick={() => navigate(`/${props.title.toLowerCase()}`)}
          >
            View all
          </Button>
        )}
      </div>
      {!props.trimmed && (
        <Pagination
          current={currentPage()}
          total={totalPages()}
          goToPage={handleGoToPage}
          goNextPage={handleNextPage}
          goPrevPage={handlePrevPage}
        />
      )}
    </section>
  );
};

export default CardWrapper;
