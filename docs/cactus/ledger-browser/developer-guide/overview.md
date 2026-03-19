# Developer Guide Overview

Ledger Browser is designed with extensibility and customization in mind. You can enhance the GUI functionality by developing custom apps that users can configure and use.

## Limitations

Currently, applications must be included in the ledger-browser source code and built together with the main application. As the number of apps grows, we may consider transitioning to a more modular (though also more complex) design, allowing apps to be developed in separate packages.

## Guidelines

- Use React functional components.
- Use TypeScript and adhere to the [global Cacti linter requirements](https://github.com/hyperledger-cacti/cacti/blob/main/.eslintrc.js).
- Whenever possible, utilize [MaterialUI](https://mui.com/) and [common UI components](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-ledger-browser/src/main/typescript/components/ui).
- Use [PageTitle](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-ledger-browser/src/main/typescript/components/ui/PageTitle.tsx) as main page title.
- Use [PageTitleWithGoBack](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-ledger-browser/src/main/typescript/components/ui/PageTitleWithGoBack.tsx) as subpage title (it has arrow attached for going back).
- Use [NotificationContext](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cacti-ledger-browser/src/main/typescript/common/context/NotificationContext.tsx) for displaying Pop-Up windows with notifications (info, success, error, etc..).
- App routes are defined using [react-router-dom](https://reactrouter.com/en/main).
- Use [react-query](https://tanstack.com/query/v3) for fetching data, `QueryClientProvider` is already available in the application.
