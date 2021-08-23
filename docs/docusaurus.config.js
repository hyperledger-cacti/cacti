/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
  title: 'Weaver: DLT Interoperability Framework',
  tagline: 'Documentation',
  url: 'https://hyperledger-labs.github.io',
  baseUrl: '/weaver-dlt-interoperability/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'shared/favicon.ico',
  organizationName: 'hyperledger-labs',
  projectName: 'hyperledger-labs.github.io',
  themeConfig: {
    prism: {
        additionalLanguages: ['java', 'kotlin', 'groovy'],
    },
    navbar: {
      title: 'Weaver',
      logo: {
        alt: 'Weaver',
        src: 'shared/logo.svg',
      },
      items: [
        {
          to: 'docs/external/introduction',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          to: 'blog',
          label: 'Blog',
          position: 'left'
        },
        {
          href: 'https://github.com/hyperledger-labs/weaver-dlt-interoperability',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [        
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Weaver Framework.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/hyperledger-labs/weaver-dlt-interoperability/edit/master/',
        },        
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
