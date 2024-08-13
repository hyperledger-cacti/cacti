import { useOutletContext } from "react-router-dom";

type TutorialOptionsType = {
  name: string;
};

export function useAppOptions() {
  return useOutletContext<TutorialOptionsType>();
}
