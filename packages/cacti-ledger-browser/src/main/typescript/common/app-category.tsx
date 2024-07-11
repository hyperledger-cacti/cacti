import WebIcon from "@mui/icons-material/Web";
import DnsIcon from "@mui/icons-material/Dns";
import TokenIcon from "@mui/icons-material/Token";

export enum AppCategory {
  LedgerBrowser = "ledgerBrowser",
  Connector = "connector",
  SampleApp = "sampleApp",
}

export function getAppCategoryConfig(appConfig: AppCategory) {
  switch (appConfig) {
    case AppCategory.LedgerBrowser:
      return {
        name: "Ledger Browser",
        description: "Browse and analyse ledger data persisted in a database",
        icon: <WebIcon />,
      };
    case AppCategory.Connector:
      return {
        name: "Connector",
        description: "Interact with ledgers through Cacti connectors",
        icon: <DnsIcon />,
      };
    case AppCategory.SampleApp:
      return {
        name: "Sample App",
        description: "Run sample Cacti application",
        icon: <TokenIcon />,
      };
    default:
      throw new Error(`Unknown App Category provided: ${appConfig}`);
  }
}
