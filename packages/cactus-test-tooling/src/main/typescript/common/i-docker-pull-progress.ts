export interface IDockerPullProgressDetail {
  readonly current: number;
  readonly total: number;
}

export interface IDockerPullProgress {
  readonly status: "Downloading";
  readonly progressDetail: IDockerPullProgressDetail;
  readonly progress: string;
  readonly id: string;
}
